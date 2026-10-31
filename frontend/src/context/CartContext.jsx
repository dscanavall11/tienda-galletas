import { createContext, useContext, useEffect, useMemo, useReducer } from 'react';

const CartContext = createContext(null);
const STORAGE_KEY = 'tienda-galletas-cart';

function loadInitial() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function reducer(state, action) {
  switch (action.type) {
    case 'ADD': {
      const { galleta, cantidad } = action;
      const existente = state.find((i) => i.galletaId === galleta.id);
      if (existente) {
        return state.map((i) =>
          i.galletaId === galleta.id
            ? { ...i, cantidad: Math.min(i.cantidad + cantidad, galleta.stock) }
            : i
        );
      }
      return [
        ...state,
        {
          galletaId: galleta.id,
          nombre: galleta.nombre,
          precio: galleta.precio,
          fotoUrl: galleta.fotoUrl,
          stockDisponible: galleta.stock,
          cantidad: Math.min(cantidad, galleta.stock),
        },
      ];
    }
    case 'SET_QTY':
      return state
        .map((i) => (i.galletaId === action.galletaId ? { ...i, cantidad: action.cantidad } : i))
        .filter((i) => i.cantidad > 0);
    case 'REMOVE':
      return state.filter((i) => i.galletaId !== action.galletaId);
    case 'CLEAR':
      return [];
    default:
      return state;
  }
}

export function CartProvider({ children }) {
  const [items, dispatch] = useReducer(reducer, undefined, loadInitial);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const total = useMemo(() => items.reduce((sum, i) => sum + i.precio * i.cantidad, 0), [items]);
  const count = useMemo(() => items.reduce((sum, i) => sum + i.cantidad, 0), [items]);

  const value = {
    items,
    total,
    count,
    addItem: (galleta, cantidad = 1) => dispatch({ type: 'ADD', galleta, cantidad }),
    setQty: (galletaId, cantidad) => dispatch({ type: 'SET_QTY', galletaId, cantidad }),
    removeItem: (galletaId) => dispatch({ type: 'REMOVE', galletaId }),
    clear: () => dispatch({ type: 'CLEAR' }),
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart debe usarse dentro de <CartProvider>');
  return ctx;
}
