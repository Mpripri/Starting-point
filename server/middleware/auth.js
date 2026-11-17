const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../config');

const COOKIE = 'sp_token';

function requireAuth(req, res, next) {
  try {
    req.admin = jwt.verify(req.cookies[COOKIE], jwtSecret);
    next();
  } catch {
    res.status(401).json({ error: 'Sessão expirada. Entre novamente.' });
  }
}

/**
 * Proteção extra contra CSRF: exige um cabeçalho personalizado nas
 * requisições que alteram dados (formulários de outros sites não conseguem enviá-lo).
 * O cookie também usa SameSite=Strict.
 */
function requireFetchHeader(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  if (req.get('X-Requested-With') !== 'starting-point') {
    return res.status(403).json({ error: 'Requisição não permitida.' });
  }
  next();
}

module.exports = { requireAuth, requireFetchHeader, COOKIE };
