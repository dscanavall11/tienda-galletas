import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button, Card, Col, DatePicker, Flex, Input, Row, Segmented, Statistic, Table, Timeline, Typography, message } from 'antd'
import { FileTextOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { api } from '../../api.js'
import { currency, fechaHora } from '../../format.js'
import TagEstado from '../../components/TagEstado.jsx'

// Grupos rápidos de estados para filtrar el historial.
const GRUPOS = [
  { label: 'Todos', value: 'todos', estados: '' },
  { label: 'En curso', value: 'curso', estados: 'PENDIENTE,EN_PREPARACION,LISTO' },
  { label: 'Entregados', value: 'entregados', estados: 'ENTREGADO' },
  { label: 'Cancelados', value: 'cancelados', estados: 'CANCELADO' },
]

// "35 min", "2 h 10 min", "1 d 3 h": tiempo entre dos instantes.
function duracion(desde, hasta) {
  const min = Math.max(0, Math.round((new Date(hasta) - new Date(desde)) / 60000))
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60)
  if (h < 24) return `${h} h ${min % 60} min`
  return `${Math.floor(h / 24)} d ${h % 24} h`
}

// Detalle desplegable de un pedido: productos, datos de entrega y la bitácora
// de estados (cuándo pasó por cada uno).
function DetallePedido({ pedido }) {
  const inicio = pedido.historial[0]?.fecha ?? pedido.fecha
  const fin = pedido.historial.at(-1)?.fecha ?? pedido.fecha
  return (
    <Row gutter={[24, 16]}>
      <Col xs={24} lg={14}>
        <Typography.Text strong>Productos</Typography.Text>
        <Table
          size="small"
          rowKey="id"
          pagination={false}
          dataSource={pedido.detalles}
          style={{ marginTop: 8 }}
          columns={[
            { title: 'Galleta', dataIndex: ['galleta', 'nombre'] },
            { title: 'Cant.', dataIndex: 'cantidad', align: 'right' },
            { title: 'Precio unit.', dataIndex: 'precioUnitario', render: currency, align: 'right' },
            { title: 'Subtotal', render: (_, d) => currency(d.cantidad * d.precioUnitario), align: 'right' },
          ]}
        />
        <Flex vertical align="flex-end" style={{ marginTop: 8 }}>
          <span>Subtotal: {currency(pedido.factura?.subtotal)}</span>
          <span>IVA (19%): {currency(pedido.factura?.impuesto)}</span>
          <strong>Total: {currency(pedido.factura?.total)}</strong>
        </Flex>
        <Typography.Paragraph type="secondary" style={{ marginTop: 8, marginBottom: 0 }}>
          Entrega: {pedido.cliente.direccion || '—'} · Tel. {pedido.cliente.telefono || '—'}
        </Typography.Paragraph>
      </Col>
      <Col xs={24} lg={10}>
        <Typography.Text strong>Historial de estados</Typography.Text>
        <Timeline
          style={{ marginTop: 12 }}
          items={pedido.historial.map((h) => ({ title: fechaHora(h.fecha), content: h.estado.nombre }))}
        />
        {pedido.estado.codigo === 'ENTREGADO' && (
          <Typography.Paragraph type="secondary">Entregado en {duracion(inicio, fin)}.</Typography.Paragraph>
        )}
        <Link to={`/admin/facturas/${pedido.id}`}>
          <Button size="small" icon={<FileTextOutlined />}>
            Ver factura
          </Button>
        </Link>
      </Col>
    </Row>
  )
}

// Historial de pedidos del panel: todos los pedidos, activos y cerrados, con
// filtros (estado, fechas, texto), resumen del conjunto filtrado y el detalle
// y la bitácora de cada uno. Filtra y pagina el backend (/api/pedidos/historial).
export default function Historial() {
  const [grupo, setGrupo] = useState('todos')
  const [rango, setRango] = useState(null)
  const [texto, setTexto] = useState('')
  const [pagina, setPagina] = useState(1)
  const [tamano, setTamano] = useState(10)
  const [orden, setOrden] = useState('desc')
  // `datos.params` guarda con qué filtros se pidió lo que se está mostrando:
  // mientras no coincida con los filtros actuales, la tabla está cargando.
  const [datos, setDatos] = useState({ params: null, items: [], total: 0, resumen: null })

  const params = useMemo(() => {
    const p = { page: pagina, pageSize: tamano, orden }
    const estados = GRUPOS.find((g) => g.value === grupo).estados
    if (estados) p.estado = estados
    if (rango) {
      p.desde = rango[0].startOf('day').toISOString()
      p.hasta = rango[1].endOf('day').toISOString()
    }
    if (texto) p.q = texto
    return p
  }, [grupo, rango, texto, pagina, tamano, orden])

  useEffect(() => {
    let vigente = true
    api
      .getHistorial(params)
      .then((d) => vigente && setDatos({ ...d, params }))
      .catch((e) => {
        message.error(e.message)
        if (vigente) setDatos((previo) => ({ ...previo, params }))
      })
    return () => {
      vigente = false
    }
  }, [params])

  const loading = datos.params !== params

  const r = datos.resumen
  const tarjetas = [
    { titulo: 'Pedidos', valor: r?.pedidos ?? 0 },
    { titulo: 'En curso', valor: r?.enCurso ?? 0 },
    { titulo: 'Entregados', valor: r?.entregados ?? 0 },
    { titulo: 'Cancelados', valor: r?.cancelados ?? 0 },
    { titulo: 'Ventas', valor: r?.ventas ?? 0, formato: currency },
    { titulo: 'Ticket promedio', valor: r?.ticketPromedio ?? 0, formato: currency },
  ]

  const presets = [
    { label: 'Hoy', value: [dayjs(), dayjs()] },
    { label: 'Últimos 7 días', value: [dayjs().subtract(6, 'day'), dayjs()] },
    { label: 'Este mes', value: [dayjs().startOf('month'), dayjs().endOf('month')] },
  ]

  const columns = [
    {
      title: 'N° Factura',
      render: (_, p) => <Link to={`/admin/facturas/${p.id}`}>{p.factura?.numero}</Link>,
    },
    {
      title: 'Fecha',
      dataIndex: 'fecha',
      render: fechaHora,
      sorter: true,
      sortOrder: orden === 'asc' ? 'ascend' : 'descend',
      sortDirections: ['ascend', 'descend'],
    },
    {
      title: 'Cliente',
      render: (_, p) => (
        <div>
          <div>{p.cliente.nombre}</div>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {p.cliente.email}
          </Typography.Text>
        </div>
      ),
    },
    { title: 'Items', align: 'right', render: (_, p) => p.detalles.reduce((s, d) => s + d.cantidad, 0) },
    { title: 'Total', dataIndex: ['factura', 'total'], align: 'right', render: currency },
    { title: 'Estado', dataIndex: 'estado', render: (e) => <TagEstado estado={e} /> },
    { title: 'Último cambio', render: (_, p) => fechaHora(p.historial.at(-1)?.fecha ?? p.fecha) },
  ]

  return (
    <>
      <Typography.Title level={3} style={{ marginBottom: 4 }}>
        Historial de pedidos
      </Typography.Title>
      <Typography.Paragraph type="secondary">
        Todos los pedidos con su detalle y los cambios de estado. Despliega una fila para ver los productos y la bitácora.
      </Typography.Paragraph>

      <Row gutter={[16, 16]}>
        {tarjetas.map((t) => (
          <Col key={t.titulo} flex="1 1 150px">
            <Card>
              <Statistic
                title={t.titulo}
                value={t.valor}
                formatter={t.formato ? (v) => t.formato(v) : undefined}
                loading={loading && !r}
              />
            </Card>
          </Col>
        ))}
      </Row>

      <Card style={{ marginTop: 16 }}>
        <Flex gap="middle" wrap align="center" justify="space-between" style={{ marginBottom: 16 }}>
          <Segmented
            value={grupo}
            onChange={(v) => {
              setGrupo(v)
              setPagina(1)
            }}
            options={GRUPOS.map(({ label, value }) => ({ label, value }))}
          />
          <Flex gap="small" wrap>
            <DatePicker.RangePicker
              value={rango}
              onChange={(v) => {
                setRango(v)
                setPagina(1)
              }}
              presets={presets}
              format="DD/MM/YYYY"
              placeholder={['Desde', 'Hasta']}
            />
            <Input.Search
              allowClear
              placeholder="Cliente, correo o N° de factura"
              onSearch={(v) => {
                setTexto(v.trim())
                setPagina(1)
              }}
              onChange={(e) => {
                if (!e.target.value) {
                  setTexto('')
                  setPagina(1)
                }
              }}
              style={{ width: 290, maxWidth: '100%' }}
            />
          </Flex>
        </Flex>

        <Table
          rowKey="id"
          loading={loading}
          dataSource={datos.items}
          columns={columns}
          scroll={{ x: 'max-content' }}
          locale={{ emptyText: 'Ningún pedido coincide con los filtros' }}
          expandable={{ expandedRowRender: (p) => <DetallePedido pedido={p} /> }}
          pagination={{
            current: pagina,
            pageSize: tamano,
            total: datos.total,
            showSizeChanger: true,
            pageSizeOptions: [10, 20, 50],
            showTotal: (t) => `${t} pedido(s)`,
          }}
          onChange={(pag, _filtros, sorter) => {
            setPagina(pag.current)
            setTamano(pag.pageSize)
            setOrden(sorter.order === 'ascend' ? 'asc' : 'desc')
          }}
        />
      </Card>
    </>
  )
}
