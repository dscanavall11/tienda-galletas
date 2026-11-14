import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Layout, Menu, Badge, Dropdown, Avatar, Button, Grid, message } from 'antd'
import {
  ShopOutlined,
  ShoppingCartOutlined,
  UserOutlined,
  UserAddOutlined,
  LoginOutlined,
  ProfileOutlined,
  ShoppingOutlined,
  LogoutOutlined,
} from '@ant-design/icons'
import { useCart } from '../context/CartContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { paleta } from '../theme.js'

const { Header, Content, Footer } = Layout

// Cara pública: lo que ve el cliente al comprar. El menú no muestra nada de
// administración; solo hay un acceso discreto en el pie de página.
export default function CustomerLayout() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { count } = useCart()
  const { cliente, salir } = useAuth()
  const screens = Grid.useBreakpoint()

  const cerrarSesion = async () => {
    try {
      await salir()
      message.success('Cerraste sesión')
      navigate('/')
    } catch (e) {
      message.error(e.message)
    }
  }

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

  // Estilo Mercado Libre: icono de perfil arriba a la derecha. Invitado ve
  // "Ingresar" y "Crear cuenta"; con sesión, sus compras, perfil y salir.
  const menuCuenta = cliente
    ? {
        items: [
          { key: 'compras', icon: <ShoppingOutlined />, label: <Link to="/mis-compras">Mis compras</Link> },
          { key: 'perfil', icon: <ProfileOutlined />, label: <Link to="/mi-perfil">Mi perfil</Link> },
          { type: 'divider' },
          { key: 'salir', icon: <LogoutOutlined />, label: 'Salir', danger: true },
        ],
        onClick: ({ key }) => {
          if (key === 'salir') cerrarSesion()
        },
      }
    : {
        items: [
          { key: 'ingresar', icon: <LoginOutlined />, label: <Link to="/ingresar">Ingresar</Link> },
          { key: 'registro', icon: <UserAddOutlined />, label: <Link to="/registro">Crear cuenta</Link> },
        ],
      }

  // El checkout cuelga del carrito; la factura y las páginas de cuenta no
  // pertenecen a ningún ítem del menú principal.
  const selectedKey = pathname.startsWith('/checkout')
    ? '/carrito'
    : ['/factura', '/ingresar', '/registro', '/mis-compras', '/mi-perfil'].some((r) => pathname.startsWith(r))
      ? ''
      : pathname

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header
        style={{
          display: 'flex',
          alignItems: 'center',
          background: '#ffffff',
          borderBottom: `1px solid ${paleta.borde}`,
          boxShadow: '0 4px 18px rgba(214, 51, 108, 0.08)',
          paddingInline: 24,
          height: 76,
          lineHeight: '76px',
          position: 'sticky',
          top: 0,
          zIndex: 10,
        }}
      >
        <Link to="/" title="Inicio" style={{ display: 'flex', alignItems: 'center', marginRight: 28 }}>
          <img src="/logo.webp" alt="Galletitas de Amor" width={64} height={64} style={{ display: 'block' }} />
        </Link>
        <Menu
          mode="horizontal"
          selectedKeys={[selectedKey]}
          items={items}
          style={{ flex: 1, minWidth: 0, borderBottom: 'none' }}
        />
        <Dropdown menu={menuCuenta} trigger={['click']} placement="bottomRight">
          <Button
            type="text"
            aria-label="Mi cuenta"
            style={{ display: 'flex', alignItems: 'center', gap: 8, paddingInline: 8, height: 40 }}
          >
            <Avatar size={28} icon={<UserOutlined />} style={{ background: paleta.rosaClaro, color: paleta.primario }} />
            <span style={{ fontSize: 14, fontWeight: 600, color: paleta.texto, whiteSpace: 'nowrap' }}>
              {cliente ? `Hola, ${cliente.nombre.split(' ')[0]}` : 'Mi cuenta'}
            </span>
          </Button>
        </Dropdown>
        {cliente && (
          <Button icon={<LogoutOutlined />} aria-label="Salir" onClick={cerrarSesion} style={{ marginLeft: 8 }}>
            {screens.sm ? 'Salir' : null}
          </Button>
        )}
      </Header>
      <Content style={{ padding: 24, maxWidth: 1100, margin: '0 auto', width: '100%' }}>
        <Outlet />
      </Content>
      <Footer className="no-print" style={{ textAlign: 'center', color: paleta.textoSecundario, background: '#ffe9f1' }}>
        Demo académica — Tienda de Galletas 💗 <Link to="/admin">Administración</Link>
      </Footer>
    </Layout>
  )
}
