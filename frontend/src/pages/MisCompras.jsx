import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button, Card, Empty, Table, Typography, message } from 'antd'
import { api } from '../api.js'
import { currency, fechaHora } from '../format.js'
import TagEstado from '../components/TagEstado.jsx'

export default function MisCompras() {
  const [pedidos, setPedidos] = useState([])
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    let activo = true
    api
      .misCompras()
      .then((data) => {
        if (activo) setPedidos(data)
      })
      .catch((e) => message.error(e.message))
      .finally(() => {
        if (activo) setCargando(false)
      })
    return () => {
      activo = false
    }
  }, [])

  const columns = [
    {
      title: 'Factura',
      render: (_, p) => p.factura?.numero || `Pedido #${p.id}`,
    },
    { title: 'Fecha', dataIndex: 'fecha', render: fechaHora },
    {
      title: 'Artículos',
      render: (_, p) => p.detalles.reduce((sum, d) => sum + d.cantidad, 0),
      align: 'center',
    },
    { title: 'Estado', render: (_, p) => <TagEstado estado={p.estado} /> },
    { title: 'Total', render: (_, p) => currency(p.factura?.total ?? 0), align: 'right' },
    {
      title: '',
      render: (_, p) => (
        <Link to={`/factura/${p.id}`}>
          <Button size="small">Ver factura</Button>
        </Link>
      ),
    },
  ]

  return (
    <div>
      <Typography.Title level={3}>Mis compras</Typography.Title>
      <Card>
        {!cargando && pedidos.length === 0 ? (
          <Empty description="Todavía no tienes compras con esta cuenta">
            <Link to="/">
              <Button type="primary">Ver el catálogo</Button>
            </Link>
          </Empty>
        ) : (
          <Table
            rowKey="id"
            loading={cargando}
            dataSource={pedidos}
            columns={columns}
            pagination={false}
            scroll={{ x: true }}
          />
        )}
      </Card>
    </div>
  )
}
