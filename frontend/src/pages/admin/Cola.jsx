import { useCallback, useEffect, useState } from 'react'
import { Row, Col, Card, Button, Space, Typography, Tag, Popconfirm, Empty, Flex, message } from 'antd'
import { PlayCircleOutlined, ReloadOutlined, CheckOutlined, CloseOutlined } from '@ant-design/icons'
import { Link } from 'react-router-dom'
import { api } from '../../api.js'
import { currency } from '../../format.js'

const REFRESCO_MS = 5000

// Columnas del tablero. Los pendientes salen de la fila solo con "Tomar
// siguiente" (así se respeta el orden de llegada); los demás avanzan con su
// botón. Cancelar solo aplica antes de que el pedido esté listo.
const COLUMNAS = [
  { codigo: 'PENDIENTE', titulo: 'En cola', avanzar: null, cancelable: true },
  { codigo: 'EN_PREPARACION', titulo: 'En preparación', avanzar: { estado: 'LISTO', texto: 'Marcar listo' }, cancelable: true },
  { codigo: 'LISTO', titulo: 'Listos para entregar', avanzar: { estado: 'ENTREGADO', texto: 'Entregar' }, cancelable: false },
]

function hace(fecha, ahora) {
  const min = Math.max(0, Math.floor((ahora - new Date(fecha).getTime()) / 60000))
  if (min < 1) return 'hace menos de 1 min'
  if (min < 60) return `hace ${min} min`
  const horas = Math.floor(min / 60)
  if (horas < 24) return `hace ${horas} h ${min % 60} min`
  return `hace ${Math.floor(horas / 24)} d`
}

export default function Cola() {
  const [cola, setCola] = useState([])
  const [loading, setLoading] = useState(true)
  const [trabajando, setTrabajando] = useState(false)
  const [ahora, setAhora] = useState(() => Date.now())

  const cargar = useCallback(async () => {
    try {
      setCola(await api.getCola())
      setAhora(Date.now())
    } catch (e) {
      message.error(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  // La cola se refresca sola: los pedidos nuevos llegan desde la tienda.
  useEffect(() => {
    cargar()
    const id = setInterval(cargar, REFRESCO_MS)
    return () => clearInterval(id)
  }, [cargar])

  const ejecutar = async (accion, textoOk) => {
    setTrabajando(true)
    try {
      message.success(textoOk(await accion()))
    } catch (e) {
      message.error(e.message)
    } finally {
      setTrabajando(false)
      cargar()
    }
  }

  const tomarSiguiente = () =>
    ejecutar(
      () => api.tomarSiguiente(),
      (p) => `${p.factura?.numero} pasó a preparación`
    )

  const mover = (pedido, estado) =>
    ejecutar(
      () => api.cambiarEstado(pedido.id, estado),
      (p) => `${p.factura?.numero}: ${p.estado.nombre}`
    )

  const pendientes = cola.filter((p) => p.estado.codigo === 'PENDIENTE')

  return (
    <>
      <Flex justify="space-between" align="center" wrap gap="small" style={{ marginBottom: 16 }}>
        <div>
          <Typography.Title level={3} style={{ margin: 0 }}>
            Cola de pedidos
          </Typography.Title>
          <Typography.Text type="secondary">
            Se atienden en orden de llegada. Se actualiza sola cada {REFRESCO_MS / 1000} s.
          </Typography.Text>
        </div>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={cargar}>
            Actualizar
          </Button>
          <Button
            type="primary"
            icon={<PlayCircleOutlined />}
            disabled={!pendientes.length}
            loading={trabajando}
            onClick={tomarSiguiente}
          >
            Tomar siguiente{pendientes.length ? ` (${pendientes.length} en cola)` : ''}
          </Button>
        </Space>
      </Flex>

      <Row gutter={[16, 16]}>
        {COLUMNAS.map((col) => {
          const pedidos = cola.filter((p) => p.estado.codigo === col.codigo)
          return (
            <Col key={col.codigo} xs={24} lg={8}>
              <Card
                loading={loading}
                title={
                  <Space>
                    {col.titulo}
                    <Tag>{pedidos.length}</Tag>
                  </Space>
                }
              >
                {!pedidos.length ? (
                  <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Sin pedidos" />
                ) : (
                  <Flex vertical gap="small">
                    {pedidos.map((p, i) => (
                      <Card key={p.id} size="small" type="inner">
                        <Flex justify="space-between" align="center" gap="small">
                          <Typography.Text strong>
                            {col.codigo === 'PENDIENTE' && <Tag>#{i + 1}</Tag>}
                            <Link to={`/admin/facturas/${p.id}`}>{p.factura?.numero}</Link>
                          </Typography.Text>
                          <Typography.Text type="secondary">{hace(p.fecha, ahora)}</Typography.Text>
                        </Flex>
                        <div>{p.cliente.nombre}</div>
                        <Typography.Text type="secondary">
                          {p.detalles.map((d) => `${d.cantidad}× ${d.galleta.nombre}`).join(', ')}
                        </Typography.Text>
                        <Flex justify="space-between" align="center" style={{ marginTop: 8 }}>
                          <b>{currency(p.factura?.total ?? 0)}</b>
                          <Space>
                            {col.cancelable && (
                              <Popconfirm
                                title="¿Cancelar este pedido?"
                                description="Se devolverá el stock de sus galletas."
                                okText="Sí, cancelar"
                                cancelText="No"
                                onConfirm={() => mover(p, 'CANCELADO')}
                              >
                                <Button size="small" danger icon={<CloseOutlined />} disabled={trabajando}>
                                  Cancelar
                                </Button>
                              </Popconfirm>
                            )}
                            {col.avanzar && (
                              <Button
                                size="small"
                                type="primary"
                                icon={<CheckOutlined />}
                                disabled={trabajando}
                                onClick={() => mover(p, col.avanzar.estado)}
                              >
                                {col.avanzar.texto}
                              </Button>
                            )}
                          </Space>
                        </Flex>
                      </Card>
                    ))}
                  </Flex>
                )}
              </Card>
            </Col>
          )
        })}
      </Row>
    </>
  )
}
