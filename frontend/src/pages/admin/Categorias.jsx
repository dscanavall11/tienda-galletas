import { useEffect, useState } from 'react'
import { Table, Button, Modal, Form, Input, Space, Popconfirm, message } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import { api } from '../../api.js'

export default function Categorias() {
  const [categorias, setCategorias] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form] = Form.useForm()

  const cargar = async () => {
    setLoading(true)
    setCategorias(await api.getCategorias())
    setLoading(false)
  }

  useEffect(() => {
    cargar()
  }, [])

  const abrirNuevo = () => {
    setEditing(null)
    form.resetFields()
    setModalOpen(true)
  }

  const abrirEditar = (c) => {
    setEditing(c)
    form.setFieldsValue(c)
    setModalOpen(true)
  }

  const guardar = async () => {
    const { nombre } = await form.validateFields()
    try {
      if (editing) await api.updateCategoria(editing.id, nombre)
      else await api.createCategoria(nombre)
      message.success('Guardado')
      setModalOpen(false)
      cargar()
    } catch (e) {
      message.error(e.message)
    }
  }

  const eliminar = async (id) => {
    try {
      await api.deleteCategoria(id)
      message.success('Categoría eliminada')
      cargar()
    } catch (e) {
      message.error(e.message)
    }
  }

  const columns = [
    { title: 'Nombre', dataIndex: 'nombre' },
    {
      title: 'Acciones',
      render: (_, c) => (
        <Space>
          <Button icon={<EditOutlined />} onClick={() => abrirEditar(c)} />
          <Popconfirm title="¿Eliminar categoría?" onConfirm={() => eliminar(c.id)}>
            <Button danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <>
      <Space style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <h2 style={{ margin: 0 }}>Categorías</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={abrirNuevo}>
          Nueva categoría
        </Button>
      </Space>
      <Table rowKey="id" loading={loading} dataSource={categorias} columns={columns} pagination={false} />
      <Modal
        title={editing ? 'Editar categoría' : 'Nueva categoría'}
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
        </Form>
      </Modal>
    </>
  )
}
