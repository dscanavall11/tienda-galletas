import { useEffect, useState } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Layout, Menu, Button } from 'antd'
import {
  DashboardOutlined,
  AppstoreOutlined,
  TagsOutlined,
  TeamOutlined,
  FileTextOutlined,
  OrderedListOutlined,
  ShopOutlined,
} from '@ant-design/icons'

const { Sider, Header, Content } = Layout

const items = [
  { key: '/admin', icon: <DashboardOutlined />, label: <Link to="/admin">Resumen</Link> },
  { key: '/admin/cola', icon: <OrderedListOutlined />, label: <Link to="/admin/cola">Cola de pedidos</Link> },
  { key: '/admin/inventario', icon: <AppstoreOutlined />, label: <Link to="/admin/inventario">Inventario</Link> },
  { key: '/admin/categorias', icon: <TagsOutlined />, label: <Link to="/admin/categorias">Categorías</Link> },
  { key: '/admin/clientes', icon: <TeamOutlined />, label: <Link to="/admin/clientes">Clientes</Link> },
  { key: '/admin/pedidos', icon: <FileTextOutlined />, label: <Link to="/admin/pedidos">Pedidos y facturas</Link> },
]

// Cara de administración: barra lateral + panel. Sin login (demo académica).
export default function AdminLayout() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const [colapsado, setColapsado] = useState(false)

  // Ver una factura desde el panel resalta "Pedidos y facturas".
  const selectedKey = pathname.startsWith('/admin/facturas') ? '/admin/pedidos' : pathname.replace(/\/$/, '')

  useEffect(() => {
    const anterior = document.title
    document.title = 'Administración · Tienda de Galletas'
    return () => {
      document.title = anterior
    }
  }, [])

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {/* En pantallas chicas se colapsa a un riel de iconos (también se puede
          plegar a mano con el botón inferior). */}
      <Sider
        collapsible
        breakpoint="lg"
        collapsed={colapsado}
        onCollapse={setColapsado}
        collapsedWidth={64}
        width={230}
        style={{ position: 'sticky', top: 0, height: '100vh', alignSelf: 'flex-start' }}
      >
        <div className="admin-brand">
          {colapsado ? (
            'TG'
          ) : (
            <>
              Tienda de Galletas
              <small>Panel de administración</small>
            </>
          )}
        </div>
        <Menu theme="dark" mode="inline" selectedKeys={[selectedKey]} items={items} />
      </Sider>
      <Layout>
        <Header
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            background: '#ffffff',
            borderBottom: '1px solid #dadce0',
            paddingInline: 24,
          }}
        >
          <Button icon={<ShopOutlined />} onClick={() => navigate('/')}>
            Ver tienda
          </Button>
        </Header>
        <Content style={{ padding: 24 }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  )
}
