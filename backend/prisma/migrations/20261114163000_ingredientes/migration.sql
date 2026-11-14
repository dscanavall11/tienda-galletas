-- CreateTable
CREATE TABLE "ingredientes" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nombre" TEXT NOT NULL,
    "alergeno" TEXT
);

-- CreateTable
CREATE TABLE "galleta_ingrediente" (
    "galletaId" INTEGER NOT NULL,
    "ingredienteId" INTEGER NOT NULL,
    "posicion" INTEGER NOT NULL,

    PRIMARY KEY ("galletaId", "ingredienteId"),
    CONSTRAINT "galleta_ingrediente_galletaId_fkey" FOREIGN KEY ("galletaId") REFERENCES "galletas" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "galleta_ingrediente_ingredienteId_fkey" FOREIGN KEY ("ingredienteId") REFERENCES "ingredientes" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "ingredientes_nombre_key" ON "ingredientes"("nombre");

