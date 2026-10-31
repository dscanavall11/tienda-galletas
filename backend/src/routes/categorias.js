const express = require('express');
const prisma = require('../prismaClient');

const router = express.Router();

router.get('/', async (req, res) => {
  const categorias = await prisma.categoria.findMany({ orderBy: { nombre: 'asc' } });
  res.json(categorias);
});

router.post('/', async (req, res) => {
  const { nombre } = req.body;
  if (!nombre) return res.status(400).json({ error: 'nombre es requerido' });
  try {
    const categoria = await prisma.categoria.create({ data: { nombre } });
    res.status(201).json(categoria);
  } catch (e) {
    res.status(409).json({ error: 'la categoria ya existe' });
  }
});

router.put('/:id', async (req, res) => {
  const { nombre } = req.body;
  try {
    const categoria = await prisma.categoria.update({
      where: { id: Number(req.params.id) },
      data: { nombre },
    });
    res.json(categoria);
  } catch (e) {
    res.status(404).json({ error: 'categoria no encontrada' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await prisma.categoria.delete({ where: { id: Number(req.params.id) } });
    res.status(204).end();
  } catch (e) {
    res.status(409).json({ error: 'no se puede eliminar: tiene galletas asociadas' });
  }
});

module.exports = router;
