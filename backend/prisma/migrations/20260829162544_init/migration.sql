-- CreateTable
CREATE TABLE "categorias" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nombre" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "galletas" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "fotoUrl" TEXT NOT NULL,
    "precio" REAL NOT NULL,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "categoriaId" INTEGER NOT NULL,
    CONSTRAINT "galletas_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "categorias" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "clientes" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nombre" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "telefono" TEXT,
    "direccion" TEXT,
    "documento" TEXT
);

-- CreateTable
CREATE TABLE "pedidos" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "clienteId" INTEGER NOT NULL,
    "fecha" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "estado" TEXT NOT NULL DEFAULT 'CONFIRMADO',
    CONSTRAINT "pedidos_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "detalle_pedido" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "pedidoId" INTEGER NOT NULL,
    "galletaId" INTEGER NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "precioUnitario" REAL NOT NULL,
    CONSTRAINT "detalle_pedido_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "pedidos" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "detalle_pedido_galletaId_fkey" FOREIGN KEY ("galletaId") REFERENCES "galletas" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "facturas" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "pedidoId" INTEGER NOT NULL,
    "numero" TEXT NOT NULL,
    "fechaEmision" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "subtotal" REAL NOT NULL,
    "impuesto" REAL NOT NULL,
    "total" REAL NOT NULL,
    CONSTRAINT "facturas_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "pedidos" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "categorias_nombre_key" ON "categorias"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "clientes_email_key" ON "clientes"("email");

-- CreateIndex
CREATE UNIQUE INDEX "facturas_pedidoId_key" ON "facturas"("pedidoId");

-- CreateIndex
CREATE UNIQUE INDEX "facturas_numero_key" ON "facturas"("numero");
