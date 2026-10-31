const express = require('express');
const prisma = require('../prismaClient');

const router = express.Router();

router.get('/', async (req, res) => {
  const clientes = await prisma.cliente.findMany({ orderBy: { id: 'desc' } });
  res.json(clientes);
});

// Busca por email antes de crear: un mismo cliente no debe duplicarse
// entre compras (es la razón de ser de esta tabla separada de Pedido).
router.post('/', async (req, res) => {
  const { nombre, email, telefono, direccion, documento } = req.body;
  if (!nombre || !email) return res.status(400).json({ error: 'nombre y email son requeridos' });
  try {
    const cliente = await prisma.cliente.upsert({
      where: { email },
      update: { nombre, telefono, direccion, documento },
      create: { nombre, email, telefono, direccion, documento },
    });
    res.status(200).json(cliente);
  } catch (e) {
    res.status(400).json({ error: 'no se pudo guardar el cliente' });
  }
});

// Edicion desde el panel de administracion. El email sigue siendo unico: si
// choca con otro cliente se responde 409 en vez de dejar caer el servidor.
router.put('/:id', async (req, res) => {
  const { nombre, email, telefono, direccion, documento } = req.body;
  if (!nombre || !email) return res.status(400).json({ error: 'nombre y email son requeridos' });
  try {
    const cliente = await prisma.cliente.update({
      where: { id: Number(req.params.id) },
      data: { nombre, email, telefono, direccion, documento },
    });
    res.json(cliente);
  } catch (e) {
    if (e.code === 'P2002') return res.status(409).json({ error: 'ya existe otro cliente con ese email' });
    res.status(404).json({ error: 'cliente no encontrado' });
  }
});

module.exports = router;
