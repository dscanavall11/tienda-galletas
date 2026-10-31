const BASE = '/api';

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(data?.error || `Error ${res.status}`);
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

  getClientes: () => request('/clientes'),
  updateCliente: (id, payload) => request(`/clientes/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),

  getPedidos: () => request('/pedidos'),
  getPedido: (id) => request(`/pedidos/${id}`),
  crearPedido: (payload) => request('/pedidos', { method: 'POST', body: JSON.stringify(payload) }),
};
