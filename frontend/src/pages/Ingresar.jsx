import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Alert, Button, Card, Divider, Form, Input, Typography, message } from 'antd'
import { CloseOutlined } from '@ant-design/icons'
import { useAuth } from '../context/AuthContext.jsx'

export default function Ingresar() {
  const { cliente, cargando, ingresar } = useAuth()
  const navigate = useNavigate()
  const { state } = useLocation()
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const destino = state?.from || '/'

  useEffect(() => {
    if (!cargando && cliente) navigate(destino, { replace: true })
  }, [cargando, cliente, destino, navigate])

  // Si venimos del checkout con un correo que ya tiene cuenta, lo dejamos
  // escrito para que solo tenga que poner la contraseña.
  useEffect(() => {
    if (state?.email) form.setFieldsValue({ email: state.email })
  }, [state, form])

  const onFinish = async (values) => {
    setLoading(true)
    setError(null)
    try {
      await ingresar(values)
      message.success('Bienvenido de nuevo')
      navigate(destino, { replace: true })
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: 420, margin: '40px auto' }}>
      <Card>
        <Button
          type="text"
          shape="circle"
          icon={<CloseOutlined />}
          aria-label="Salir"
          title="Salir"
          onClick={() => navigate(destino)}
          style={{ position: 'absolute', top: 12, right: 12 }}
        />
        <Typography.Title level={3} style={{ marginTop: 0 }}>
          Ingresar
        </Typography.Title>
        <Typography.Paragraph type="secondary">
          Entra para ver tus compras y tener el checkout prellenado.
        </Typography.Paragraph>

        {state?.motivo === 'cuenta-existe' && (
          <Alert
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
            title="Ese correo ya tiene una cuenta"
            description="Ingresa para continuar con tu compra. También puedes volver y comprar como invitado con otro correo."
          />
        )}
        {error && <Alert type="error" showIcon title={error} style={{ marginBottom: 16 }} />}

        <Form form={form} layout="vertical" onFinish={onFinish} requiredMark={false}>
          <Form.Item
            name="email"
            label="Correo electrónico"
            rules={[{ required: true, type: 'email', message: 'Ingresa un correo válido' }]}
          >
            <Input autoComplete="email" placeholder="ana@correo.com" />
          </Form.Item>
          <Form.Item name="password" label="Contraseña" rules={[{ required: true, message: 'Ingresa tu contraseña' }]}>
            <Input.Password autoComplete="current-password" placeholder="Tu contraseña" />
          </Form.Item>
          <Button type="primary" htmlType="submit" size="large" block loading={loading}>
            Ingresar
          </Button>
        </Form>

        <Divider plain>o</Divider>
        <Button block onClick={() => navigate(destino)}>
          Continuar como invitado
        </Button>

        <Typography.Paragraph style={{ marginTop: 16, marginBottom: 0, textAlign: 'center' }}>
          ¿No tienes cuenta?{' '}
          <Link to="/registro" state={state}>
            Crear cuenta
          </Link>
        </Typography.Paragraph>
      </Card>
    </div>
  )
}
