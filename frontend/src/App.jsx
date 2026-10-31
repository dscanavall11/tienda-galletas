import { Routes, Route, Link, useLocation } from 'react-router-dom'
import { Layout, Menu, Badge } from 'antd'
import { ShopOutlined, ShoppingCartOutlined, SettingOutlined } from '@ant-design/icons'
import Catalogo from './pages/Catalogo.jsx'
import Carrito from './pages/Carrito.jsx'
import Checkout from './pages/Checkout.jsx'
import Factura from './pages/Factura.jsx'
import Inventario from './pages/admin/Inventario.jsx'
import Categorias from './pages/admin/Categorias.jsx'
import Pedidos from './pages/admin/Pedidos.jsx'
import { useCart } from './context/CartContext.jsx'

const { Header, Content, Footer } = Layout

export default function App() {
  const location = useLocation()
  const { count } = useCart()

  const items = [
    { key: '/', icon: <ShopOutlined />, label: <Link to="/">Tienda</Link> },
    {
      key: '/carrito',
      icon: (
        <Badge count={count} size="small" offset={[6, -2]}>
          <ShoppingCartOutlined />
        </Badge>
      ),
      label: <Link to="/carrito">Carrito</Link>,
    },
    {
      key: 'admin',
      icon: <SettingOutlined />,
      label: 'Administración',
      children: [
        { key: '/admin/inventario', label: <Link to="/admin/inventario">Inventario</Link> },
        { key: '/admin/categorias', label: <Link to="/admin/categorias">Categorías</Link> },
        { key: '/admin/pedidos', label: <Link to="/admin/pedidos">Pedidos y facturas</Link> },
      ],
    },
  ]

  const selectedKey = location.pathname.startsWith('/admin') ? location.pathname : location.pathname

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header
        style={{
          display: 'flex',
          alignItems: 'center',
          background: '#ffffff',
          borderBottom: '1px solid #dadce0',
          paddingInline: 24,
        }}
      >
        <div style={{ fontWeight: 600, fontSize: 18, color: '#202124', marginRight: 32, whiteSpace: 'nowrap' }}>
          Tienda de Galletas
        </div>
        <Menu mode="horizontal" selectedKeys={[selectedKey]} items={items} style={{ flex: 1, borderBottom: 'none' }} />
      </Header>
      <Content style={{ padding: 24, maxWidth: 1100, margin: '0 auto', width: '100%' }}>
        <Routes>
          <Route path="/" element={<Catalogo />} />
          <Route path="/carrito" element={<Carrito />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/factura/:id" element={<Factura />} />
          <Route path="/admin/inventario" element={<Inventario />} />
          <Route path="/admin/categorias" element={<Categorias />} />
          <Route path="/admin/pedidos" element={<Pedidos />} />
        </Routes>
      </Content>
      <Footer className="no-print" style={{ textAlign: 'center', color: '#5f6368', background: '#f1f3f4' }}>
        Demo académica — Tienda de Galletas · Node.js + Vite + React + Ant Design
      </Footer>
    </Layout>
  )
}
