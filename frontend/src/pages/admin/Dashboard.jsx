import { useEffect, useMemo, useState } from 'react'
import { Row, Col, Card, Statistic, Table, Tag, Typography, message } from 'antd'
import { Link } from 'react-router-dom'
import { api } from '../../api.js'
import { currency, fechaHora } from '../../format.js'

// Una galleta activa con este stock o menos aparece en "Stock bajo".
const STOCK_BAJO = 10

export default function Dashboard() {
  const [galletas, setGalletas] = useState([])
  const [pedidos, setPedidos] = useState([])
  const [clientes, setClientes] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([api.getGalletas(), api.getPedidos(), api.getClientes()])
      .then(([g, p, c]) => {
        setGalletas(g)
        setPedidos(p)
        setClientes(c)
      })
      .catch((e) => message.error(e.message))
      .finally(() => setLoading(false))
  }, [])

  const resumen = useMemo(
    () => ({
      activas: galletas.filter((g) => g.activa).length,
      unidades: galletas.reduce((suma, g) => suma + g.stock, 0),
      ventas: pedidos.reduce((suma, p) => suma + (p.factura?.total ?? 0), 0),
    }),
    [galletas, pedidos]
  )

  const stockBajo = galletas.filter((g) => g.activa && g.stock <= STOCK_BAJO).sort((a, b) => a.stock - b.stock)

  const estadisticas = [
    { titulo: 'Galletas activas', valor: resumen.activas },
    { titulo: 'Unidades en stock', valor: resumen.unidades },
    { titulo: 'Pedidos', valor: pedidos.length },
    { titulo: 'Clientes', valor: clientes.length },
    { titulo: 'Ventas totales', valor: resumen.ventas, formato: currency },
  ]

  return (
    <>
      <Typography.Title level={3}>Resumen</Typography.Title>
      <Row gutter={[16, 16]}>
        {estadisticas.map((e) => (
          <Col key={e.titulo} flex="1 1 170px">
            <Card>
              <Statistic
                title={e.titulo}
                value={e.valor}
                formatter={e.formato ? (v) => e.formato(v) : undefined}
                loading={loading}
              />
            </Card>
          </Col>
        ))}
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={12}>
          <Card title="Stock bajo" extra={<Link to="/admin/inventario">Ir al inventario</Link>}>
            <Table
              size="small"
              rowKey="id"
              loading={loading}
              dataSource={stockBajo}
              pagination={false}
              locale={{ emptyText: 'Todo el inventario tiene stock suficiente' }}
              columns={[
                { title: 'Galleta', dataIndex: 'nombre' },
                { title: 'Categoría', dataIndex: ['categoria', 'nombre'] },
                {
                  title: 'Stock',
                  dataIndex: 'stock',
                  render: (s) => (s === 0 ? <Tag color="error">Sin stock</Tag> : <Tag>{s} u.</Tag>),
                },
              ]}
            />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="Últimos pedidos" extra={<Link to="/admin/pedidos">Ver todos</Link>}>
            <Table
              size="small"
              rowKey="id"
              loading={loading}
              dataSource={pedidos.slice(0, 5)}
              pagination={false}
              locale={{ emptyText: 'Aún no hay pedidos' }}
              columns={[
                {
                  title: 'N° Factura',
                  render: (_, p) => <Link to={`/admin/facturas/${p.id}`}>{p.factura?.numero}</Link>,
                },
                { title: 'Cliente', dataIndex: ['cliente', 'nombre'] },
                { title: 'Fecha', dataIndex: 'fecha', render: fechaHora },
                { title: 'Total', dataIndex: ['factura', 'total'], render: currency },
              ]}
            />
          </Card>
        </Col>
      </Row>
    </>
  )
}
