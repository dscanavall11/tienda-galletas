import { useEffect, useState } from 'react'
import { Card, Row, Col, Tag, InputNumber, Button, Spin, Empty, message } from 'antd'
import { ShoppingCartOutlined } from '@ant-design/icons'
import { api } from '../api.js'
import { useCart } from '../context/CartContext.jsx'

const currency = (n) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n)

export default function Catalogo() {
  const [galletas, setGalletas] = useState([])
  const [loading, setLoading] = useState(true)
  const [cantidades, setCantidades] = useState({})
  const { addItem } = useCart()

  useEffect(() => {
    api
      .getGalletas({ activa: 'true' })
      .then(setGalletas)
      .catch((e) => message.error(e.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <Spin size="large" style={{ display: 'block', marginTop: 80 }} />
  if (!galletas.length) return <Empty description="No hay galletas disponibles" />

  return (
    <Row gutter={[16, 16]}>
      {galletas.map((g) => {
        const sinStock = g.stock === 0
        const cantidad = cantidades[g.id] ?? 1
        return (
          <Col xs={24} sm={12} md={8} key={g.id}>
            <Card
              hoverable
              cover={<img alt={g.nombre} src={g.fotoUrl} style={{ height: 180, objectFit: 'cover' }} />}
              actions={[
                <div
                  key="add"
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '0 12px' }}
                >
                  <InputNumber
                    min={1}
                    max={Math.max(g.stock, 1)}
                    value={cantidad}
                    disabled={sinStock}
                    onChange={(v) => setCantidades((c) => ({ ...c, [g.id]: v || 1 }))}
                    size="small"
                    style={{ width: 64 }}
                  />
                  <Button
                    type="primary"
                    icon={<ShoppingCartOutlined />}
                    disabled={sinStock}
                    onClick={() => {
                      addItem(g, cantidad)
                      message.success(`${g.nombre} agregada al carrito`)
                    }}
                  >
                    Agregar
                  </Button>
                </div>,
              ]}
            >
              <Card.Meta
                title={g.nombre}
                description={
                  <>
                    <div style={{ minHeight: 40, color: '#5f6368' }}>{g.descripcion}</div>
                    <Tag style={{ marginTop: 8 }}>{g.categoria?.nombre}</Tag>
                    <div style={{ marginTop: 8, fontSize: 16, fontWeight: 600, color: '#202124' }}>
                      {currency(g.precio)}
                    </div>
                    <div style={{ color: sinStock ? '#d93025' : '#5f6368', fontSize: 12 }}>
                      {sinStock ? 'Sin stock' : `Stock disponible: ${g.stock}`}
                    </div>
                  </>
                }
              />
            </Card>
          </Col>
        )
      })}
    </Row>
  )
}
