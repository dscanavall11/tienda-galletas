const crypto = require('crypto');
const { promisify } = require('util');
const prisma = require('./prismaClient');

// Dos sesiones independientes: una cookie para la tienda (clientes) y otra
// para el panel (administradores). Ambas son HttpOnly, así que el JavaScript
// de la página no puede leer el token (mitiga el robo por XSS).
const COOKIE_CLIENTE = 'sesion_cliente';
const COOKIE_ADMIN = 'sesion_admin';

const DURACION_CLIENTE = 60 * 60 * 24 * 7; // 7 días
const DURACION_ADMIN = 60 * 60 * 8; // 8 horas

// Firma de los tokens. En una demo local hay un valor por defecto; en un
// despliegue real se define SESSION_SECRET en backend/.env.
const SECRETO = process.env.SESSION_SECRET || 'demo-tienda-galletas-sesion-local';

const scrypt = promisify(crypto.scrypt);

// scrypt viene incluido en Node: no hace falta bcrypt ni otra dependencia.
// Formato guardado: scrypt$<sal en hex>$<hash en hex>.
async function hashPassword(password) {
  const sal = crypto.randomBytes(16);
  const hash = await scrypt(password, sal, 64);
  return `scrypt$${sal.toString('hex')}$${hash.toString('hex')}`;
}

async function verifyPassword(password, almacenado) {
  if (typeof almacenado !== 'string') return false;
  const [algoritmo, salHex, hashHex] = almacenado.split('$');
  if (algoritmo !== 'scrypt' || !salHex || !hashHex) return false;

  const esperado = Buffer.from(hashHex, 'hex');
  const calculado = await scrypt(password, Buffer.from(salHex, 'hex'), esperado.length);
  return esperado.length === calculado.length && crypto.timingSafeEqual(esperado, calculado);
}

function ahora() {
  return Math.floor(Date.now() / 1000);
}

// Token firmado (HMAC-SHA256) con el formato cuerpo.firma, ambos base64url.
// Es "sin estado": no hay tabla de sesiones; el servidor valida la firma y la
// expiración en cada petición.
function firmarToken(payload) {
  const cuerpo = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const firma = crypto.createHmac('sha256', SECRETO).update(cuerpo).digest('base64url');
  return `${cuerpo}.${firma}`;
}

function verificarToken(token) {
  if (typeof token !== 'string') return null;
  const [cuerpo, firma] = token.split('.');
  if (!cuerpo || !firma) return null;

  const esperada = crypto.createHmac('sha256', SECRETO).update(cuerpo).digest();
  const recibida = Buffer.from(firma, 'base64url');
  if (esperada.length !== recibida.length || !crypto.timingSafeEqual(esperada, recibida)) return null;

  try {
    const payload = JSON.parse(Buffer.from(cuerpo, 'base64url').toString('utf8'));
    if (!payload.exp || payload.exp < ahora()) return null;
    return payload;
  } catch {
    return null;
  }
}

function tokenCliente(cuentaId, clienteId) {
  return firmarToken({
    sub: cuentaId,
    clienteId,
    rol: 'cliente',
    exp: ahora() + DURACION_CLIENTE,
  });
}

function tokenAdmin(adminId) {
  return firmarToken({ sub: adminId, rol: 'admin', exp: ahora() + DURACION_ADMIN });
}

function leerCookie(req, nombre) {
  const cabecera = req.headers.cookie;
  if (!cabecera) return null;
  for (const parte of cabecera.split(';')) {
    const separador = parte.indexOf('=');
    if (separador === -1) continue;
    if (parte.slice(0, separador).trim() === nombre) {
      return decodeURIComponent(parte.slice(separador + 1).trim());
    }
  }
  return null;
}

function opcionesCookie(maxAgeSegundos) {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: maxAgeSegundos * 1000,
  };
}

function ponerCookie(res, nombre, valor, maxAgeSegundos) {
  res.cookie(nombre, valor, opcionesCookie(maxAgeSegundos));
}

function borrarCookie(res, nombre) {
  res.clearCookie(nombre, { ...opcionesCookie(0), maxAge: undefined });
}

function clientePublico(cliente) {
  return {
    id: cliente.id,
    nombre: cliente.nombre,
    email: cliente.email,
    telefono: cliente.telefono,
    direccion: cliente.direccion,
    documento: cliente.documento,
  };
}

function adminPublico(admin) {
  return { id: admin.id, usuario: admin.usuario, nombre: admin.nombre };
}

async function buscarCuentaDeSesion(req) {
  const payload = verificarToken(leerCookie(req, COOKIE_CLIENTE));
  if (!payload || payload.rol !== 'cliente') return null;
  return prisma.cuenta.findUnique({
    where: { id: payload.sub },
    include: { cliente: true },
  });
}

// Para rutas públicas que se comportan distinto si hay sesión (por ejemplo,
// el checkout: con cuenta se usa el cliente de la sesión).
async function clienteOpcional(req, res, next) {
  try {
    const cuenta = await buscarCuentaDeSesion(req);
    if (cuenta) {
      req.cuenta = cuenta;
      req.cliente = cuenta.cliente;
    }
  } catch (e) {
    console.error('No se pudo resolver la sesión del cliente:', e);
  }
  next();
}

async function requiereCliente(req, res, next) {
  try {
    const cuenta = await buscarCuentaDeSesion(req);
    if (!cuenta) return res.status(401).json({ error: 'Inicia sesión para continuar' });
    req.cuenta = cuenta;
    req.cliente = cuenta.cliente;
    next();
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

// Igual que clienteOpcional, pero para la cookie del panel. Se usa en
// GET /api/admin/auth/me para responder { admin: null } sin un 401 ruidoso.
async function adminOpcional(req, res, next) {
  try {
    const payload = verificarToken(leerCookie(req, COOKIE_ADMIN));
    if (payload?.rol === 'admin') {
      const admin = await prisma.administrador.findUnique({ where: { id: payload.sub } });
      if (admin) req.admin = admin;
    }
  } catch (e) {
    console.error('No se pudo resolver la sesión del administrador:', e);
  }
  next();
}

async function requiereAdmin(req, res, next) {
  try {
    const payload = verificarToken(leerCookie(req, COOKIE_ADMIN));
    if (!payload || payload.rol !== 'admin') {
      return res.status(401).json({ error: 'Se requiere sesión de administrador' });
    }

    const admin = await prisma.administrador.findUnique({ where: { id: payload.sub } });
    if (!admin) return res.status(401).json({ error: 'Se requiere sesión de administrador' });

    req.admin = admin;
    next();
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

module.exports = {
  COOKIE_CLIENTE,
  COOKIE_ADMIN,
  DURACION_CLIENTE,
  DURACION_ADMIN,
  hashPassword,
  verifyPassword,
  tokenCliente,
  tokenAdmin,
  ponerCookie,
  borrarCookie,
  clientePublico,
  adminPublico,
  clienteOpcional,
  adminOpcional,
  requiereCliente,
  requiereAdmin,
};
