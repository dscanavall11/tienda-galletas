export const currency = (n) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);

export const fechaHora = (f) => new Date(f).toLocaleString('es-CO');
