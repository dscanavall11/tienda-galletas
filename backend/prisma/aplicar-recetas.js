// Carga la descripción y los ingredientes de las galletas de la demo en la BD
// actual sin borrar pedidos, clientes ni stock (a diferencia de `db:seed`).
const { PrismaClient } = require('@prisma/client');
const { aplicarRecetas } = require('./recetas');

const prisma = new PrismaClient();

aplicarRecetas(prisma)
  .then((n) => console.log(`Recetas aplicadas a ${n} galleta(s).`))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
