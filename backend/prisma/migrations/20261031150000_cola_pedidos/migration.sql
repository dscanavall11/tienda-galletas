-- Cola de pedidos: el estado deja de ser texto libre en `pedidos` y pasa a una
-- tabla de referencia (`estados_pedido`), con una bitácora de transiciones
-- (`pedido_historial`). Los pedidos que ya existían (antes "CONFIRMADO")
-- quedan PENDIENTE, es decir, entran a la cola.

-- CreateTable
CREATE TABLE "estados_pedido" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "orden" INTEGER NOT NULL
);

-- Datos de referencia: la secuencia del flujo de la cola.
INSERT INTO "estados_pedido" ("codigo", "nombre", "orden") VALUES
    ('PENDIENTE', 'Pendiente', 1),
    ('EN_PREPARACION', 'En preparación', 2),
    ('LISTO', 'Listo para entregar', 3),
    ('ENTREGADO', 'Entregado', 4),
    ('CANCELADO', 'Cancelado', 5);

-- CreateTable
CREATE TABLE "pedido_historial" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "pedidoId" INTEGER NOT NULL,
    "estadoId" INTEGER NOT NULL,
    "fecha" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "pedido_historial_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "pedidos" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "pedido_historial_estadoId_fkey" FOREIGN KEY ("estadoId") REFERENCES "estados_pedido" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_pedidos" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "clienteId" INTEGER NOT NULL,
    "fecha" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "estadoId" INTEGER NOT NULL,
    CONSTRAINT "pedidos_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "pedidos_estadoId_fkey" FOREIGN KEY ("estadoId") REFERENCES "estados_pedido" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_pedidos" ("clienteId", "fecha", "id", "estadoId")
    SELECT "clienteId", "fecha", "id", (SELECT "id" FROM "estados_pedido" WHERE "codigo" = 'PENDIENTE') FROM "pedidos";
DROP TABLE "pedidos";
ALTER TABLE "new_pedidos" RENAME TO "pedidos";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- Historial inicial de los pedidos que ya existian.
INSERT INTO "pedido_historial" ("pedidoId", "estadoId", "fecha")
    SELECT "id", "estadoId", "fecha" FROM "pedidos";

-- CreateIndex
CREATE UNIQUE INDEX "estados_pedido_codigo_key" ON "estados_pedido"("codigo");
