const express = require('express');
const prisma = require('../prismaClient');

const router = express.Router();

// Catálogo de ingredientes (para sugerirlos al editar una galleta). Los nuevos
// se crean al guardar la receta de una galleta, no desde aquí.
router.get('/', async (req, res) => {
  try {
    const ingredientes = await prisma.ingrediente.findMany({ orderBy: { nombre: 'asc' } });
    res.json(ingredientes);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;
