import { useEffect, useState } from 'react'
import { Form, Input, Button, Typography, Card, Flex, Alert, Modal, Spin, message } from 'antd'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api.js'
import { useCart } from '../context/CartContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { currency } from '../format.js'
import { paleta } from '../theme.js'

export default function Checkout() {
  const { items, total, clear } = useCart()
  const { cliente, cargando } = useAuth()
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    // Solo valida al entrar a /checkout con el carrito vacio. No debe re-
    // ejecutarse cuando el carrito se vacia POR la compra exitosa (ver
    // onFinish), o compite con la navegacion a /factura y gana la carrera.
    if (!items.length) navigate('/carrito', { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Con sesión, el checkout viene prellenado con el perfil de la cuenta.
  useEffect(() => {
    if (!cliente) return
    form.setFieldsValue({
      nombre: cliente.nombre,
      email: cliente.email,
      telefono: cliente.telefono,
      documento: cliente.documento,
      direccion: cliente.direccion,
    })
  }, [cliente, form])

  if (!items.length) return null

  // Mientras se resuelve la sesión no mostramos el formulario vacío: si hay
  // cuenta, el prellenado llega en cuanto responde /api/auth/me.
  if (cargando) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
        <Spin size="large" />
      </div>
    )
  }

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
      // Un invitado no puede usar el correo de una cuenta registrada: se le
      // pide ingresar (o cambiar de correo y seguir como invitado).
      if (e.codigo === 'CUENTA_EXISTE') {
        Modal.confirm({
          title: 'Ese correo ya tiene una cuenta',
          content:
            'Para comprar con este correo, ingresa a tu cuenta. También puedes volver, cambiar el correo y seguir como invitado.',
          okText: 'Ingresar',
          cancelText: 'Usar otro correo',
          onOk: () =>
            navigate('/ingresar', {
              state: { from: '/checkout', email: values.email, motivo: 'cuenta-existe' },
            }),
        })
        return
      }
      message.error(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
      <div style={{ flex: 1, minWidth: 320 }}>
        <Typography.Title level={3}>Datos del cliente</Typography.Title>
        {cliente ? (
          <Alert
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
            title={`Comprando como ${cliente.nombre}`}
            description="Estos datos vienen de tu cuenta. Puedes ajustar la dirección o el teléfono para este pedido."
          />
        ) : (
          <Typography.Paragraph type="secondary">
            ¿Tienes cuenta? <Link to="/ingresar" state={{ from: '/checkout' }}>Ingresa</Link> para tener
            el checkout prellenado. También puedes comprar como invitado.
          </Typography.Paragraph>
        )}
        <Form form={form} layout="vertical" onFinish={onFinish} requiredMark={false}>
          <Form.Item name="nombre" label="Nombre completo" rules={[{ required: true, message: 'Ingresa tu nombre' }]}>
            <Input placeholder="Ana Pérez" />
          </Form.Item>
          <Form.Item
            name="email"
            label="Correo electrónico"
            rules={[{ required: true, type: 'email', message: 'Ingresa un correo válido' }]}
          >
            <Input placeholder="ana@correo.com" disabled={!!cliente} />
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
            style={{ borderTop: `1px solid ${paleta.borde}`, marginTop: 8, paddingTop: 8, fontWeight: 600 }}
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
