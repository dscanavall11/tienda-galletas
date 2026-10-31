import { useEffect, useState } from 'react'
import { Table, Button, Modal, Form, Input, InputNumber, Select, Switch, Space, Popconfirm, message, Image } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import { api } from '../../api.js'

const currency = (n) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n)

export default function Inventario() {
  const [galletas, setGalletas] = useState([])
  const [categorias, setCategorias] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form] = Form.useForm()

  const cargar = async () => {
    setLoading(true)
    const [g, c] = await Promise.all([api.getGalletas(), api.getCategorias()])
    setGalletas(g)
    setCategorias(c)
    setLoading(false)
  }

  useEffect(() => {
    cargar()
  }, [])

  const abrirNuevo = () => {
    setEditing(null)
    form.resetFields()
    form.setFieldsValue({ activa: true, stock: 0, precio: 0 })
    setModalOpen(true)
  }

  const abrirEditar = (g) => {
    setEditing(g)
    form.setFieldsValue(g)
    setModalOpen(true)
  }

  const guardar = async () => {
    const values = await form.validateFields()
    try {
      if (editing) {
        await api.updateGalleta(editing.id, values)
        message.success('Galleta actualizada')
      } else {
        await api.createGalleta(values)
        message.success('Galleta creada')
      }
      setModalOpen(false)
      cargar()
    } catch (e) {
      message.error(e.message)
    }
  }

  const eliminar = async (id) => {
    try {
      await api.deleteGalleta(id)
      message.success('Galleta eliminada')
      cargar()
    } catch (e) {
      message.error(e.message)
    }
  }

  const columns = [
    {
      title: 'Foto',
      dataIndex: 'fotoUrl',
      render: (url) => <Image src={url} width={60} height={45} style={{ objectFit: 'cover' }} />,
    },
    { title: 'Nombre', dataIndex: 'nombre' },
    { title: 'Categoría', dataIndex: ['categoria', 'nombre'] },
    { title: 'Precio', dataIndex: 'precio', render: currency },
    { title: 'Stock', dataIndex: 'stock' },
    { title: 'Activa', dataIndex: 'activa', render: (v) => (v ? 'Sí' : 'No') },
    {
      title: 'Acciones',
      render: (_, g) => (
        <Space>
          <Button icon={<EditOutlined />} onClick={() => abrirEditar(g)} />
          <Popconfirm title="¿Eliminar esta galleta?" onConfirm={() => eliminar(g.id)}>
            <Button danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <>
      <Space style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <h2 style={{ margin: 0 }}>Inventario de galletas</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={abrirNuevo}>
          Nueva galleta
        </Button>
      </Space>
      <Table rowKey="id" loading={loading} dataSource={galletas} columns={columns} pagination={{ pageSize: 8 }} />
      <Modal
        title={editing ? 'Editar galleta' : 'Nueva galleta'}
        open={modalOpen}
        onOk={guardar}
        onCancel={() => setModalOpen(false)}
        okText="Guardar"
        cancelText="Cancelar"
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item name="nombre" label="Nombre" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="descripcion" label="Descripción">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="fotoUrl" label="URL de la foto" rules={[{ required: true }]}>
            <Input placeholder="https://..." />
          </Form.Item>
          <Form.Item name="categoriaId" label="Categoría" rules={[{ required: true }]}>
            <Select options={categorias.map((c) => ({ value: c.id, label: c.nombre }))} />
          </Form.Item>
          <Space size="middle">
            <Form.Item name="precio" label="Precio" rules={[{ required: true }]}>
              <InputNumber min={0} style={{ width: 140 }} />
            </Form.Item>
            <Form.Item name="stock" label="Stock" rules={[{ required: true }]}>
              <InputNumber min={0} style={{ width: 100 }} />
            </Form.Item>
            <Form.Item name="activa" label="Activa" valuePropName="checked">
              <Switch />
            </Form.Item>
          </Space>
        </Form>
      </Modal>
    </>
  )
}
