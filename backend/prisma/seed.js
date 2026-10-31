const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const CATEGORIAS = ['Chocolate', 'Avena', 'Mantequilla', 'Rellenas'];

// fotoUrl usa fotos reales (Flickr, vía LoremFlickr) buscadas por palabras
// clave en ingles que coinciden con cada producto; `lock` fija siempre la
// misma foto para ese id (si no, la misma combinacion de tags podria variar
// en cada carga).
const GALLETAS = [
  { nombre: 'Chispas de Chocolate', categoria: 'Chocolate', precio: 3500, stock: 40, descripcion: 'Clasica, con chispas de chocolate belga.', tags: 'chocolate,cookie', lock: 1 },
  { nombre: 'Doble Chocolate', categoria: 'Chocolate', precio: 4000, stock: 30, descripcion: 'Cacao intenso con trozos de chocolate oscuro.', tags: 'chocolate,cookie', lock: 2 },
  { nombre: 'Choco Almendra', categoria: 'Chocolate', precio: 4500, stock: 22, descripcion: 'Chocolate con almendras tostadas.', tags: 'chocolate,almond', lock: 3 },
  { nombre: 'Avena y Pasas', categoria: 'Avena', precio: 3200, stock: 35, descripcion: 'Avena integral con pasas y miel.', tags: 'oatmeal,cookie', lock: 4 },
  { nombre: 'Avena y Coco', categoria: 'Avena', precio: 3300, stock: 25, descripcion: 'Avena con coco rallado tostado.', tags: 'coconut,cookie', lock: 5 },
  { nombre: 'Oatmeal Cookie', categoria: 'Avena', precio: 3100, stock: 0, descripcion: 'Agotada, proximo lote en camino.', tags: 'oatmeal,cookie', lock: 6 },
  { nombre: 'Mantequilla Clasica', categoria: 'Mantequilla', precio: 2800, stock: 50, descripcion: 'Receta tradicional de mantequilla.', tags: 'butter,cookie', lock: 7 },
  { nombre: 'Sable de Mantequilla', categoria: 'Mantequilla', precio: 3000, stock: 20, descripcion: 'Textura crocante, estilo frances.', tags: 'shortbread,cookie', lock: 8 },
  { nombre: 'Rellena de Arequipe', categoria: 'Rellenas', precio: 4200, stock: 15, descripcion: 'Dos galletas con relleno de arequipe.', tags: 'caramel,cookie', lock: 9 },
  { nombre: 'Rellena de Frambuesa', categoria: 'Rellenas', precio: 4300, stock: 18, descripcion: 'Relleno de mermelada de frambuesa.', tags: 'raspberry,cookie', lock: 10 },
];

async function main() {
  console.log('Reiniciando datos de la demo...');
  await prisma.factura.deleteMany();
  await prisma.detallePedido.deleteMany();
  await prisma.pedido.deleteMany();
  await prisma.galleta.deleteMany();
  await prisma.cliente.deleteMany();
  await prisma.categoria.deleteMany();
  // AUTOINCREMENT recuerda el ultimo id en sqlite_sequence: sin esto cada
  // reseed sigue la numeracion (11, 12, ...) y una pestaña abierta con ids
  // viejos (carrito, selects del admin) apunta a filas que ya no existen.
  await prisma.$executeRaw`DELETE FROM sqlite_sequence`;

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
        fotoUrl: `https://loremflickr.com/400/300/${g.tags}?lock=${g.lock}`,
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
