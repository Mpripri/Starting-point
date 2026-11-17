const express = require('express');
const multer = require('multer');
const { pool } = require('../db');
const storage = require('../services/storage');
const cfg = require('../config');
const { requireAuth, requireFetchHeader } = require('../middleware/auth');

const publicRouter = express.Router();
const adminRouter = express.Router();

const COLUMNS = 'id, school_year, title, taken_at, description, image_url';

async function listPhotos(year) {
  const params = [];
  let where = '';
  if (year) { where = 'WHERE school_year = ?'; params.push(year); }
  const [rows] = await pool.execute(
    `SELECT ${COLUMNS} FROM photos ${where} ORDER BY school_year, taken_at, id`, params
  );
  return rows;
}

/* ---------- Público (somente leitura) ---------- */
publicRouter.get('/', async (req, res, next) => {
  try {
    const year = [1, 2, 3].includes(Number(req.query.year)) ? Number(req.query.year) : null;
    res.json(await listPhotos(year));
  } catch (err) { next(err); }
});

/* ---------- Administrador ---------- */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: cfg.storage.maxBytes, files: 1 },
});

function validate(body) {
  const year = Number(body.school_year);
  const title = String(body.title || '').trim();
  const taken = String(body.taken_at || '').trim();
  const description = String(body.description || '').trim();
  const errors = [];

  if (![1, 2, 3].includes(year)) errors.push('Escolha o ano escolar.');
  if (!title || title.length > 120) errors.push('O título é obrigatório (até 120 caracteres).');
  const d = new Date(`${taken}T00:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(taken) || Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== taken) {
    errors.push('Informe uma data válida.');
  }
  if (description.length > 1000) errors.push('A descrição pode ter até 1000 caracteres.');

  return { errors, data: { year, title, taken, description: description || null } };
}

adminRouter.use(requireFetchHeader, requireAuth);

adminRouter.get('/photos', async (req, res, next) => {
  try { res.json(await listPhotos(null)); } catch (err) { next(err); }
});

adminRouter.post('/photos', upload.single('image'), async (req, res, next) => {
  let saved = null;
  try {
    const { errors, data } = validate(req.body);
    if (!req.file) errors.push('Selecione uma imagem.');
    if (errors.length) return res.status(400).json({ error: errors.join(' ') });

    saved = await storage.save(req.file.buffer);
    const [result] = await pool.execute(
      `INSERT INTO photos (school_year, title, taken_at, description, image_url, image_key, storage)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [data.year, data.title, data.taken, data.description, saved.url, saved.key, saved.driver]
    );
    const [rows] = await pool.execute(`SELECT ${COLUMNS} FROM photos WHERE id = ?`, [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (err) {
    if (saved) await storage.remove(saved); // evita imagem órfã se o banco falhar
    next(err);
  }
});

adminRouter.put('/photos/:id', upload.single('image'), async (req, res, next) => {
  let saved = null;
  try {
    const id = Number(req.params.id);
    const [found] = await pool.execute('SELECT image_key, storage FROM photos WHERE id = ?', [id]);
    if (!found[0]) return res.status(404).json({ error: 'Fotografia não encontrada.' });

    const { errors, data } = validate(req.body);
    if (errors.length) return res.status(400).json({ error: errors.join(' ') });

    if (req.file) {
      saved = await storage.save(req.file.buffer);
      await pool.execute(
        `UPDATE photos SET school_year=?, title=?, taken_at=?, description=?, image_url=?, image_key=?, storage=? WHERE id=?`,
        [data.year, data.title, data.taken, data.description, saved.url, saved.key, saved.driver, id]
      );
      await storage.remove({ key: found[0].image_key, driver: found[0].storage });
    } else {
      await pool.execute(
        'UPDATE photos SET school_year=?, title=?, taken_at=?, description=? WHERE id=?',
        [data.year, data.title, data.taken, data.description, id]
      );
    }
    const [rows] = await pool.execute(`SELECT ${COLUMNS} FROM photos WHERE id = ?`, [id]);
    res.json(rows[0]);
  } catch (err) {
    if (saved) await storage.remove(saved);
    next(err);
  }
});

adminRouter.delete('/photos/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const [found] = await pool.execute('SELECT image_key, storage FROM photos WHERE id = ?', [id]);
    if (!found[0]) return res.status(404).json({ error: 'Fotografia não encontrada.' });
    await pool.execute('DELETE FROM photos WHERE id = ?', [id]);
    await storage.remove({ key: found[0].image_key, driver: found[0].storage });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

module.exports = { publicRouter, adminRouter };
