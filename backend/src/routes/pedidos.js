const express = require('express');
const prisma = require('../prismaClient');

const router = express.Router();
const IVA = 0.19;

router.get('/', async (req, res) => {
  const pedidos = await prisma.pedido.findMany({
    include: { cliente: true, detalles: { include: { galleta: true } }, factura: true },
    orderBy: { id: 'desc' },
  });
  res.json(pedidos);
});

router.get('/:id', async (req, res) => {
  const pedido = await prisma.pedido.findUnique({
    where: { id: Number(req.params.id) },
    include: { cliente: true, detalles: { include: { galleta: true } }, factura: true },
  });
  if (!pedido) return res.status(404).json({ error: 'pedido no encontrado' });
  res.json(pedido);
});

// Transacción de compra: valida stock, reutiliza/crea cliente, crea el
// pedido con su detalle, descuenta stock y emite la factura. Todo o nada.
router.post('/', async (req, res) => {
  const { cliente, items } = req.body;

  if (!cliente?.email || !cliente?.nombre) {
    return res.status(400).json({ error: 'datos de cliente incompletos' });
  }
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'el carrito esta vacio' });
  }

  try {
    const resultado = await prisma.$transaction(async (tx) => {
      const clienteRow = await tx.cliente.upsert({
        where: { email: cliente.email },
        update: {
          nombre: cliente.nombre,
          telefono: cliente.telefono,
          direccion: cliente.direccion,
          documento: cliente.documento,
        },
        create: cliente,
      });

      const galletaIds = items.map((i) => Number(i.galletaId));
      const galletas = await tx.galleta.findMany({ where: { id: { in: galletaIds } } });

      let subtotal = 0;
      const detalleData = [];
      for (const item of items) {
        const galleta = galletas.find((g) => g.id === Number(item.galletaId));
        if (!galleta) throw new Error(`La galleta ${item.galletaId} no existe`);
        if (!galleta.activa) throw new Error(`${galleta.nombre} ya no esta disponible`);
        if (galleta.stock < item.cantidad) throw new Error(`Stock insuficiente para ${galleta.nombre}`);
        subtotal += galleta.precio * item.cantidad;
        detalleData.push({ galletaId: galleta.id, cantidad: item.cantidad, precioUnitario: galleta.precio });
      }

      const pedido = await tx.pedido.create({
        data: { clienteId: clienteRow.id, detalles: { create: detalleData } },
      });

      for (const item of items) {
        await tx.galleta.update({
          where: { id: Number(item.galletaId) },
          data: { stock: { decrement: item.cantidad } },
        });
      }

      const impuesto = Math.round(subtotal * IVA * 100) / 100;
      const total = Math.round((subtotal + impuesto) * 100) / 100;
      const numero = `F-${String(pedido.id).padStart(6, '0')}`;

      await tx.factura.create({
        data: { pedidoId: pedido.id, numero, subtotal, impuesto, total },
      });

      return tx.pedido.findUnique({
        where: { id: pedido.id },
        include: { cliente: true, detalles: { include: { galleta: true } }, factura: true },
      });
    });

    res.status(201).json(resultado);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

module.exports = router;
