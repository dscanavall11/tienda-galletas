const express = require('express');
const prisma = require('../prismaClient');
const { requiereAdmin } = require('../auth');

const router = express.Router();

// La receta (tabla asociativa) viaja siempre ordenada por posición.
const INCLUDE = {
  categoria: true,
  ingredientes: { include: { ingrediente: true }, orderBy: { posicion: 'asc' } },
};

// Aplana la tabla asociativa: la receta queda como lista ordenada de
// ingredientes y los alérgenos como resumen sin repetidos.
function conReceta(galleta) {
  const ingredientes = galleta.ingredientes.map((gi) => gi.ingrediente);
  const alergenos = [...new Set(ingredientes.map((i) => i.alergeno).filter(Boolean))];
  return { ...galleta, ingredientes, alergenos };
}

// Normaliza la lista que escribe el administrador: sin vacíos ni repetidos
// (sin distinguir mayúsculas) y con la primera letra en mayúscula.
function limpiarIngredientes(nombres) {
  const vistos = new Set();
  const limpios = [];
  for (const n of nombres) {
    const t = String(n).trim().replace(/\s+/g, ' ');
    if (!t || t.length > 60 || vistos.has(t.toLowerCase())) continue;
    vistos.add(t.toLowerCase());
    limpios.push(t.charAt(0).toUpperCase() + t.slice(1));
  }
  return limpios.slice(0, 30);
}

// Reemplaza la receta de la galleta: reutiliza los ingredientes que ya existen
// (sin distinguir mayúsculas) y crea los nuevos.
async function guardarReceta(tx, galletaId, nombres) {
  const existentes = await tx.ingrediente.findMany();
  const porNombre = new Map(existentes.map((i) => [i.nombre.toLowerCase(), i]));
  await tx.galletaIngrediente.deleteMany({ where: { galletaId } });
  for (const [i, nombre] of nombres.entries()) {
    const ingrediente = porNombre.get(nombre.toLowerCase()) ?? (await tx.ingrediente.create({ data: { nombre } }));
    await tx.galletaIngrediente.create({ data: { galletaId, ingredienteId: ingrediente.id, posicion: i + 1 } });
  }
}

router.get('/', async (req, res) => {
  const { activa } = req.query;
  const where = activa !== undefined ? { activa: activa === 'true' } : {};
  const galletas = await prisma.galleta.findMany({
    where,
    include: INCLUDE,
    orderBy: { id: 'asc' },
  });
  res.json(galletas.map(conReceta));
});

router.get('/:id', async (req, res) => {
  const galleta = await prisma.galleta.findUnique({
    where: { id: Number(req.params.id) },
    include: INCLUDE,
  });
  if (!galleta) return res.status(404).json({ error: 'galleta no encontrada' });
  res.json(conReceta(galleta));
});

router.post('/', requiereAdmin, async (req, res) => {
  const { nombre, descripcion, fotoUrl, precio, stock, categoriaId, activa, ingredientes } = req.body;
  if (!nombre || !fotoUrl || precio === undefined || !categoriaId) {
    return res.status(400).json({ error: 'nombre, fotoUrl, precio y categoriaId son requeridos' });
  }
  if (ingredientes !== undefined && !Array.isArray(ingredientes)) {
    return res.status(400).json({ error: 'ingredientes debe ser una lista de nombres' });
  }
  try {
    const galleta = await prisma.$transaction(async (tx) => {
      const creada = await tx.galleta.create({
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
      if (ingredientes) await guardarReceta(tx, creada.id, limpiarIngredientes(ingredientes));
      return tx.galleta.findUnique({ where: { id: creada.id }, include: INCLUDE });
    });
    res.status(201).json(conReceta(galleta));
  } catch (e) {
    res.status(400).json({ error: 'categoriaId invalido: la categoria no existe' });
  }
});

router.put('/:id', requiereAdmin, async (req, res) => {
  const { nombre, descripcion, fotoUrl, precio, stock, categoriaId, activa, ingredientes } = req.body;
  if (ingredientes !== undefined && !Array.isArray(ingredientes)) {
    return res.status(400).json({ error: 'ingredientes debe ser una lista de nombres' });
  }
  const id = Number(req.params.id);
  try {
    const galleta = await prisma.$transaction(async (tx) => {
      await tx.galleta.update({
        where: { id },
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
      if (ingredientes) await guardarReceta(tx, id, limpiarIngredientes(ingredientes));
      return tx.galleta.findUnique({ where: { id }, include: INCLUDE });
    });
    res.json(conReceta(galleta));
  } catch (e) {
    res.status(404).json({ error: 'galleta no encontrada' });
  }
});

router.delete('/:id', requiereAdmin, async (req, res) => {
  try {
    await prisma.galleta.delete({ where: { id: Number(req.params.id) } });
    res.status(204).end();
  } catch (e) {
    res.status(409).json({ error: 'no se puede eliminar: tiene pedidos asociados' });
  }
});

module.exports = router;
