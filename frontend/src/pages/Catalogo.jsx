import { useEffect, useMemo, useState } from 'react'
import { Card, Row, Col, Tag, InputNumber, Button, Spin, Empty, Flex, Input, Segmented, Typography, message } from 'antd'
import { ShoppingCartOutlined, SearchOutlined } from '@ant-design/icons'
import { api } from '../api.js'
import { useCart } from '../context/CartContext.jsx'
import { currency } from '../format.js'
import { FOTO_RESPALDO } from '../fotos.js'
import { paleta } from '../theme.js'
import DetalleGalleta from '../components/DetalleGalleta.jsx'

export default function Catalogo() {
  const [galletas, setGalletas] = useState([])
  const [categorias, setCategorias] = useState([])
  const [categoria, setCategoria] = useState('todas')
  const [busqueda, setBusqueda] = useState('')
  const [loading, setLoading] = useState(true)
  const [cantidades, setCantidades] = useState({})
  const [detalle, setDetalle] = useState({ galleta: null, open: false })
  const { addItem } = useCart()

  useEffect(() => {
    Promise.all([api.getGalletas({ activa: 'true' }), api.getCategorias()])
      .then(([g, c]) => {
        setGalletas(g)
        setCategorias(c)
      })
      .catch((e) => message.error(e.message))
      .finally(() => setLoading(false))
  }, [])

  const visibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    return galletas.filter(
      (g) =>
        (categoria === 'todas' || g.categoriaId === categoria) &&
        `${g.nombre} ${g.descripcion ?? ''}`.toLowerCase().includes(q)
    )
  }, [galletas, categoria, busqueda])

  if (loading) return <Spin size="large" style={{ display: 'block', marginTop: 80 }} />
  if (!galletas.length) return <Empty description="No hay galletas disponibles" />

  return (
    <>
      <div
        style={{
          position: 'relative',
          overflow: 'hidden',
          marginBottom: 24,
          padding: '28px 32px',
          borderRadius: 24,
          border: `1px solid ${paleta.borde}`,
          background: 'linear-gradient(120deg, #ffd3e4 0%, #ffe6ef 55%, #fff0e3 100%)',
        }}
      >
        <Typography.Title level={2} style={{ margin: 0, color: paleta.primarioActivo }}>
          Galletas artesanales
        </Typography.Title>
        <Typography.Paragraph style={{ margin: '6px 0 0', maxWidth: 520, color: paleta.textoSecundario }}>
          Elige tus favoritas, agrégalas al carrito y recibe tu factura al instante.
        </Typography.Paragraph>
        <span aria-hidden style={{ position: 'absolute', right: 28, top: 4, fontSize: 84, opacity: 0.35, transform: 'rotate(12deg)' }}>
          🍪
        </span>
        <span aria-hidden style={{ position: 'absolute', right: 130, bottom: -4, fontSize: 40, opacity: 0.4 }}>
          🍓
        </span>
      </div>

      <Flex gap="middle" wrap align="center" justify="space-between" style={{ marginBottom: 24 }}>
        <div style={{ maxWidth: '100%', overflowX: 'auto' }}>
          <Segmented
            value={categoria}
            onChange={setCategoria}
            options={[{ label: 'Todas', value: 'todas' }, ...categorias.map((c) => ({ label: c.nombre, value: c.id }))]}
          />
        </div>
        <Input
          allowClear
          prefix={<SearchOutlined />}
          placeholder="Buscar galleta"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          style={{ width: 260, maxWidth: '100%' }}
        />
      </Flex>

      {!visibles.length ? (
        <Empty description="Ninguna galleta coincide con tu búsqueda" />
      ) : (
        <Row gutter={[16, 16]}>
          {visibles.map((g) => {
            const sinStock = g.stock === 0
            const cantidad = cantidades[g.id] ?? 1
            return (
              <Col xs={24} sm={12} md={8} key={g.id}>
                <Card
                  hoverable
                  cover={
                    <img
                      className="galleta-foto"
                      alt={g.nombre}
                      src={g.fotoUrl}
                      onError={(e) => {
                        e.currentTarget.onerror = null
                        e.currentTarget.src = FOTO_RESPALDO
                      }}
                      onClick={() => setDetalle({ galleta: g, open: true })}
                      style={{ cursor: 'pointer', filter: sinStock ? 'grayscale(1)' : undefined }}
                    />
                  }
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
                        <div className="galleta-desc" style={{ color: paleta.textoSecundario }}>
                          {g.descripcion}
                        </div>
                        <div>
                          <Button
                            type="link"
                            size="small"
                            style={{ paddingInline: 0, height: 'auto' }}
                            onClick={() => setDetalle({ galleta: g, open: true })}
                          >
                            Ver ingredientes
                          </Button>
                        </div>
                        <Tag
                          style={{
                            marginTop: 8,
                            border: 'none',
                            borderRadius: 999,
                            paddingInline: 10,
                            background: paleta.rosaClaro,
                            color: paleta.primarioActivo,
                          }}
                        >
                          {g.categoria?.nombre}
                        </Tag>
                        <div style={{ marginTop: 8, fontSize: 20, fontWeight: 800, color: paleta.primario }}>
                          {currency(g.precio)}
                        </div>
                        <div style={{ color: sinStock ? paleta.error : paleta.textoSecundario, fontSize: 12 }}>
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
      )}

      <DetalleGalleta
        galleta={detalle.galleta}
        open={detalle.open}
        onClose={() => setDetalle((d) => ({ ...d, open: false }))}
        onAgregar={(g, n) => {
          addItem(g, n)
          message.success(`${g.nombre} agregada al carrito`)
        }}
      />
    </>
  )
}
