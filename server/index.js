const path = require('path');
const express = require('express');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const multer = require('multer');
const cfg = require('./config');
const { pool } = require('./db');
const { UPLOAD_DIR } = require('./services/storage');
const authRoutes = require('./routes/auth');
const { publicRouter, adminRouter } = require('./routes/photos');

if (cfg.jwtSecret.length < 32) {
  console.error('JWT_SECRET ausente ou curto demais (mínimo 32 caracteres). Veja o .env.example.');
  process.exit(1);
}

const app = express();
if (cfg.isProd) app.set('trust proxy', 1);

app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        'default-src': ["'self'"],
        'script-src': ["'self'"],
        'style-src': ["'self'", 'https://fonts.googleapis.com'],
        'font-src': ['https://fonts.gstatic.com'],
        'img-src': ["'self'", 'data:', 'blob:', 'https://res.cloudinary.com'],
        'frame-ancestors': ["'none'"],
        'upgrade-insecure-requests': cfg.isProd ? [] : null,
      },
    },
  })
);
app.use(express.json({ limit: '50kb' }));
app.use(cookieParser());

/* API */
app.get('/api/config', (req, res) => {
  const { whatsapp, instagram } = cfg.contact;
  res.json({
    whatsapp: whatsapp ? `https://wa.me/${whatsapp}` : null,
    instagram: instagram ? `https://instagram.com/${encodeURIComponent(instagram)}` : null,
  });
});
app.use('/api/auth', authRoutes);
app.use('/api/photos', publicRouter);
app.use('/api/admin', adminRouter);
app.use('/api', (req, res) => res.status(404).json({ error: 'Rota não encontrada.' }));

/* Arquivos estáticos (/memorias → memorias.html, /admin → admin.html) */
app.use('/uploads', express.static(UPLOAD_DIR, { index: false, maxAge: '7d' }));
app.use(express.static(path.join(__dirname, '..', 'public'), { extensions: ['html'] }));
app.use((req, res) =>
  res.status(404).sendFile(path.join(__dirname, '..', 'public', '404.html'), (err) => {
    if (err && !res.headersSent) res.status(404).type('text').send('Página não encontrada.');
  })
);

/* Erros */
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    const msg = err.code === 'LIMIT_FILE_SIZE' ? 'A imagem passa de 4 MB.' : 'Erro ao receber o arquivo.';
    return res.status(400).json({ error: msg });
  }
  if (err.status && err.status < 500) return res.status(err.status).json({ error: err.message });
  console.error(err);
  res.status(500).json({ error: 'Algo deu errado. Tente novamente em instantes.' });
});

// Na Vercel, o app é exportado e a plataforma cuida da porta.
if (!process.env.VERCEL) {
  const server = app.listen(cfg.port, async () => {
    console.log(`Starting Point rodando em http://localhost:${cfg.port}`);
    try {
      await pool.query('SELECT 1');
      console.log('Banco de dados conectado.');
    } catch (err) {
      console.error('Não foi possível conectar ao banco:', err.message);
    }
  });
  process.on('SIGTERM', () => server.close(() => pool.end()));
}

module.exports = app;
