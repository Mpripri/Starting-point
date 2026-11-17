const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const { storage } = require('../config');

const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads');
let cloudinary = null;

if (storage.driver === 'cloudinary') {
  cloudinary = require('cloudinary').v2;
  cloudinary.config({ ...storage.cloudinary, secure: true });
}

/** Confere o conteúdo real do arquivo (não confia só no tipo enviado). */
function detectExtension(buf) {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpg';
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
  if (buf.subarray(0, 4).toString() === 'RIFF' && buf.subarray(8, 12).toString() === 'WEBP') return 'webp';
  return null;
}

function assertConfigured() {
  if (storage.driver === 'cloudinary') {
    const c = storage.cloudinary;
    if (!c.cloud_name || !c.api_key || !c.api_secret) {
      throw new Error('Cloudinary não configurado. Preencha as variáveis CLOUDINARY_* no .env.');
    }
  } else if (storage.driver !== 'local') {
    throw new Error('STORAGE_DRIVER inválido. Use "cloudinary" ou "local".');
  }
}

/** Salva a imagem e devolve { url, key, driver }. */
async function save(buffer) {
  const ext = detectExtension(buffer);
  if (!ext) {
    const err = new Error('Formato de imagem não aceito. Envie JPG, PNG ou WebP.');
    err.status = 400;
    throw err;
  }
  assertConfigured();

  if (storage.driver === 'local') {
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
    const name = `${crypto.randomBytes(16).toString('hex')}.${ext}`;
    await fs.writeFile(path.join(UPLOAD_DIR, name), buffer);
    return { url: `/uploads/${name}`, key: name, driver: 'local' };
  }

  const result = await new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: 'starting-point',
        resource_type: 'image',
        transformation: [{ width: 2000, height: 2000, crop: 'limit', quality: 'auto' }],
      },
      (err, res) => (err ? reject(err) : resolve(res))
    );
    stream.end(buffer);
  });
  return { url: result.secure_url, key: result.public_id, driver: 'cloudinary' };
}

/** Remove a imagem do serviço. Imagens de exemplo (sem key) são ignoradas. */
async function remove({ key, driver }) {
  if (!key) return;
  try {
    if (driver === 'local') {
      await fs.unlink(path.join(UPLOAD_DIR, path.basename(key)));
    } else if (driver === 'cloudinary' && cloudinary) {
      await cloudinary.uploader.destroy(key);
    }
  } catch (err) {
    console.warn('Não foi possível remover a imagem antiga:', err.message);
  }
}

module.exports = { save, remove, UPLOAD_DIR };
