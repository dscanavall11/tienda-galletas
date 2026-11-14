// Crea (o actualiza) el administrador de demo a partir de backend/.env.
// A diferencia de `prisma/seed.js`, este script NO borra datos: solo hace
// upsert de la fila del administrador indicado.
require('dotenv').config();

const prisma = require('../src/prismaClient');
const { hashPassword } = require('../src/auth');

async function main() {
  const usuario = (process.env.ADMIN_USUARIO || '').trim();
  const password = process.env.ADMIN_PASSWORD || '';
  const nombre = (process.env.ADMIN_NOMBRE || '').trim() || null;

  if (!usuario || !password) {
    console.error('Faltan ADMIN_USUARIO y/o ADMIN_PASSWORD en backend/.env.');
    console.error('Copia backend/.env.example a backend/.env o define esas variables.');
    process.exitCode = 1;
    return;
  }

  const passwordHash = await hashPassword(password);
  const admin = await prisma.administrador.upsert({
    where: { usuario },
    update: { passwordHash, nombre },
    create: { usuario, passwordHash, nombre },
  });

  console.log(`Administrador de demo listo: ${admin.usuario}`);
  console.log('No se borraron datos: solo se creó o actualizó este administrador.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
