import { useEffect, useState } from 'react'
import { Form, Input, Button, Typography, Card, Flex, message } from 'antd'
import { useNavigate } from 'react-router-dom'
import { api } from '../api.js'
import { useCart } from '../context/CartContext.jsx'
import { currency } from '../format.js'

export default function Checkout() {
  const { items, total, clear } = useCart()
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    // Solo valida al entrar a /checkout con el carrito vacio. No debe re-
    // ejecutarse cuando el carrito se vacia POR la compra exitosa (ver
    // onFinish), o compite con la navegacion a /factura y gana la carrera.
    if (!items.length) navigate('/carrito', { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!items.length) return null

  const onFinish = async (values) => {
    setLoading(true)
    try {
      const pedido = await api.crearPedido({
        cliente: values,
        items: items.map((i) => ({ galletaId: i.galletaId, cantidad: i.cantidad })),
      })
      message.success('¡Compra confirmada!')
      navigate(`/factura/${pedido.id}`, { state: { nueva: true } })
      clear()
    } catch (e) {
      message.error(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
      <div style={{ flex: 1, minWidth: 320 }}>
        <Typography.Title level={3}>Datos del cliente</Typography.Title>
        <Form layout="vertical" onFinish={onFinish} requiredMark={false}>
          <Form.Item name="nombre" label="Nombre completo" rules={[{ required: true, message: 'Ingresa tu nombre' }]}>
            <Input placeholder="Ana Pérez" />
          </Form.Item>
          <Form.Item
            name="email"
            label="Correo electrónico"
            rules={[{ required: true, type: 'email', message: 'Ingresa un correo válido' }]}
          >
            <Input placeholder="ana@correo.com" />
          </Form.Item>
          <Form.Item name="telefono" label="Teléfono">
            <Input placeholder="3001234567" />
          </Form.Item>
          <Form.Item name="documento" label="Documento de identidad">
            <Input placeholder="CC 123456789" />
          </Form.Item>
          <Form.Item name="direccion" label="Dirección de entrega">
            <Input placeholder="Calle 123 # 45-67" />
          </Form.Item>
          <Button type="primary" htmlType="submit" size="large" loading={loading} block>
            Confirmar compra
          </Button>
        </Form>
      </div>
      <div style={{ width: 320, maxWidth: '100%' }}>
        <Card size="small" title="Resumen del pedido">
          {items.map((i) => (
            <Flex key={i.galletaId} justify="space-between" gap="small" style={{ padding: '6px 0' }}>
              <span>
                {i.nombre} × {i.cantidad}
              </span>
              <span>{currency(i.precio * i.cantidad)}</span>
            </Flex>
          ))}
          <Flex
            justify="space-between"
            style={{ borderTop: '1px solid #dadce0', marginTop: 8, paddingTop: 8, fontWeight: 600 }}
          >
            <span>Total</span>
            <span>{currency(total)}</span>
          </Flex>
        </Card>
        <Button type="link" onClick={() => navigate('/carrito')} style={{ paddingInline: 0 }}>
          Volver al carrito
        </Button>
      </div>
    </div>
  )
}
