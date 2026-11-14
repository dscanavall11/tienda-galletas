import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Card, Form, Input, Typography, message } from 'antd'
import { useAuth } from '../context/AuthContext.jsx'

export default function MiPerfil() {
  const { cliente, actualizarPerfil, salir } = useAuth()
  const navigate = useNavigate()
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (cliente) form.setFieldsValue(cliente)
  }, [cliente, form])

  const onFinish = async (values) => {
    setLoading(true)
    try {
      await actualizarPerfil(values)
      message.success('Datos actualizados')
    } catch (e) {
      message.error(e.message)
    } finally {
      setLoading(false)
    }
  }

  const cerrarSesion = async () => {
    try {
      await salir()
      message.success('Cerraste sesión')
      navigate('/')
    } catch (e) {
      message.error(e.message)
    }
  }

  return (
    <div style={{ maxWidth: 520, margin: '0 auto' }}>
      <Typography.Title level={3}>Mi perfil</Typography.Title>
      <Card>
        <Form form={form} layout="vertical" onFinish={onFinish} requiredMark={false}>
          <Form.Item label="Correo electrónico">
            <Input value={cliente?.email} disabled />
          </Form.Item>
          <Form.Item name="nombre" label="Nombre completo" rules={[{ required: true, message: 'Ingresa tu nombre' }]}>
            <Input placeholder="Ana Pérez" />
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
          <Button type="primary" htmlType="submit" loading={loading} block>
            Guardar cambios
          </Button>
        </Form>
      </Card>
      <Button danger type="text" onClick={cerrarSesion} style={{ marginTop: 12 }}>
        Cerrar sesión
      </Button>
    </div>
  )
}
