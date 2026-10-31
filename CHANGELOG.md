# Changelog

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y versionado
[SemVer](https://semver.org/lang/es/).

> Las versiones 1.0.0 a 1.2.0 se reconstruyeron al registrar el repositorio (2026-10-31) a partir
> de las etapas reales del desarrollo de la demo.

## [1.2.0] - 2026-10-31

### Añadido
- **Cola de pedidos (FIFO)** con estados `PENDIENTE → EN_PREPARACION → LISTO → ENTREGADO` y
  `CANCELADO` (solo antes de estar listo; devuelve el stock una única vez).
- Tablas `estados_pedido` (referencia) y `pedido_historial` (bitácora), con la migración
  `20261031150000_cola_pedidos`. Los pedidos que ya existían quedan `PENDIENTE`.
- API: `GET /api/pedidos/cola`, `POST /api/pedidos/cola/siguiente`, `PATCH /api/pedidos/:id/estado`;
  `GET /api/pedidos/:id` ahora incluye el historial y la `posicionCola`.
- Panel `/admin/cola`: tablero por estado con "Tomar siguiente", que se actualiza solo cada 5 s.
- Seguimiento del pedido en la factura del cliente (pasos y posición en la cola, en vivo) e
  historial de estados en la factura de administración.
- Estado de cada pedido (con filtro) en *Pedidos y facturas*, *Clientes* y el *Resumen*
  ("Pedidos en cola").
- Variable `API_URL` para apuntar el frontend a otro backend (por ejemplo, uno con BD de prueba).

### Cambiado
- La compra valida los ítems (cantidad entera mayor a 0), suma las galletas repetidas, solo
  acepta los campos esperados del cliente y responde 500 genérico ante errores inesperados.
- "Ventas totales" y "Total comprado" de cada cliente excluyen los pedidos cancelados.
- El seed conserva `estados_pedido` y reinicia la numeración del resto de las tablas.

## [1.1.0] - 2026-10-31

### Añadido
- **Dos caras** en una sola app: la tienda para clientes en `/` y el panel de administración en
  `/admin`, cada una con su layout y navegación.
- Panel: *Resumen* (estadísticas, stock bajo, últimos pedidos) y *Clientes* (historial de compras
  y edición de datos). API: `PUT /api/clientes/:id`.
- Catálogo con filtro por categoría y búsqueda; la factura se puede abrir desde ambas caras.
- Ilustraciones locales realistas de cada galleta (`frontend/public/galletas/`) e imagen de
  respaldo cuando una foto no carga.

### Cambiado
- El seed reinicia la numeración de ids para que las pestañas abiertas no apunten a filas
  inexistentes tras un reseed.
- Menú lateral del panel: se pliega a un riel de iconos en pantallas pequeñas.
- Título e idioma de la página; migración de `destroyOnClose` a `destroyOnHidden` (Ant Design 6).

### Corregido
- Las fotos de las galletas no cargaban porque el servicio externo del que dependían respondía
  HTTP 500; ahora son archivos locales.

## [1.0.1] - 2026-10-31

### Corregido
- El backend se caía por completo cuando una petición generaba un error de Prisma sin capturar
  (por ejemplo, `POST /api/galletas` con un `categoriaId` inexistente). Ahora responde 400/409 y
  hay una red de seguridad para promesas rechazadas.

## [1.0.0] - 2026-10-31

### Añadido
- Modelo de datos normalizado a 3FN con Prisma y SQLite (categorías, galletas, clientes, pedidos,
  detalle de pedido y facturas) y datos de ejemplo.
- API REST con Express, incluida la compra transaccional (valida stock, reutiliza el cliente por
  email, descuenta stock y emite la factura).
- Tienda: catálogo, carrito, checkout y factura imprimible.
- Administración: CRUD de inventario y categorías, historial de pedidos y facturas.
- Interfaz con Ant Design y paleta monocromática estilo Google Chrome.
