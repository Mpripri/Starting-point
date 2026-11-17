require('dotenv').config();
const e = process.env;

module.exports = {
  port: Number(e.PORT) || 3000,
  isProd: e.NODE_ENV === 'production' || Boolean(e.VERCEL),
  jwtSecret: e.JWT_SECRET || '',
  db: {
    host: e.DB_HOST || 'localhost',
    port: Number(e.DB_PORT) || 3306,
    user: e.DB_USER || 'root',
    password: e.DB_PASSWORD || '',
    database: e.DB_NAME || 'starting_point',
    ssl: e.DB_SSL === 'true',
  },
  storage: {
    driver: (e.STORAGE_DRIVER || 'cloudinary').toLowerCase(),
    cloudinary: {
      cloud_name: e.CLOUDINARY_CLOUD_NAME,
      api_key: e.CLOUDINARY_API_KEY,
      api_secret: e.CLOUDINARY_API_SECRET,
    },
    maxBytes: 4 * 1024 * 1024, // a Vercel aceita ~4,5 MB por requisição; o painel reduz as fotos antes de enviar
  },
  contact: {
    whatsapp: (e.CONTACT_WHATSAPP || '').replace(/\D/g, ''),
    instagram: (e.CONTACT_INSTAGRAM || '').replace(/^@/, '').trim(),
  },
};
