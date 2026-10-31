import { useEffect, useMemo, useState } from 'react'
import { Table, Button, Modal, Form, Input, Typography, message } from 'antd'
import { EditOutlined } from '@ant-design/icons'
import { Link } from 'react-router-dom'
import { api } from '../../api.js'
import { currency, fechaHora } from '../../format.js'

// Historial de compras de un cliente (fila expandida): un cliente, muchos
// pedidos — la relación 1:N que justifica tener Cliente separado de Pedido.
const columnasHistorial = [
  {
    title: 'N° Factura',
    render: (_, p) => <Link to={`/admin/facturas/${p.id}`}>{p.factura?.numero}</Link>,
  },
  { title: 'Fecha', dataIndex: 'fecha', render: fechaHora },
  { title: 'Items', render: (_, p) => p.detalles.reduce((suma, d) => suma + d.cantidad, 0) },
  { title: 'Total', render: (_, p) => currency(p.factura?.total ?? 0) },
]

export default function Clientes() {
  const [clientes, setClientes] = useState([])
  const [pedidos, setPedidos] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form] = Form.useForm()

  const cargar = async () => {
    setLoading(true)
    try {
      const [c, p] = await Promise.all([api.getClientes(), api.getPedidos()])
      setClientes(c)
      setPedidos(p)
    } catch (e) {
      message.error(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    cargar()
  }, [])

  const filas = useMemo(() => {
    const historialPorCliente = new Map()
    for (const p of pedidos) {
      historialPorCliente.set(p.clienteId, [...(historialPorCliente.get(p.clienteId) ?? []), p])
    }
    return clientes.map((c) => {
      const historial = historialPorCliente.get(c.id) ?? []
      return {
        ...c,
        historial,
        totalComprado: historial.reduce((suma, p) => suma + (p.factura?.total ?? 0), 0),
      }
    })
  }, [clientes, pedidos])

  const abrirEditar = (c) => {
    setEditing(c)
    form.setFieldsValue(c)
    setModalOpen(true)
  }

  const guardar = async () => {
    const values = await form.validateFields()
    try {
      await api.updateCliente(editing.id, values)
      message.success('Cliente actualizado')
      setModalOpen(false)
      cargar()
    } catch (e) {
      message.error(e.message)
    }
  }

  const columns = [
    { title: 'Nombre', dataIndex: 'nombre' },
    { title: 'Email', dataIndex: 'email' },
    { title: 'Teléfono', dataIndex: 'telefono', render: (v) => v || '-' },
    { title: 'Documento', dataIndex: 'documento', render: (v) => v || '-' },
    {
      title: 'Pedidos',
      render: (_, c) => c.historial.length,
      sorter: (a, b) => a.historial.length - b.historial.length,
    },
    {
      title: 'Total comprado',
      dataIndex: 'totalComprado',
      render: currency,
      sorter: (a, b) => a.totalComprado - b.totalComprado,
    },
    {
      title: 'Acciones',
      render: (_, c) => <Button icon={<EditOutlined />} onClick={() => abrirEditar(c)} />,
    },
  ]

  return (
    <>
      <h2 style={{ marginTop: 0 }}>Clientes</h2>
      <Table
        rowKey="id"
        loading={loading}
        dataSource={filas}
        columns={columns}
        pagination={{ pageSize: 8 }}
        expandable={{
          expandedRowRender: (c) => (
            <>
              <Typography.Paragraph type="secondary">Dirección: {c.direccion || '-'}</Typography.Paragraph>
              <Table
                size="small"
                rowKey="id"
                pagination={false}
                dataSource={c.historial}
                columns={columnasHistorial}
                locale={{ emptyText: 'Sin pedidos' }}
              />
            </>
          ),
        }}
      />
      <Modal
        title="Editar cliente"
        open={modalOpen}
        onOk={guardar}
        onCancel={() => setModalOpen(false)}
        okText="Guardar"
        cancelText="Cancelar"
        destroyOnHidden
      >
        <Form form={form} layout="vertical">
          <Form.Item name="nombre" label="Nombre completo" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="email" label="Correo electrónico" rules={[{ required: true, type: 'email' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="telefono" label="Teléfono">
            <Input />
          </Form.Item>
          <Form.Item name="documento" label="Documento de identidad">
            <Input />
          </Form.Item>
          <Form.Item name="direccion" label="Dirección">
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}
