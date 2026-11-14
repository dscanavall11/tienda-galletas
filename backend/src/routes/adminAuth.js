const express = require('express');
const prisma = require('../prismaClient');
const {
  COOKIE_ADMIN,
  DURACION_ADMIN,
  verifyPassword,
  tokenAdmin,
  ponerCookie,
  borrarCookie,
  adminPublico,
  adminOpcional,
} = require('../auth');

const router = express.Router();

// Login separado del de clientes y sin registro público: los administradores
// se crean con `npm run admin:crear` (usuario y contraseña en backend/.env).
router.post('/login', async (req, res) => {
  try {
    const usuario = typeof req.body?.usuario === 'string' ? req.body.usuario.trim() : '';
    const password = typeof req.body?.password === 'string' ? req.body.password : '';

    if (!usuario || !password) {
      return res.status(400).json({ error: 'ingresa usuario y contraseña' });
    }

    const admin = await prisma.administrador.findUnique({ where: { usuario } });
    const valida = admin ? await verifyPassword(password, admin.passwordHash) : false;
    if (!valida) return res.status(401).json({ error: 'usuario o contraseña incorrectos' });

    ponerCookie(res, COOKIE_ADMIN, tokenAdmin(admin.id), DURACION_ADMIN);
    res.json({ admin: adminPublico(admin) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.post('/logout', (req, res) => {
  borrarCookie(res, COOKIE_ADMIN);
  res.json({ ok: true });
});

router.get('/me', adminOpcional, (req, res) => {
  res.json({ admin: req.admin ? adminPublico(req.admin) : null });
});

module.exports = router;
