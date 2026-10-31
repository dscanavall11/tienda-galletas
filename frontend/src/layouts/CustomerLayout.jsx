import { Link, Outlet, useLocation } from 'react-router-dom'
import { Layout, Menu, Badge } from 'antd'
import { ShopOutlined, ShoppingCartOutlined } from '@ant-design/icons'
import { useCart } from '../context/CartContext.jsx'

const { Header, Content, Footer } = Layout

// Cara pública: lo que ve el cliente al comprar. El menú no muestra nada de
// administración; solo hay un acceso discreto en el pie de página.
export default function CustomerLayout() {
  const { pathname } = useLocation()
  const { count } = useCart()

  const items = [
    { key: '/', icon: <ShopOutlined />, label: <Link to="/">Catálogo</Link> },
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

  // El checkout cuelga del carrito; la factura no pertenece a ningún ítem.
  const selectedKey = pathname.startsWith('/checkout') ? '/carrito' : pathname.startsWith('/factura') ? '' : pathname

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
        <Link to="/" style={{ fontWeight: 600, fontSize: 18, color: '#202124', marginRight: 32, whiteSpace: 'nowrap' }}>
          Tienda de Galletas
        </Link>
        <Menu
          mode="horizontal"
          selectedKeys={[selectedKey]}
          items={items}
          style={{ flex: 1, minWidth: 0, borderBottom: 'none' }}
        />
      </Header>
      <Content style={{ padding: 24, maxWidth: 1100, margin: '0 auto', width: '100%' }}>
        <Outlet />
      </Content>
      <Footer className="no-print" style={{ textAlign: 'center', color: '#5f6368', background: '#f1f3f4' }}>
        Demo académica — Tienda de Galletas · <Link to="/admin">Administración</Link>
      </Footer>
    </Layout>
  )
}
