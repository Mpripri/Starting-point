const mysql = require('mysql2/promise');
const { db } = require('./config');

const base = {
  host: db.host,
  port: db.port,
  user: db.user,
  password: db.password,
  charset: 'utf8mb4',
  ssl: db.ssl ? { minVersion: 'TLSv1.2', rejectUnauthorized: true } : undefined,
};

// dateStrings: devolve DATE como 'AAAA-MM-DD' (sem problemas de fuso horário)
const pool = mysql.createPool({
  ...base,
  database: db.database,
  waitForConnections: true,
  connectionLimit: process.env.VERCEL ? 3 : 10,
  dateStrings: true,
});

module.exports = { pool, base };
