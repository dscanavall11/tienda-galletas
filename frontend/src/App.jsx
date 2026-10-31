import { Routes, Route, Navigate } from 'react-router-dom'
import CustomerLayout from './layouts/CustomerLayout.jsx'
import AdminLayout from './layouts/AdminLayout.jsx'
import Catalogo from './pages/Catalogo.jsx'
import Carrito from './pages/Carrito.jsx'
import Checkout from './pages/Checkout.jsx'
import Factura from './pages/Factura.jsx'
import Dashboard from './pages/admin/Dashboard.jsx'
import Inventario from './pages/admin/Inventario.jsx'
import Categorias from './pages/admin/Categorias.jsx'
import Clientes from './pages/admin/Clientes.jsx'
import Pedidos from './pages/admin/Pedidos.jsx'

// Dos caras en una sola app: la tienda para clientes en "/" y el panel de
// administración en "/admin". Cada una tiene su propio layout y navegación.
export default function App() {
  return (
    <Routes>
      <Route element={<CustomerLayout />}>
        <Route index element={<Catalogo />} />
        <Route path="carrito" element={<Carrito />} />
        <Route path="checkout" element={<Checkout />} />
        <Route path="factura/:id" element={<Factura />} />
      </Route>
      <Route path="admin" element={<AdminLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="inventario" element={<Inventario />} />
        <Route path="categorias" element={<Categorias />} />
        <Route path="clientes" element={<Clientes />} />
        <Route path="pedidos" element={<Pedidos />} />
        <Route path="facturas/:id" element={<Factura />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
