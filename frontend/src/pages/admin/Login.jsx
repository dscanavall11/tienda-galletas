import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Alert, Button, Card, Form, Input, Typography, message } from 'antd'
import { ArrowLeftOutlined, CloseOutlined, LockOutlined, UserOutlined } from '@ant-design/icons'
import { useAdminAuth } from '../../context/AdminAuthContext.jsx'
import { paleta } from '../../theme.js'

// Login del panel, separado del de clientes y sin enlace de registro: los
// administradores se crean con el script `npm run admin:crear`.
export default function AdminLogin() {
  const { admin, cargando, login } = useAdminAuth()
  const navigate = useNavigate()
  const { state } = useLocation()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const destino = state?.from || '/admin'

  useEffect(() => {
    if (!cargando && admin) navigate(destino, { replace: true })
  }, [cargando, admin, destino, navigate])

  const onFinish = async (values) => {
    setLoading(true)
    setError(null)
    try {
      await login(values)
      message.success('Sesión de administrador iniciada')
      navigate(destino, { replace: true })
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: `linear-gradient(160deg, #ffd3e4 0%, ${paleta.fondo} 60%)`,
        padding: 24,
      }}
    >
      <Card style={{ width: 380, maxWidth: '100%', borderTop: `4px solid ${paleta.primario}` }}>
        <Button
          type="text"
          shape="circle"
          icon={<CloseOutlined />}
          aria-label="Salir"
          title="Salir"
          onClick={() => navigate('/')}
          style={{ position: 'absolute', top: 12, right: 12 }}
        />
        <Typography.Title level={3} style={{ marginTop: 0 }}>
          Administración
        </Typography.Title>
        <Typography.Paragraph type="secondary">
          Acceso exclusivo del personal de la tienda. No hay registro público.
        </Typography.Paragraph>

        {error && <Alert type="error" showIcon title={error} style={{ marginBottom: 16 }} />}

        <Form layout="vertical" onFinish={onFinish} requiredMark={false}>
          <Form.Item name="usuario" label="Usuario" rules={[{ required: true, message: 'Ingresa el usuario' }]}>
            <Input prefix={<UserOutlined />} autoComplete="username" placeholder="demo" />
          </Form.Item>
          <Form.Item name="password" label="Contraseña" rules={[{ required: true, message: 'Ingresa la contraseña' }]}>
            <Input.Password prefix={<LockOutlined />} autoComplete="current-password" placeholder="Contraseña" />
          </Form.Item>
          <Button type="primary" htmlType="submit" size="large" block loading={loading}>
            Entrar al panel
          </Button>
        </Form>

        <Button block icon={<ArrowLeftOutlined />} onClick={() => navigate('/')} style={{ marginTop: 12 }}>
          Salir
        </Button>
      </Card>
    </div>
  )
}
