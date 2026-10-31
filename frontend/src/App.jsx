import { Routes, Route, Link, useLocation } from 'react-router-dom'
import { Layout, Menu, Badge } from 'antd'
import { ShopOutlined, ShoppingCartOutlined } from '@ant-design/icons'
import Catalogo from './pages/Catalogo.jsx'
import Carrito from './pages/Carrito.jsx'
import Checkout from './pages/Checkout.jsx'
import Factura from './pages/Factura.jsx'
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
  ]

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
        <Menu mode="horizontal" selectedKeys={[location.pathname]} items={items} style={{ flex: 1, borderBottom: 'none' }} />
      </Header>
      <Content style={{ padding: 24, maxWidth: 1100, margin: '0 auto', width: '100%' }}>
        <Routes>
          <Route path="/" element={<Catalogo />} />
          <Route path="/carrito" element={<Carrito />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/factura/:id" element={<Factura />} />
        </Routes>
      </Content>
      <Footer className="no-print" style={{ textAlign: 'center', color: '#5f6368', background: '#f1f3f4' }}>
        Demo académica — Tienda de Galletas · Node.js + Vite + React + Ant Design
      </Footer>
    </Layout>
  )
}
