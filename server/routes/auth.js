const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const { pool } = require('../db');
const { jwtSecret, isProd } = require('../config');
const { requireAuth, requireFetchHeader, COOKIE } = require('../middleware/auth');

const router = express.Router();
const EIGHT_HOURS = 8 * 60 * 60 * 1000;
// hash falso para gastar o mesmo tempo quando o e-mail não existe
const DUMMY_HASH = bcrypt.hashSync('nao-existe', 12);

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas tentativas. Aguarde 15 minutos e tente de novo.' },
});

router.post('/login', requireFetchHeader, loginLimiter, async (req, res, next) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    const [rows] = await pool.execute('SELECT id, email, password_hash FROM admins WHERE email = ?', [email]);
    const admin = rows[0];
    const ok = await bcrypt.compare(password, admin ? admin.password_hash : DUMMY_HASH);
    if (!admin || !ok) return res.status(401).json({ error: 'E-mail ou senha incorretos.' });

    const token = jwt.sign({ sub: admin.id, email: admin.email }, jwtSecret, { expiresIn: '8h' });
    res.cookie(COOKIE, token, {
      httpOnly: true,
      sameSite: 'strict',
      secure: isProd,
      maxAge: EIGHT_HOURS,
      path: '/',
    });
    res.json({ email: admin.email });
  } catch (err) { next(err); }
});

router.post('/logout', requireFetchHeader, (req, res) => {
  res.clearCookie(COOKIE, { path: '/' });
  res.json({ ok: true });
});

router.get('/me', requireAuth, (req, res) => res.json({ email: req.admin.email }));

module.exports = router;
