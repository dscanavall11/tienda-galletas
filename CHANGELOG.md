# Changelog

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y versionado
[SemVer](https://semver.org/lang/es/).

> Las versiones 1.0.0 a 1.2.0 se reconstruyeron al registrar el repositorio (2026-10-31) a partir
> de las etapas reales del desarrollo de la demo.

## [Sin publicar]

### Cambiado
- **Tema rosa pastel** en la tienda y el panel: acento frambuesa, fondos con lunares, botones en
  píldora, barra lateral del panel en ciruela y fuente Nunito local (`@fontsource-variable/nunito`).
  Los colores quedan centralizados en `frontend/src/theme.js` (`paleta`).
- **Fotos nuevas, más apetitosas**: JPG 4:3 con luz cálida, relieve, chocolate y caramelo brillantes y
  fondo rosa. Reemplazan a las ilustraciones SVG; el catálogo muestra la foto completa en 4:3.
- El catálogo gana un banner de bienvenida y las tarjetas se levantan al pasar el mouse.
- Botón **Salir** visible en el encabezado de la tienda cuando hay sesión de cliente (antes solo
  estaba dentro del menú de la cuenta). Las pantallas de ingreso, registro y el login de
  administración ganan una **X** para salir, y el login de administración un botón **Salir**.
- El seed apunta a `/galletas/*.jpg`; la foto de respaldo (`placeholder.svg`) también es rosa.

### Añadido
- **Descripción y receta de cada galleta**: nueva descripción para las 10 galletas y la lista de
  ingredientes, modelada en 3FN con `ingredientes` y la tabla asociativa `galleta_ingrediente`
  (N:M, con `posicion`), más el alérgeno de cada ingrediente. Migración
  `20261114163000_ingredientes` (solo agrega tablas).
- La tienda muestra la descripción en cada tarjeta y una ficha ("Ver ingredientes") con foto,
  ingredientes en orden, alérgenos resumidos y agregar al carrito. El logo de la tienda es
  ahora la imagen de marca (`logo.webp`).
- Inventario: campo **Ingredientes** (etiquetas con sugerencias) para editar la receta; los
  ingredientes nuevos se crean al guardar.
- API: `GET /api/ingredientes`; `GET /api/galletas` devuelve `ingredientes` y `alergenos`;
  `POST`/`PUT /api/galletas` aceptan `ingredientes` (lista de nombres, en orden).
- `npm run db:recetas`: carga descripciones e ingredientes en una BD existente sin borrar nada
  (el seed también lo aplica).
- `tools/generar-fotos/`: render procedural (Node, sin servicios externos) que genera las fotos.

## [1.3.0] - 2026-10-31

### Añadido
- **Cuentas de cliente** (`/registro` e `/ingresar`) con menú de perfil estilo Mercado Libre:
  *Ingresar* y *Crear cuenta* sin sesión; *Mis compras*, *Mi perfil* y *Salir* con sesión.
- **Compra como invitado** conservada: la cuenta es opcional y ambos formularios ofrecen
  *Continuar como invitado*. Con sesión, el checkout llega pre-rellenado y el pedido se asocia
  siempre al cliente de la sesión.
- Si un invitado compra con un correo que ya tiene cuenta, la tienda pide ingresar
  (`409 CUENTA_EXISTE`) en lugar de crear el pedido.
- **Login de administrador** en `/admin/login`, sin registro público, con guard en el panel y
  *Salir*. El backend protege las rutas de administración (responde `401` sin cookie válida).
- Tablas `cuentas` (1:1 opcional con `clientes`) y `administradores`, con la migración
  `20261031160308_autenticacion`.
- Sesiones sin tabla en la base de datos: token firmado con HMAC-SHA256 en cookie `HttpOnly`
  (`sesion_cliente` 7 días, `sesion_admin` 8 horas); contraseñas con `scrypt`.
- API: `/api/auth/registro`, `/api/auth/ingresar`, `/api/auth/salir`, `/api/auth/me`,
  `/api/auth/perfil`, `/api/auth/compras`, `/api/admin/auth/login`, `/api/admin/auth/logout` y
  `/api/admin/auth/me`.
- Script `npm run admin:crear` (no borra datos) que crea/actualiza el administrador de demo desde
  `backend/.env`; variables `SESSION_SECRET`, `ADMIN_USUARIO`, `ADMIN_PASSWORD` y `ADMIN_NOMBRE`.
- Páginas *Mis compras* y *Mi perfil* para clientes con sesión.

### Cambiado
- CORS con `credentials: true` para que el frontend envíe las cookies de sesión.
- El seed borra `cuentas` antes de `clientes` y conserva los administradores existentes.
- El README documenta las cuentas, el administrador de demo (solo para demo), las rutas
  protegidas y la limitación de no verificar el correo.

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
