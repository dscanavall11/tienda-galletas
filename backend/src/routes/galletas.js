const express = require('express');
const prisma = require('../prismaClient');

const router = express.Router();

router.get('/', async (req, res) => {
  const { activa } = req.query;
  const where = activa !== undefined ? { activa: activa === 'true' } : {};
  const galletas = await prisma.galleta.findMany({
    where,
    include: { categoria: true },
    orderBy: { id: 'asc' },
  });
  res.json(galletas);
});

router.get('/:id', async (req, res) => {
  const galleta = await prisma.galleta.findUnique({
    where: { id: Number(req.params.id) },
    include: { categoria: true },
  });
  if (!galleta) return res.status(404).json({ error: 'galleta no encontrada' });
  res.json(galleta);
});

router.post('/', async (req, res) => {
  const { nombre, descripcion, fotoUrl, precio, stock, categoriaId, activa } = req.body;
  if (!nombre || !fotoUrl || precio === undefined || !categoriaId) {
    return res.status(400).json({ error: 'nombre, fotoUrl, precio y categoriaId son requeridos' });
  }
  const galleta = await prisma.galleta.create({
    data: {
      nombre,
      descripcion,
      fotoUrl,
      precio: Number(precio),
      stock: stock !== undefined ? Number(stock) : 0,
      categoriaId: Number(categoriaId),
      activa: activa ?? true,
    },
  });
  res.status(201).json(galleta);
});

router.put('/:id', async (req, res) => {
  const { nombre, descripcion, fotoUrl, precio, stock, categoriaId, activa } = req.body;
  try {
    const galleta = await prisma.galleta.update({
      where: { id: Number(req.params.id) },
      data: {
        nombre,
        descripcion,
        fotoUrl,
        precio: precio !== undefined ? Number(precio) : undefined,
        stock: stock !== undefined ? Number(stock) : undefined,
        categoriaId: categoriaId !== undefined ? Number(categoriaId) : undefined,
        activa,
      },
    });
    res.json(galleta);
  } catch (e) {
    res.status(404).json({ error: 'galleta no encontrada' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await prisma.galleta.delete({ where: { id: Number(req.params.id) } });
    res.status(204).end();
  } catch (e) {
    res.status(409).json({ error: 'no se puede eliminar: tiene pedidos asociados' });
  }
});

module.exports = router;
