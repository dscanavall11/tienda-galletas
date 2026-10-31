import { useEffect, useState } from 'react'
import { Table, Tag, Button } from 'antd'
import { Link } from 'react-router-dom'
import { api } from '../../api.js'
import { currency, fechaHora } from '../../format.js'

export default function Pedidos() {
  const [pedidos, setPedidos] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api
      .getPedidos()
      .then(setPedidos)
      .finally(() => setLoading(false))
  }, [])

  const columns = [
    { title: 'N° Factura', dataIndex: ['factura', 'numero'] },
    { title: 'Cliente', dataIndex: ['cliente', 'nombre'] },
    { title: 'Email', dataIndex: ['cliente', 'email'] },
    { title: 'Fecha', dataIndex: 'fecha', render: fechaHora },
    { title: 'Items', render: (_, p) => p.detalles.reduce((s, d) => s + d.cantidad, 0) },
    { title: 'Total', dataIndex: ['factura', 'total'], render: currency },
    { title: 'Estado', dataIndex: 'estado', render: (e) => <Tag color="blue">{e}</Tag> },
    {
      title: '',
      render: (_, p) => (
        <Link to={`/admin/facturas/${p.id}`}>
          <Button size="small">Ver factura</Button>
        </Link>
      ),
    },
  ]

  return (
    <>
      <h2>Pedidos y facturas</h2>
      <Table rowKey="id" loading={loading} dataSource={pedidos} columns={columns} pagination={{ pageSize: 8 }} />
    </>
  )
}
