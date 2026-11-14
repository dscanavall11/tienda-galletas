const express = require('express');
const prisma = require('../prismaClient');
const {
  COOKIE_CLIENTE,
  DURACION_CLIENTE,
  hashPassword,
  verifyPassword,
  tokenCliente,
  ponerCookie,
  borrarCookie,
  clientePublico,
  clienteOpcional,
  requiereCliente,
} = require('../auth');

const router = express.Router();

const LARGO_MINIMO_PASSWORD = 8;

function normalizarEmail(email) {
  return typeof email === 'string' ? email.trim().toLowerCase() : '';
}

function emailValido(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function datosPerfil(body) {
  // Solo los campos de perfil esperados: nunca se acepta `email` ni el hash
  // de la contraseña desde el cuerpo de la petición.
  return {
    nombre: typeof body?.nombre === 'string' ? body.nombre.trim() : undefined,
    telefono: typeof body?.telefono === 'string' ? body.telefono.trim() || null : undefined,
    direccion: typeof body?.direccion === 'string' ? body.direccion.trim() || null : undefined,
    documento: typeof body?.documento === 'string' ? body.documento.trim() || null : undefined,
  };
}

function responderError(res, e) {
  if (e?.codigo) return res.status(e.status).json({ error: e.message, codigo: e.codigo });
  if (e?.status) return res.status(e.status).json({ error: e.message });
  console.error(e);
  res.status(500).json({ error: 'Error interno del servidor' });
}

class ErrorAuth extends Error {
  constructor(status, message, codigo) {
    super(message);
    this.status = status;
    this.codigo = codigo;
  }
}

// Registro de cliente. Si el correo ya compró como invitado, la cuenta se
// vincula a ese cliente y hereda su historial (limitación conocida: no se
// verifica el correo, ver README).
router.post('/registro', async (req, res) => {
  try {
    const nombre = typeof req.body?.nombre === 'string' ? req.body.nombre.trim() : '';
    const email = normalizarEmail(req.body?.email);
    const password = typeof req.body?.password === 'string' ? req.body.password : '';

    if (!nombre) throw new ErrorAuth(400, 'el nombre es requerido');
    if (!emailValido(email)) throw new ErrorAuth(400, 'ingresa un correo válido');
    if (password.length < LARGO_MINIMO_PASSWORD) {
      throw new ErrorAuth(400, `la contraseña debe tener al menos ${LARGO_MINIMO_PASSWORD} caracteres`);
    }

    const existente = await prisma.cliente.findUnique({
      where: { email },
      include: { cuenta: true },
    });
    if (existente?.cuenta) {
      throw new ErrorAuth(409, 'ya existe una cuenta con ese correo', 'CUENTA_EXISTE');
    }

    const passwordHash = await hashPassword(password);
    const perfil = datosPerfil(req.body);

    const { cuenta, cliente } = await prisma.$transaction(async (tx) => {
      const clienteRow = await tx.cliente.upsert({
        where: { email },
        update: {
          nombre,
          telefono: perfil.telefono,
          direccion: perfil.direccion,
          documento: perfil.documento,
        },
        create: {
          nombre,
          email,
          telefono: perfil.telefono,
          direccion: perfil.direccion,
          documento: perfil.documento,
        },
      });

      const cuentaRow = await tx.cuenta.create({
        data: { clienteId: clienteRow.id, passwordHash },
      });

      return { cuenta: cuentaRow, cliente: clienteRow };
    });

    ponerCookie(res, COOKIE_CLIENTE, tokenCliente(cuenta.id, cliente.id), DURACION_CLIENTE);
    res.status(201).json({ cliente: clientePublico(cliente) });
  } catch (e) {
    if (e.code === 'P2002') {
      return res.status(409).json({ error: 'ya existe una cuenta con ese correo', codigo: 'CUENTA_EXISTE' });
    }
    responderError(res, e);
  }
});

router.post('/ingresar', async (req, res) => {
  try {
    const email = normalizarEmail(req.body?.email);
    const password = typeof req.body?.password === 'string' ? req.body.password : '';

    if (!emailValido(email) || !password) {
      throw new ErrorAuth(400, 'ingresa tu correo y contraseña');
    }

    const cliente = await prisma.cliente.findUnique({ where: { email }, include: { cuenta: true } });
    // Mismo mensaje si el correo no existe o la contraseña no coincide: no se
    // revela qué correos tienen cuenta.
    const valida = cliente?.cuenta ? await verifyPassword(password, cliente.cuenta.passwordHash) : false;
    if (!valida) throw new ErrorAuth(401, 'correo o contraseña incorrectos');

    ponerCookie(res, COOKIE_CLIENTE, tokenCliente(cliente.cuenta.id, cliente.id), DURACION_CLIENTE);
    res.json({ cliente: clientePublico(cliente) });
  } catch (e) {
    responderError(res, e);
  }
});

router.post('/salir', (req, res) => {
  borrarCookie(res, COOKIE_CLIENTE);
  res.json({ ok: true });
});

// Devuelve null (200) en vez de 401 cuando no hay sesión: el frontend lo usa
// al arrancar para decidir si muestra "Ingresar" o el menú del cliente.
router.get('/me', clienteOpcional, (req, res) => {
  res.json({ cliente: req.cliente ? clientePublico(req.cliente) : null });
});

router.put('/perfil', requiereCliente, async (req, res) => {
  try {
    const perfil = datosPerfil(req.body);
    if (perfil.nombre !== undefined && !perfil.nombre) {
      throw new ErrorAuth(400, 'el nombre es requerido');
    }

    const cliente = await prisma.cliente.update({
      where: { id: req.cliente.id },
      data: perfil,
    });
    res.json(clientePublico(cliente));
  } catch (e) {
    responderError(res, e);
  }
});

router.get('/compras', requiereCliente, async (req, res) => {
  try {
    const pedidos = await prisma.pedido.findMany({
      where: { clienteId: req.cliente.id },
      include: {
        estado: true,
        factura: true,
        detalles: { include: { galleta: true } },
      },
      orderBy: [{ fecha: 'desc' }, { id: 'desc' }],
    });
    res.json(pedidos);
  } catch (e) {
    responderError(res, e);
  }
});

module.exports = router;
