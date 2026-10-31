import { useCallback, useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { Alert, Descriptions, Table, Typography, Button, Flex, Space, Spin, Result, Steps, Timeline } from 'antd'
import { PrinterOutlined } from '@ant-design/icons'
import { api } from '../api.js'
import { currency, fechaHora } from '../format.js'
import TagEstado from '../components/TagEstado.jsx'

const REFRESCO_MS = 5000

// Paso del seguimiento según el estado; ENTREGADO marca todos como completos.
const PASO = { PENDIENTE: 0, EN_PREPARACION: 1, LISTO: 2, ENTREGADO: 4 }
const TERMINALES = ['ENTREGADO', 'CANCELADO']

// La misma factura se ve en las dos caras: /factura/:id (cliente) y
// /admin/facturas/:id (panel). Cambian el botón de volver y el seguimiento:
// el cliente ve en qué punto de la cola va su pedido; la administración ve
// el historial de estados.
export default function Factura() {
  const { id } = useParams()
  const { pathname, state } = useLocation()
  const navigate = useNavigate()
  const esAdmin = pathname.startsWith('/admin')
  const [pedido, setPedido] = useState(null)
  const [error, setError] = useState(null)

  const cargar = useCallback(
    () =>
      api
        .getPedido(id)
        .then(setPedido)
        .catch((e) => setError(e.message)),
    [id]
  )

  useEffect(() => {
    cargar()
  }, [cargar])

  // El cliente ve avanzar su pedido sin recargar mientras siga en curso.
  const enCurso = pedido && !TERMINALES.includes(pedido.estado.codigo)
  useEffect(() => {
    if (esAdmin || !enCurso) return
    const t = setInterval(cargar, REFRESCO_MS)
    return () => clearInterval(t)
  }, [esAdmin, enCurso, cargar])

  if (error) return <Result status="404" title="Factura no encontrada" subTitle={error} />
  if (!pedido) return <Spin size="large" style={{ display: 'block', marginTop: 80 }} />

  const columns = [
    { title: 'Galleta', dataIndex: ['galleta', 'nombre'] },
    { title: 'Cantidad', dataIndex: 'cantidad' },
    { title: 'Precio unit.', dataIndex: 'precioUnitario', render: currency },
    { title: 'Subtotal', render: (_, row) => currency(row.precioUnitario * row.cantidad) },
  ]

  const cancelado = pedido.estado.codigo === 'CANCELADO'

  return (
    <div>
      {state?.nueva && (
        <Alert
          className="no-print"
          type="success"
          showIcon
          style={{ marginBottom: 16 }}
          title="¡Gracias por tu compra!"
          description="Tu pedido quedó registrado y entró a la cola de preparación. Esta es tu factura; puedes imprimirla o guardarla en PDF."
        />
      )}

      {!esAdmin && (
        <div className="no-print" style={{ marginBottom: 16 }}>
          {cancelado ? (
            <Alert type="error" showIcon title="Este pedido fue cancelado" description="Las galletas volvieron al inventario." />
          ) : (
            <>
              <Steps
                size="small"
                current={PASO[pedido.estado.codigo]}
                items={[{ title: 'Recibido' }, { title: 'Preparando' }, { title: 'Listo' }, { title: 'Entregado' }]}
              />
              {pedido.posicionCola && (
                <Typography.Paragraph type="secondary" style={{ marginTop: 12, marginBottom: 0 }}>
                  {pedido.posicionCola === 1
                    ? 'Eres el siguiente en la cola.'
                    : `Hay ${pedido.posicionCola - 1} pedido(s) antes que el tuyo en la cola.`}
                </Typography.Paragraph>
              )}
            </>
          )}
        </div>
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
        <Descriptions.Item label="Estado">
          <TagEstado estado={pedido.estado} />
        </Descriptions.Item>
      </Descriptions>
      <Table rowKey="id" dataSource={pedido.detalles} columns={columns} pagination={false} />
      <div style={{ marginTop: 16, textAlign: 'right' }}>
        <div>Subtotal: {currency(pedido.factura?.subtotal)}</div>
        <div>IVA (19%): {currency(pedido.factura?.impuesto)}</div>
        <div style={{ fontSize: 18, fontWeight: 700 }}>Total: {currency(pedido.factura?.total)}</div>
      </div>

      {esAdmin && (
        <div className="no-print" style={{ marginTop: 24 }}>
          <Typography.Title level={5}>Historial de estados</Typography.Title>
          <Timeline
            items={pedido.historial.map((h) => ({ title: fechaHora(h.fecha), content: h.estado.nombre }))}
          />
        </div>
      )}
    </div>
  )
}
