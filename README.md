# Tienda de Galletas — demo académica (BD + normalización)

Demo completamente funcional de una tienda de galletas: inventario con foto/precio/stock,
clientes, simulación de compra y factura. El objetivo académico es el **diseño de base de
datos normalizado (3FN)**, implementado con Prisma sobre SQLite.

## Dos caras

Una sola app con dos experiencias, cada una con su propio layout y navegación:

| Cara | Ruta | Para quién | Qué incluye |
|---|---|---|---|
| **Tienda** | `/` | Clientes | Catálogo con filtro y búsqueda, carrito, checkout y factura imprimible |
| **Administración** | `/admin` | Operación | Resumen, inventario, categorías, clientes y pedidos/facturas |

> Es una demo académica: **no hay login**, el panel `/admin` es accesible por URL.

## Stack

- **Backend**: Node.js + Express + Prisma ORM + SQLite (`backend/`)
- **Frontend**: Vite + React + Ant Design, paleta monocromática estilo Google Chrome (`frontend/`)

## Requisitos

- Node.js 18+ (probado con v25) y npm

## Puesta en marcha

```bash
npm run install:all   # dependencias de la raíz, backend y frontend
npm run env:init      # crea backend/.env a partir de backend/.env.example
npm run db:deploy     # aplica las migraciones (crea backend/prisma/dev.db)
npm run db:seed       # categorías y galletas de ejemplo
npm run dev           # backend y frontend a la vez
```

- Tienda: http://localhost:5173
- Administración: http://localhost:5173/admin
- API backend: http://localhost:4001/api
- Inspeccionar la BD visualmente: `npm run db:studio` (Prisma Studio)

> Si el puerto 4001 o 5173 está ocupado en tu máquina, cámbialo en `backend/.env`
> (`PORT`) y en `frontend/vite.config.js` (`server.port` y el proxy `/api`).
> Para volver al estado inicial de la demo en cualquier momento: `npm run db:seed`.

## Modelo de datos (3FN)

```mermaid
erDiagram
    CATEGORIA ||--o{ GALLETA : clasifica
    GALLETA ||--o{ DETALLE_PEDIDO : incluida_en
    CLIENTE ||--o{ PEDIDO : realiza
    PEDIDO ||--o{ DETALLE_PEDIDO : contiene
    PEDIDO ||--|| FACTURA : genera

    CATEGORIA {
        int id PK
        string nombre UK
    }
    GALLETA {
        int id PK
        string nombre
        string fotoUrl
        float precio
        int stock
        boolean activa
        int categoriaId FK
    }
    CLIENTE {
        int id PK
        string nombre
        string email UK
        string telefono
        string direccion
        string documento
    }
    PEDIDO {
        int id PK
        int clienteId FK
        datetime fecha
        string estado
    }
    DETALLE_PEDIDO {
        int id PK
        int pedidoId FK
        int galletaId FK
        int cantidad
        float precioUnitario
    }
    FACTURA {
        int id PK
        int pedidoId FK "unique"
        string numero UK
        float subtotal
        float impuesto
        float total
    }
```

Decisiones de normalización (ver también los comentarios en `backend/prisma/schema.prisma`):

- **Categoria** separada de **Galleta**: evita repetir el nombre de la categoría como texto
  libre en cada galleta (elimina una dependencia transitiva → 3FN).
- **Cliente** separado de **Pedido**: los datos del cliente se capturan una sola vez y se
  reutilizan por `email` en compras futuras (evita duplicar nombre/dirección/teléfono).
- **DetallePedido** como entidad asociativa: resuelve la relación N:M entre Pedido y Galleta,
  y guarda `precioUnitario` como una "foto" del precio al momento de la venta — si la galleta
  cambia de precio después, las facturas históricas no se alteran.
- **Factura** separada de **Pedido** (relación 1:1): modela la diferencia real entre el
  documento comercial (pedido) y el documento fiscal (factura).
- **Pedido no guarda un total denormalizado**: el total vive únicamente en Factura, calculado
  a partir del detalle, para evitar datos derivados desincronizados.

## Flujo de ramas (GitFlow)

| Rama | Propósito |
|---|---|
| `main` | Producción: cada commit es una versión etiquetada (`vX.Y.Z`) |
| `develop` | Integración: aquí se unen las funcionalidades terminadas |
| `feature/*` | Una funcionalidad; sale de `develop` y vuelve con merge `--no-ff` |
| `release/X.Y.Z` | Preparación de versión (número y CHANGELOG); se une a `main` y `develop` y se etiqueta |
| `hotfix/X.Y.Z` | Corrección urgente sobre `main`; se une a `main` y `develop` y se etiqueta |

Los mensajes de commit siguen *Conventional Commits* (`feat:`, `fix:`, `docs:`, `chore:`). El
historial de versiones está en [CHANGELOG.md](CHANGELOG.md).

## Flujo de prueba manual

1. Abre la tienda, filtra por categoría, agrega 2-3 galletas al carrito y confirma la compra con
   un correo nuevo: obtienes la factura (IVA 19%).
2. Ve a `/admin/inventario`: el stock de las galletas compradas debe verse reducido.
3. Repite una compra con el **mismo correo**: en **Clientes** ves un único cliente con sus dos
   pedidos (sin duplicarlo).
4. Edita el precio de una galleta en **Inventario**: el catálogo cambia, pero las facturas ya
   emitidas conservan el `precioUnitario` histórico.
5. Reinicia el backend: los datos persisten en `backend/prisma/dev.db`.

## Fuera de alcance (a propósito, para mantener el ejercicio pequeño)

Autenticación/roles, pagos reales, envío de emails, generación de PDF real (se usa la impresión
del navegador), subida de archivos de imagen (se usa URL o las ilustraciones locales), despliegue
en la nube y tests automatizados.
