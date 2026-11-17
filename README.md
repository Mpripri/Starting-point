# Starting Point – álbum de memórias da turma

Site completo com front-end, back-end, banco de dados, armazenamento de imagens e área administrativa.

## Tecnologias

| Parte | Escolha | Por quê |
|---|---|---|
| Front-end | HTML5, CSS3 e JavaScript puro | Leve, sem etapa de build, fácil de editar |
| Back-end | Node.js 18+ e Express | Simples e muito usado; serve o site e a API |
| Banco de dados | MySQL 8+ (ou MariaDB 10.5+) | Persistente; acesso com `mysql2` e consultas parametrizadas |
| Imagens | Cloudinary (plano gratuito basta) | Armazenamento persistente em nuvem; otimiza e redimensiona |
| Segurança | bcrypt, JWT em cookie HttpOnly/SameSite=Strict, Helmet (CSP), limite de tentativas de login | Senha nunca fica em texto puro nem no navegador |

## Estrutura

```
database/schema.sql        tabelas photos e admins
server/index.js            servidor Express
server/routes/             auth.js (login) e photos.js (API pública + admin)
server/services/storage.js envio/remoção de imagens (Cloudinary ou local)
server/scripts/            setup-db.js e seed-demo.js
public/                    site (index, memorias, sobre, contato, admin) + css/js/img
```

## Como executar

1. Instale o Node.js 18+ e tenha um MySQL rodando.
2. `npm install`
3. Copie `.env.example` para `.env` e preencha:
   - `JWT_SECRET` (gere com `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`);
   - dados do MySQL (`DB_*`);
   - `CLOUDINARY_*` (crie uma conta grátis em cloudinary.com e copie Cloud name, API Key e API Secret);
   - `ADMIN_EMAIL` e `ADMIN_PASSWORD` (mínimo 10 caracteres).
4. `npm run setup` cria o banco, as tabelas e o administrador. Depois, **apague `ADMIN_PASSWORD` do `.env`**.
   (Para trocar a senha depois, preencha de novo e rode `npm run setup`.)
5. `npm start` e abra http://localhost:3000. O painel fica em http://localhost:3000/admin.

Opcional: `npm run seed:demo` insere 6 fotos provisórias, marcadas como **[Exemplo]**, só para ver o layout. Exclua-as pelo painel.

Para testar sem Cloudinary no seu computador, use `STORAGE_DRIVER=local` (as imagens vão para a pasta `uploads/`). Em hospedagens que apagam arquivos a cada deploy, use sempre Cloudinary.

## Preenchendo os conteúdos depois

- **Fotos:** pelo painel `/admin` (ano, título, data, descrição). Aparecem na galeria na hora.
- **Contato:** no `.env`, `CONTACT_WHATSAPP` (ex.: `5513999999999`) e `CONTACT_INSTAGRAM` (sem @). Reinicie o servidor. Enquanto vazios, a página mostra "Em breve".
- **Texto da página Sobre:** edite `public/sobre.html` (os pontos de edição estão marcados com comentários).

## Publicação

Defina `NODE_ENV=production` (cookie passa a exigir HTTPS) e use HTTPS na hospedagem. Funciona em qualquer serviço que rode Node.js e ofereça MySQL (Railway, Render + banco externo, VPS etc.).

## Publicar na Vercel (resumo)

O projeto já vem preparado (`index.js` na raiz e `vercel.json`). Na Vercel é obrigatório usar **banco MySQL na nuvem** (com `DB_SSL=true`) e **`STORAGE_DRIVER=cloudinary`**. Cadastre as variáveis do `.env.example` em Settings → Environment Variables, exceto `ADMIN_PASSWORD`. Crie as tabelas rodando `npm run setup` no seu computador apontando para o banco da nuvem.
