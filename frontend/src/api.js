const BASE = '/api';

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    // Las sesiones viven en cookies HttpOnly: hay que enviarlas en cada
    // petición para que el backend sepa quién está comprando.
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const error = new Error(data?.error || `Error ${res.status}`);
    error.status = res.status;
    error.codigo = data?.codigo;
    throw error;
  }
  return data;
}

export const api = {
  getCategorias: () => request('/categorias'),
  createCategoria: (nombre) => request('/categorias', { method: 'POST', body: JSON.stringify({ nombre }) }),
  updateCategoria: (id, nombre) => request(`/categorias/${id}`, { method: 'PUT', body: JSON.stringify({ nombre }) }),
  deleteCategoria: (id) => request(`/categorias/${id}`, { method: 'DELETE' }),

  getGalletas: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/galletas${qs ? `?${qs}` : ''}`);
  },
  createGalleta: (payload) => request('/galletas', { method: 'POST', body: JSON.stringify(payload) }),
  updateGalleta: (id, payload) => request(`/galletas/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteGalleta: (id) => request(`/galletas/${id}`, { method: 'DELETE' }),

  getIngredientes: () => request('/ingredientes'),

  getClientes: () => request('/clientes'),
  updateCliente: (id, payload) => request(`/clientes/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),

  getPedidos: () => request('/pedidos'),
  getPedido: (id) => request(`/pedidos/${id}`),
  getCola: () => request('/pedidos/cola'),
  getHistorial: (params = {}) => request(`/pedidos/historial?${new URLSearchParams(params)}`),
  tomarSiguiente: () => request('/pedidos/cola/siguiente', { method: 'POST' }),
  cambiarEstado: (id, estado) => request(`/pedidos/${id}/estado`, { method: 'PATCH', body: JSON.stringify({ estado }) }),
  crearPedido: (payload) => request('/pedidos', { method: 'POST', body: JSON.stringify(payload) }),

  // Sesión de cliente (tienda).
  registrar: (payload) => request('/auth/registro', { method: 'POST', body: JSON.stringify(payload) }),
  ingresar: (payload) => request('/auth/ingresar', { method: 'POST', body: JSON.stringify(payload) }),
  salir: () => request('/auth/salir', { method: 'POST' }),
  me: () => request('/auth/me'),
  misCompras: () => request('/auth/compras'),
  actualizarPerfil: (payload) => request('/auth/perfil', { method: 'PUT', body: JSON.stringify(payload) }),

  // Sesión de administrador (panel), independiente de la del cliente.
  adminLogin: (payload) => request('/admin/auth/login', { method: 'POST', body: JSON.stringify(payload) }),
  adminLogout: () => request('/admin/auth/logout', { method: 'POST' }),
  adminMe: () => request('/admin/auth/me'),
};
