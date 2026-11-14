import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Alert, Button, Card, Divider, Form, Input, Typography, message } from 'antd'
import { CloseOutlined } from '@ant-design/icons'
import { useAuth } from '../context/AuthContext.jsx'

export default function Registro() {
  const { cliente, cargando, registrar } = useAuth()
  const navigate = useNavigate()
  const { state } = useLocation()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const destino = state?.from || '/'

  useEffect(() => {
    if (!cargando && cliente) navigate(destino, { replace: true })
  }, [cargando, cliente, destino, navigate])

  const onFinish = async ({ confirmar: _confirmar, ...values }) => {
    setLoading(true)
    setError(null)
    try {
      await registrar(values)
      message.success('Cuenta creada')
      navigate(destino, { replace: true })
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: 480, margin: '40px auto' }}>
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
          Crear cuenta
        </Typography.Title>
        <Typography.Paragraph type="secondary">
          Es opcional: también puedes comprar como invitado. Con cuenta, tus datos quedan guardados
          para la próxima compra.
        </Typography.Paragraph>

        {error && <Alert type="error" showIcon title={error} style={{ marginBottom: 16 }} />}

        <Form layout="vertical" onFinish={onFinish} requiredMark={false}>
          <Form.Item name="nombre" label="Nombre completo" rules={[{ required: true, message: 'Ingresa tu nombre' }]}>
            <Input autoComplete="name" placeholder="Ana Pérez" />
          </Form.Item>
          <Form.Item
            name="email"
            label="Correo electrónico"
            rules={[{ required: true, type: 'email', message: 'Ingresa un correo válido' }]}
          >
            <Input autoComplete="email" placeholder="ana@correo.com" />
          </Form.Item>
          <Form.Item name="telefono" label="Teléfono (opcional)">
            <Input autoComplete="tel" placeholder="3001234567" />
          </Form.Item>
          <Form.Item name="direccion" label="Dirección de entrega (opcional)">
            <Input autoComplete="street-address" placeholder="Calle 123 # 45-67" />
          </Form.Item>
          <Form.Item
            name="password"
            label="Contraseña"
            rules={[
              { required: true, message: 'Crea una contraseña' },
              { min: 8, message: 'Usa al menos 8 caracteres' },
            ]}
          >
            <Input.Password autoComplete="new-password" placeholder="Al menos 8 caracteres" />
          </Form.Item>
          <Form.Item
            name="confirmar"
            label="Repite la contraseña"
            dependencies={['password']}
            rules={[
              { required: true, message: 'Repite la contraseña' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('password') === value) return Promise.resolve()
                  return Promise.reject(new Error('Las contraseñas no coinciden'))
                },
              }),
            ]}
          >
            <Input.Password autoComplete="new-password" placeholder="Repite la contraseña" />
          </Form.Item>
          <Button type="primary" htmlType="submit" size="large" block loading={loading}>
            Crear cuenta
          </Button>
        </Form>

        <Divider plain>o</Divider>
        <Button block onClick={() => navigate(destino)}>
          Continuar como invitado
        </Button>

        <Typography.Paragraph style={{ marginTop: 16, marginBottom: 0, textAlign: 'center' }}>
          ¿Ya tienes cuenta?{' '}
          <Link to="/ingresar" state={state}>
            Ingresar
          </Link>
        </Typography.Paragraph>
      </Card>
    </div>
  )
}
