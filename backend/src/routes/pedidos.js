const express = require('express');
const prisma = require('../prismaClient');

const router = express.Router();
const IVA = 0.19;

// Flujo de la cola: desde cada estado, a cuáles se puede pasar. Los pedidos
// nuevos entran como PENDIENTE y se atienden en orden de llegada (FIFO).
const TRANSICIONES = {
  PENDIENTE: ['EN_PREPARACION', 'CANCELADO'],
  EN_PREPARACION: ['LISTO', 'CANCELADO'],
  LISTO: ['ENTREGADO'],
  ENTREGADO: [],
  CANCELADO: [],
};
const ACTIVOS = ['PENDIENTE', 'EN_PREPARACION', 'LISTO'];

const INCLUDE = {
  cliente: true,
  estado: true,
  detalles: { include: { galleta: true } },
  factura: true,
};

// Error con código HTTP para las reglas de negocio (validaciones, transiciones).
class ErrorNegocio extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function responderError(res, e) {
  if (e instanceof ErrorNegocio) return res.status(e.status).json({ error: e.message });
  console.error(e);
  res.status(500).json({ error: 'Error interno del servidor' });
}

// Mueve un pedido a otro estado dentro de la transacción `tx`. Valida la
// transición, hace un "compare-and-swap" (solo cambia si nadie lo movió antes),
// anota la bitácora y, si se cancela, devuelve el stock de sus galletas.
async function cambiarEstado(tx, pedidoId, destino) {
  const estados = await tx.estadoPedido.findMany();
  const porCodigo = Object.fromEntries(estados.map((e) => [e.codigo, e]));
  if (!porCodigo[destino]) throw new ErrorNegocio(400, `estado desconocido: ${destino}`);

  const pedido = await tx.pedido.findUnique({
    where: { id: pedidoId },
    include: { estado: true, detalles: true },
  });
  if (!pedido) throw new ErrorNegocio(404, 'pedido no encontrado');

  const origen = pedido.estado.codigo;
  if (!TRANSICIONES[origen].includes(destino)) {
    throw new ErrorNegocio(409, `transicion no permitida: ${origen} -> ${destino}`);
  }

  const { count } = await tx.pedido.updateMany({
    where: { id: pedidoId, estadoId: pedido.estadoId },
    data: { estadoId: porCodigo[destino].id },
  });
  if (count === 0) throw new ErrorNegocio(409, 'el pedido ya fue modificado por otra persona');

  await tx.pedidoHistorial.create({ data: { pedidoId, estadoId: porCodigo[destino].id } });

  if (destino === 'CANCELADO') {
    for (const d of pedido.detalles) {
      await tx.galleta.update({
        where: { id: d.galletaId },
        data: { stock: { increment: d.cantidad } },
      });
    }
  }

  return tx.pedido.findUnique({ where: { id: pedidoId }, include: INCLUDE });
}

router.get('/', async (req, res) => {
  try {
    const pedidos = await prisma.pedido.findMany({ include: INCLUDE, orderBy: { id: 'desc' } });
    res.json(pedidos);
  } catch (e) {
    responderError(res, e);
  }
});

// La cola: pedidos activos en orden de llegada (el más antiguo primero).
// Declarada antes de "/:id" para que "cola" no se interprete como un id.
router.get('/cola', async (req, res) => {
  try {
    const pedidos = await prisma.pedido.findMany({
      where: { estado: { codigo: { in: ACTIVOS } } },
      include: INCLUDE,
      orderBy: [{ fecha: 'asc' }, { id: 'asc' }],
    });
    res.json(pedidos);
  } catch (e) {
    responderError(res, e);
  }
});

// Toma el pedido PENDIENTE más antiguo y lo pasa a EN_PREPARACION. Si otro
// operador se lo lleva primero, reintenta con el siguiente de la fila.
router.post('/cola/siguiente', async (req, res) => {
  try {
    for (let intento = 0; intento < 3; intento++) {
      const siguiente = await prisma.pedido.findFirst({
        where: { estado: { codigo: 'PENDIENTE' } },
        orderBy: [{ fecha: 'asc' }, { id: 'asc' }],
      });
      if (!siguiente) throw new ErrorNegocio(404, 'no hay pedidos pendientes en la cola');
      try {
        const pedido = await prisma.$transaction((tx) => cambiarEstado(tx, siguiente.id, 'EN_PREPARACION'));
        return res.json(pedido);
      } catch (e) {
        if (!(e instanceof ErrorNegocio) || e.status !== 409) throw e;
      }
    }
    throw new ErrorNegocio(409, 'la cola cambio mientras se procesaba, intenta de nuevo');
  } catch (e) {
    responderError(res, e);
  }
});

router.get('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) throw new ErrorNegocio(404, 'pedido no encontrado');

    const pedido = await prisma.pedido.findUnique({
      where: { id },
      include: { ...INCLUDE, historial: { include: { estado: true }, orderBy: { id: 'asc' } } },
    });
    if (!pedido) throw new ErrorNegocio(404, 'pedido no encontrado');

    // Posición en la cola (1 = el siguiente en atenderse); solo aplica a PENDIENTE.
    let posicionCola = null;
    if (pedido.estado.codigo === 'PENDIENTE') {
      const delante = await prisma.pedido.count({
        where: {
          estado: { codigo: 'PENDIENTE' },
          OR: [{ fecha: { lt: pedido.fecha } }, { fecha: pedido.fecha, id: { lt: pedido.id } }],
        },
      });
      posicionCola = delante + 1;
    }
    res.json({ ...pedido, posicionCola });
  } catch (e) {
    responderError(res, e);
  }
});

router.patch('/:id/estado', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) throw new ErrorNegocio(404, 'pedido no encontrado');
    const pedido = await prisma.$transaction((tx) => cambiarEstado(tx, id, req.body?.estado));
    res.json(pedido);
  } catch (e) {
    responderError(res, e);
  }
});

// Transacción de compra: valida stock, reutiliza/crea cliente, crea el
// pedido (en la cola, PENDIENTE) con su detalle, descuenta stock y emite la
// factura. Todo o nada.
router.post('/', async (req, res) => {
  try {
    const { cliente, items } = req.body;

    if (!cliente?.email || !cliente?.nombre) throw new ErrorNegocio(400, 'datos de cliente incompletos');
    if (!Array.isArray(items) || items.length === 0) throw new ErrorNegocio(400, 'el carrito esta vacio');

    // Cantidades enteras > 0; si una galleta viene repetida se suman.
    const lineas = new Map();
    for (const item of items) {
      const galletaId = Number(item?.galletaId);
      const cantidad = Number(item?.cantidad);
      if (!Number.isInteger(galletaId) || !Number.isInteger(cantidad) || cantidad < 1) {
        throw new ErrorNegocio(400, 'cada item requiere galletaId y una cantidad entera mayor a 0');
      }
      lineas.set(galletaId, (lineas.get(galletaId) ?? 0) + cantidad);
    }

    const datosCliente = {
      nombre: cliente.nombre,
      telefono: cliente.telefono,
      direccion: cliente.direccion,
      documento: cliente.documento,
    };

    const resultado = await prisma.$transaction(async (tx) => {
      const pendiente = await tx.estadoPedido.findUnique({ where: { codigo: 'PENDIENTE' } });
      if (!pendiente) throw new ErrorNegocio(500, 'faltan los estados de pedido: ejecuta la migracion y el seed');

      const clienteRow = await tx.cliente.upsert({
        where: { email: cliente.email },
        update: datosCliente,
        create: { ...datosCliente, email: cliente.email },
      });

      const galletas = await tx.galleta.findMany({ where: { id: { in: [...lineas.keys()] } } });

      let subtotal = 0;
      const detalleData = [];
      for (const [galletaId, cantidad] of lineas) {
        const galleta = galletas.find((g) => g.id === galletaId);
        if (!galleta) throw new ErrorNegocio(400, `La galleta ${galletaId} no existe`);
        if (!galleta.activa) throw new ErrorNegocio(400, `${galleta.nombre} ya no esta disponible`);
        if (galleta.stock < cantidad) throw new ErrorNegocio(400, `Stock insuficiente para ${galleta.nombre}`);
        subtotal += galleta.precio * cantidad;
        detalleData.push({ galletaId, cantidad, precioUnitario: galleta.precio });
      }

      const pedido = await tx.pedido.create({
        data: {
          clienteId: clienteRow.id,
          estadoId: pendiente.id,
          detalles: { create: detalleData },
          historial: { create: { estadoId: pendiente.id } },
        },
      });

      for (const { galletaId, cantidad } of detalleData) {
        await tx.galleta.update({ where: { id: galletaId }, data: { stock: { decrement: cantidad } } });
      }

      const impuesto = Math.round(subtotal * IVA * 100) / 100;
      const total = Math.round((subtotal + impuesto) * 100) / 100;
      const numero = `F-${String(pedido.id).padStart(6, '0')}`;

      await tx.factura.create({
        data: { pedidoId: pedido.id, numero, subtotal, impuesto, total },
      });

      return tx.pedido.findUnique({ where: { id: pedido.id }, include: INCLUDE });
    });

    res.status(201).json(resultado);
  } catch (e) {
    responderError(res, e);
  }
});

module.exports = router;
