import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { Spin } from 'antd'
import CustomerLayout from './layouts/CustomerLayout.jsx'
import AdminLayout from './layouts/AdminLayout.jsx'
import Catalogo from './pages/Catalogo.jsx'
import Carrito from './pages/Carrito.jsx'
import Checkout from './pages/Checkout.jsx'
import Factura from './pages/Factura.jsx'
import Ingresar from './pages/Ingresar.jsx'
import Registro from './pages/Registro.jsx'
import MisCompras from './pages/MisCompras.jsx'
import MiPerfil from './pages/MiPerfil.jsx'
import AdminLogin from './pages/admin/Login.jsx'
import Dashboard from './pages/admin/Dashboard.jsx'
import Cola from './pages/admin/Cola.jsx'
import Inventario from './pages/admin/Inventario.jsx'
import Categorias from './pages/admin/Categorias.jsx'
import Clientes from './pages/admin/Clientes.jsx'
import Pedidos from './pages/admin/Pedidos.jsx'
import Historial from './pages/admin/Historial.jsx'
import { useAuth } from './context/AuthContext.jsx'

// Páginas que exigen sesión de cliente. El backend también las protege; esto
// solo evita mostrar una pantalla vacía a quien llega sin sesión.
function RutaCliente({ children }) {
  const { cliente, cargando } = useAuth()
  const location = useLocation()

  if (cargando) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
        <Spin size="large" />
      </div>
    )
  }
  if (!cliente) return <Navigate to="/ingresar" replace state={{ from: location.pathname }} />
  return children
}

// Dos caras en una sola app: la tienda para clientes en "/" y el panel de
// administración en "/admin". Cada una tiene su propio layout, navegación y
// sesión (cookies separadas).
export default function App() {
  return (
    <Routes>
      <Route element={<CustomerLayout />}>
        <Route index element={<Catalogo />} />
        <Route path="carrito" element={<Carrito />} />
        <Route path="checkout" element={<Checkout />} />
        <Route path="factura/:id" element={<Factura />} />
        <Route path="ingresar" element={<Ingresar />} />
        <Route path="registro" element={<Registro />} />
        <Route
          path="mis-compras"
          element={
            <RutaCliente>
              <MisCompras />
            </RutaCliente>
          }
        />
        <Route
          path="mi-perfil"
          element={
            <RutaCliente>
              <MiPerfil />
            </RutaCliente>
          }
        />
      </Route>
      <Route path="admin/login" element={<AdminLogin />} />
      <Route path="admin" element={<AdminLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="cola" element={<Cola />} />
        <Route path="inventario" element={<Inventario />} />
        <Route path="categorias" element={<Categorias />} />
        <Route path="clientes" element={<Clientes />} />
        <Route path="pedidos" element={<Pedidos />} />
        <Route path="historial" element={<Historial />} />
        <Route path="facturas/:id" element={<Factura />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
