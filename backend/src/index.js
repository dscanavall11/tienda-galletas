require('dotenv').config();
const express = require('express');
const cors = require('cors');

const categoriasRouter = require('./routes/categorias');
const galletasRouter = require('./routes/galletas');
const ingredientesRouter = require('./routes/ingredientes');
const clientesRouter = require('./routes/clientes');
const pedidosRouter = require('./routes/pedidos');
const authRouter = require('./routes/auth');
const adminAuthRouter = require('./routes/adminAuth');

const app = express();
// credentials: el frontend envía las cookies HttpOnly de sesión. Con el proxy
// de Vite la petición es del mismo origen; esto cubre el caso de API_URL
// apuntando directo al backend.
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

app.get('/api/health', (req, res) => res.json({ ok: true }));
app.use('/api/auth', authRouter);
app.use('/api/admin/auth', adminAuthRouter);
app.use('/api/categorias', categoriasRouter);
app.use('/api/galletas', galletasRouter);
app.use('/api/ingredientes', ingredientesRouter);
app.use('/api/clientes', clientesRouter);
app.use('/api/pedidos', pedidosRouter);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`API tienda-galletas escuchando en http://localhost:${PORT}`);
});

// Red de seguridad: en Express 4 un error async no capturado en una ruta
// tumba todo el proceso. Si algo se escapa de los try/catch de las rutas,
// esto evita que la demo entera se caiga por una sola peticion mala.
process.on('unhandledRejection', (err) => {
  console.error('unhandledRejection (peticion ignorada, servidor sigue vivo):', err);
});
