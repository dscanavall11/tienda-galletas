const { PrismaClient } = require('@prisma/client');
const { aplicarRecetas } = require('./recetas');

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
// /galletas/<foto>). Son fotos locales (las genera tools/generar-fotos) para
// que la demo no dependa de internet ni de servicios de terceros; desde
// Inventario se puede pegar cualquier otra URL de foto. La descripción y los
// ingredientes de cada galleta viven en ./recetas.js.
const GALLETAS = [
  { nombre: 'Chispas de Chocolate', categoria: 'Chocolate', precio: 3500, stock: 40, foto: 'chispas-de-chocolate.jpg' },
  { nombre: 'Doble Chocolate', categoria: 'Chocolate', precio: 4000, stock: 30, foto: 'doble-chocolate.jpg' },
  { nombre: 'Choco Almendra', categoria: 'Chocolate', precio: 4500, stock: 22, foto: 'choco-almendra.jpg' },
  { nombre: 'Avena y Pasas', categoria: 'Avena', precio: 3200, stock: 35, foto: 'avena-y-pasas.jpg' },
  { nombre: 'Avena y Coco', categoria: 'Avena', precio: 3300, stock: 25, foto: 'avena-y-coco.jpg' },
  { nombre: 'Oatmeal Cookie', categoria: 'Avena', precio: 3100, stock: 0, foto: 'oatmeal-cookie.jpg' },
  { nombre: 'Mantequilla Clasica', categoria: 'Mantequilla', precio: 2800, stock: 50, foto: 'mantequilla-clasica.jpg' },
  { nombre: 'Sable de Mantequilla', categoria: 'Mantequilla', precio: 3000, stock: 20, foto: 'sable-de-mantequilla.jpg' },
  { nombre: 'Rellena de Arequipe', categoria: 'Rellenas', precio: 4200, stock: 15, foto: 'rellena-de-arequipe.jpg' },
  { nombre: 'Rellena de Frambuesa', categoria: 'Rellenas', precio: 4300, stock: 18, foto: 'rellena-de-frambuesa.jpg' },
];

async function main() {
  console.log('Reiniciando datos de la demo...');
  await prisma.factura.deleteMany();
  await prisma.detallePedido.deleteMany();
  await prisma.pedidoHistorial.deleteMany();
  await prisma.pedido.deleteMany();
  await prisma.galletaIngrediente.deleteMany();
  await prisma.galleta.deleteMany();
  await prisma.ingrediente.deleteMany();
  // Las credenciales cuelgan de clientes: hay que borrarlas antes.
  await prisma.cuenta.deleteMany();
  await prisma.cliente.deleteMany();
  await prisma.categoria.deleteMany();
  // AUTOINCREMENT recuerda el ultimo id en sqlite_sequence: sin esto cada
  // reseed sigue la numeracion (11, 12, ...) y una pestaña abierta con ids
  // viejos (carrito, selects del admin) apunta a filas que ya no existen.
  // `estados_pedido` es de referencia y `administradores` es un dato de
  // configuración que el seed no toca: se conservan sus secuencias.
  await prisma.$executeRaw`DELETE FROM sqlite_sequence WHERE name NOT IN ('estados_pedido', 'administradores')`;

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
        fotoUrl: `/galletas/${g.foto}`,
        precio: g.precio,
        stock: g.stock,
        categoriaId: categoriasPorNombre[g.categoria],
      },
    });
  }

  const conReceta = await aplicarRecetas(prisma);

  console.log(`Listo: ${CATEGORIAS.length} categorias, ${GALLETAS.length} galletas (${conReceta} con receta).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
