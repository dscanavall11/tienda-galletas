import { Table, InputNumber, Button, Empty, Typography, Popconfirm } from 'antd'
import { DeleteOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { useCart } from '../context/CartContext.jsx'

const currency = (n) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n)

export default function Carrito() {
  const { items, total, setQty, removeItem, clear } = useCart()
  const navigate = useNavigate()

  if (!items.length) {
    return (
      <Empty description="Tu carrito está vacío">
        <Button type="primary" onClick={() => navigate('/')}>
          Ver catálogo
        </Button>
      </Empty>
    )
  }

  const columns = [
    { title: 'Galleta', dataIndex: 'nombre' },
    { title: 'Precio unit.', dataIndex: 'precio', render: currency },
    {
      title: 'Cantidad',
      dataIndex: 'cantidad',
      render: (cantidad, row) => (
        <InputNumber min={1} max={row.stockDisponible} value={cantidad} onChange={(v) => setQty(row.galletaId, v || 1)} />
      ),
    },
    { title: 'Subtotal', render: (_, row) => currency(row.precio * row.cantidad) },
    {
      title: '',
      render: (_, row) => (
        <Popconfirm title="¿Quitar del carrito?" onConfirm={() => removeItem(row.galletaId)}>
          <Button danger type="text" icon={<DeleteOutlined />} />
        </Popconfirm>
      ),
    },
  ]

  return (
    <>
      <Typography.Title level={3}>Tu carrito</Typography.Title>
      <Table rowKey="galletaId" dataSource={items} columns={columns} pagination={false} />
      <div style={{ marginTop: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Button onClick={clear}>Vaciar carrito</Button>
        <div style={{ textAlign: 'right' }}>
          <Typography.Text style={{ fontSize: 18 }}>
            Total: <b>{currency(total)}</b>
          </Typography.Text>
          <br />
          <Button type="primary" size="large" style={{ marginTop: 8 }} onClick={() => navigate('/checkout')}>
            Ir a pagar
          </Button>
        </div>
      </div>
    </>
  )
}
