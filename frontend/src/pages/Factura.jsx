import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Descriptions, Table, Typography, Button, Spin, Result } from 'antd'
import { PrinterOutlined } from '@ant-design/icons'
import { api } from '../api.js'

const currency = (n) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n)

export default function Factura() {
  const { id } = useParams()
  const [pedido, setPedido] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    api
      .getPedido(id)
      .then(setPedido)
      .catch((e) => setError(e.message))
  }, [id])

  if (error) return <Result status="404" title="Factura no encontrada" subTitle={error} />
  if (!pedido) return <Spin size="large" style={{ display: 'block', marginTop: 80 }} />

  const columns = [
    { title: 'Galleta', dataIndex: ['galleta', 'nombre'] },
    { title: 'Cantidad', dataIndex: 'cantidad' },
    { title: 'Precio unit.', dataIndex: 'precioUnitario', render: currency },
    { title: 'Subtotal', render: (_, row) => currency(row.precioUnitario * row.cantidad) },
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography.Title level={3}>Factura {pedido.factura?.numero}</Typography.Title>
        <Button className="no-print" icon={<PrinterOutlined />} onClick={() => window.print()}>
          Imprimir / Guardar PDF
        </Button>
      </div>
      <Descriptions bordered column={2} size="small" style={{ marginBottom: 24 }}>
        <Descriptions.Item label="Cliente">{pedido.cliente.nombre}</Descriptions.Item>
        <Descriptions.Item label="Email">{pedido.cliente.email}</Descriptions.Item>
        <Descriptions.Item label="Teléfono">{pedido.cliente.telefono || '-'}</Descriptions.Item>
        <Descriptions.Item label="Documento">{pedido.cliente.documento || '-'}</Descriptions.Item>
        <Descriptions.Item label="Dirección" span={2}>
          {pedido.cliente.direccion || '-'}
        </Descriptions.Item>
        <Descriptions.Item label="Fecha">
          {new Date(pedido.factura?.fechaEmision || pedido.fecha).toLocaleString('es-CO')}
        </Descriptions.Item>
        <Descriptions.Item label="Estado">{pedido.estado}</Descriptions.Item>
      </Descriptions>
      <Table rowKey="id" dataSource={pedido.detalles} columns={columns} pagination={false} />
      <div style={{ marginTop: 16, textAlign: 'right' }}>
        <div>Subtotal: {currency(pedido.factura?.subtotal)}</div>
        <div>IVA (19%): {currency(pedido.factura?.impuesto)}</div>
        <div style={{ fontSize: 18, fontWeight: 700 }}>Total: {currency(pedido.factura?.total)}</div>
      </div>
    </div>
  )
}
