// Cria o banco, as tabelas e (opcionalmente) o administrador.  Uso: npm run setup
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const { db } = require('../config');
const { base } = require('../db');

(async () => {
  const conn = await mysql.createConnection({ ...base, multipleStatements: true });
  try {
    try {
      await conn.query(`CREATE DATABASE IF NOT EXISTS \`${db.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    } catch (err) {
      console.warn('Não foi possível criar o banco (talvez já exista ou falte permissão):', err.message);
    }
    await conn.query(`USE \`${db.database}\``);
    await conn.query(fs.readFileSync(path.join(__dirname, '..', '..', 'database', 'schema.sql'), 'utf8'));
    console.log('Tabelas prontas.');

    const email = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
    const password = process.env.ADMIN_PASSWORD || '';
    if (email && password) {
      if (password.length < 10) throw new Error('ADMIN_PASSWORD precisa ter pelo menos 10 caracteres.');
      const hash = await bcrypt.hash(password, 12);
      await conn.execute(
        'INSERT INTO admins (email, password_hash) VALUES (?, ?) ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash)',
        [email, hash]
      );
      console.log(`Administrador pronto: ${email}`);
      console.log('Agora apague ADMIN_PASSWORD do arquivo .env.');
    } else {
      console.log('ADMIN_EMAIL/ADMIN_PASSWORD não definidos: nenhum administrador criado.');
    }
  } finally {
    await conn.end();
  }
})().catch((err) => { console.error('Falha no setup:', err.message); process.exit(1); });
