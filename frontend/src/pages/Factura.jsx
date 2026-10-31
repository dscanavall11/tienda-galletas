import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { Alert, Descriptions, Table, Typography, Button, Flex, Space, Spin, Result } from 'antd'
import { PrinterOutlined } from '@ant-design/icons'
import { api } from '../api.js'
import { currency, fechaHora } from '../format.js'

// La misma factura se ve en las dos caras: /factura/:id (cliente) y
// /admin/facturas/:id (panel). Solo cambia a dónde lleva el botón de volver.
export default function Factura() {
  const { id } = useParams()
  const { pathname, state } = useLocation()
  const navigate = useNavigate()
  const esAdmin = pathname.startsWith('/admin')
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
      {state?.nueva && (
        <Alert
          className="no-print"
          type="success"
          showIcon
          style={{ marginBottom: 16 }}
          title="¡Gracias por tu compra!"
          description="Tu pedido quedó registrado. Esta es tu factura; puedes imprimirla o guardarla en PDF."
        />
      )}
      <Flex justify="space-between" align="center" wrap gap="small">
        <Typography.Title level={3}>Factura {pedido.factura?.numero}</Typography.Title>
        <Space className="no-print">
          <Button onClick={() => navigate(esAdmin ? '/admin/pedidos' : '/')}>
            {esAdmin ? 'Volver a pedidos' : 'Seguir comprando'}
          </Button>
          <Button icon={<PrinterOutlined />} onClick={() => window.print()}>
            Imprimir / Guardar PDF
          </Button>
        </Space>
      </Flex>
      <Descriptions bordered column={2} size="small" style={{ marginBottom: 24 }}>
        <Descriptions.Item label="Cliente">{pedido.cliente.nombre}</Descriptions.Item>
        <Descriptions.Item label="Email">{pedido.cliente.email}</Descriptions.Item>
        <Descriptions.Item label="Teléfono">{pedido.cliente.telefono || '-'}</Descriptions.Item>
        <Descriptions.Item label="Documento">{pedido.cliente.documento || '-'}</Descriptions.Item>
        <Descriptions.Item label="Dirección" span={2}>
          {pedido.cliente.direccion || '-'}
        </Descriptions.Item>
        <Descriptions.Item label="Fecha">{fechaHora(pedido.factura?.fechaEmision || pedido.fecha)}</Descriptions.Item>
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
