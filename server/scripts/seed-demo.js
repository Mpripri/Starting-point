// Insere 6 fotografias PROVISÓRIAS (claramente marcadas como exemplo) para você ver o layout.
// Exclua-as pelo painel /admin quando começar a cadastrar as fotos reais.  Uso: npm run seed:demo
const { pool } = require('../db');

const demo = [
  [1, '[Exemplo] Foto provisória', '2000-01-01', 1],
  [1, '[Exemplo] Outro título curto', '2000-01-02', 2],
  [2, '[Exemplo] Foto provisória', '2000-01-03', 3],
  [2, '[Exemplo] Título de exemplo', '2000-01-04', 1],
  [3, '[Exemplo] Foto provisória', '2000-01-05', 2],
  [3, '[Exemplo] Outro título curto', '2000-01-06', 3],
];
const text = 'Esta é uma fotografia de exemplo, só para mostrar o layout. Substitua-a por uma lembrança real pelo painel administrativo.';

(async () => {
  const [exists] = await pool.query("SELECT COUNT(*) AS n FROM photos WHERE title LIKE '[Exemplo]%'");
  if (exists[0].n > 0) { console.log('Exemplos já existem.'); return pool.end(); }
  for (const [year, title, date, img] of demo) {
    await pool.execute(
      "INSERT INTO photos (school_year, title, taken_at, description, image_url, image_key, storage) VALUES (?,?,?,?,?,NULL,'local')",
      [year, title, date, text, `/img/exemplo-${img}.svg`]
    );
  }
  console.log('Exemplos inseridos.');
  await pool.end();
})().catch((e) => { console.error(e.message); process.exit(1); });
