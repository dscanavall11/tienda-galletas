const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const CATEGORIAS = ['Chocolate', 'Avena', 'Mantequilla', 'Rellenas'];

// Tabla de referencia del flujo de la cola de pedidos (la migración ya la
// carga; aquí se asegura con upsert por si la BD se creó sin ella).
const ESTADOS = [
  { codigo: 'PENDIENTE', nombre: 'Pendiente', orden: 1 },
  { codigo: 'EN_PREPARACION', nombre: 'En preparación', orden: 2 },
  { codigo: 'LISTO', nombre: 'Listo para entregar', orden: 3 },
  { codigo: 'ENTREGADO', nombre: 'Entregado', orden: 4 },
  { codigo: 'CANCELADO', nombre: 'Cancelado', orden: 5 },
];

// `foto` es el archivo de frontend/public/galletas/ (Vite lo sirve en
// /galletas/<foto>). Son ilustraciones locales para que la demo no dependa de
// internet ni de servicios de terceros; desde Inventario se puede pegar
// cualquier otra URL de foto.
const GALLETAS = [
  { nombre: 'Chispas de Chocolate', categoria: 'Chocolate', precio: 3500, stock: 40, descripcion: 'Clasica, con chispas de chocolate belga.', foto: 'chispas-de-chocolate.svg' },
  { nombre: 'Doble Chocolate', categoria: 'Chocolate', precio: 4000, stock: 30, descripcion: 'Cacao intenso con trozos de chocolate oscuro.', foto: 'doble-chocolate.svg' },
  { nombre: 'Choco Almendra', categoria: 'Chocolate', precio: 4500, stock: 22, descripcion: 'Chocolate con almendras tostadas.', foto: 'choco-almendra.svg' },
  { nombre: 'Avena y Pasas', categoria: 'Avena', precio: 3200, stock: 35, descripcion: 'Avena integral con pasas y miel.', foto: 'avena-y-pasas.svg' },
  { nombre: 'Avena y Coco', categoria: 'Avena', precio: 3300, stock: 25, descripcion: 'Avena con coco rallado tostado.', foto: 'avena-y-coco.svg' },
  { nombre: 'Oatmeal Cookie', categoria: 'Avena', precio: 3100, stock: 0, descripcion: 'Agotada, proximo lote en camino.', foto: 'oatmeal-cookie.svg' },
  { nombre: 'Mantequilla Clasica', categoria: 'Mantequilla', precio: 2800, stock: 50, descripcion: 'Receta tradicional de mantequilla.', foto: 'mantequilla-clasica.svg' },
  { nombre: 'Sable de Mantequilla', categoria: 'Mantequilla', precio: 3000, stock: 20, descripcion: 'Textura crocante, estilo frances.', foto: 'sable-de-mantequilla.svg' },
  { nombre: 'Rellena de Arequipe', categoria: 'Rellenas', precio: 4200, stock: 15, descripcion: 'Dos galletas con relleno de arequipe.', foto: 'rellena-de-arequipe.svg' },
  { nombre: 'Rellena de Frambuesa', categoria: 'Rellenas', precio: 4300, stock: 18, descripcion: 'Relleno de mermelada de frambuesa.', foto: 'rellena-de-frambuesa.svg' },
];

async function main() {
  console.log('Reiniciando datos de la demo...');
  await prisma.factura.deleteMany();
  await prisma.detallePedido.deleteMany();
  await prisma.pedidoHistorial.deleteMany();
  await prisma.pedido.deleteMany();
  await prisma.galleta.deleteMany();
  await prisma.cliente.deleteMany();
  await prisma.categoria.deleteMany();
  // AUTOINCREMENT recuerda el ultimo id en sqlite_sequence: sin esto cada
  // reseed sigue la numeracion (11, 12, ...) y una pestaña abierta con ids
  // viejos (carrito, selects del admin) apunta a filas que ya no existen.
  // `estados_pedido` es de referencia y no se borra, así que se conserva.
  await prisma.$executeRaw`DELETE FROM sqlite_sequence WHERE name != 'estados_pedido'`;

  for (const e of ESTADOS) {
    await prisma.estadoPedido.upsert({
      where: { codigo: e.codigo },
      update: { nombre: e.nombre, orden: e.orden },
      create: e,
    });
  }

  const categoriasPorNombre = {};
  for (const nombre of CATEGORIAS) {
    const categoria = await prisma.categoria.create({ data: { nombre } });
    categoriasPorNombre[nombre] = categoria.id;
  }

  for (const g of GALLETAS) {
    await prisma.galleta.create({
      data: {
        nombre: g.nombre,
        descripcion: g.descripcion,
        fotoUrl: `/galletas/${g.foto}`,
        precio: g.precio,
        stock: g.stock,
        categoriaId: categoriasPorNombre[g.categoria],
      },
    });
  }

  console.log(`Listo: ${CATEGORIAS.length} categorias, ${GALLETAS.length} galletas.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
