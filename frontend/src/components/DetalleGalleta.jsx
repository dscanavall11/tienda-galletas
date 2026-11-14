import { useState } from 'react'
import { Modal, Tag, Typography, Alert, Flex, InputNumber, Button } from 'antd'
import { ShoppingCartOutlined } from '@ant-design/icons'
import { currency } from '../format.js'
import { FOTO_RESPALDO } from '../fotos.js'
import { paleta } from '../theme.js'

// Estilo de cada ingrediente: los que aportan un alérgeno se marcan en ámbar.
const etiqueta = (alergeno) => ({
  margin: 0,
  borderRadius: 999,
  paddingInline: 12,
  ...(alergeno
    ? { background: '#fff4e0', color: '#8a5300', border: '1px solid #ffd591' }
    : { background: paleta.rosaClaro, color: paleta.primarioActivo, border: 'none' }),
})

// Ficha de una galleta: foto, descripción, de qué está hecha (ingredientes en
// orden de cantidad) y los alérgenos que contiene. En pantallas anchas la foto
// va a la izquierda y el texto a la derecha (ver .detalle-galleta en index.css).
export default function DetalleGalleta({ galleta, open, onClose, onAgregar }) {
  const [cantidad, setCantidad] = useState(1)
  if (!galleta) return null

  const sinStock = galleta.stock === 0
  const ingredientes = galleta.ingredientes ?? []
  const alergenos = galleta.alergenos ?? []

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={860}
      centered
      destroyOnHidden
      afterOpenChange={(abierto) => abierto && setCantidad(1)}
    >
      <div className="detalle-galleta">
        <img
          className="galleta-foto"
          alt={galleta.nombre}
          src={galleta.fotoUrl}
          onError={(e) => {
            e.currentTarget.onerror = null
            e.currentTarget.src = FOTO_RESPALDO
          }}
          style={{ borderRadius: 14, alignSelf: 'start', filter: sinStock ? 'grayscale(1)' : undefined }}
        />

        <div>
          <Flex justify="space-between" align="baseline" wrap gap="small">
            <Typography.Title level={3} style={{ margin: 0 }}>
              {galleta.nombre}
            </Typography.Title>
            <span style={{ fontSize: 22, fontWeight: 800, color: paleta.primario }}>{currency(galleta.precio)}</span>
          </Flex>
          <Tag style={{ marginTop: 8, border: 'none', borderRadius: 999, background: paleta.rosaClaro, color: paleta.primarioActivo }}>
            {galleta.categoria?.nombre}
          </Tag>
          <Typography.Paragraph style={{ marginTop: 12, color: paleta.textoSecundario }}>{galleta.descripcion}</Typography.Paragraph>

          <Typography.Title level={5}>¿De qué está hecha?</Typography.Title>
          {ingredientes.length ? (
            <Flex wrap gap={8}>
              {ingredientes.map((i) => (
                <Tag key={i.id} style={etiqueta(i.alergeno)}>
                  {i.nombre}
                  {i.alergeno ? ' *' : ''}
                </Tag>
              ))}
            </Flex>
          ) : (
            <Typography.Text type="secondary">Todavía no hay ingredientes registrados para esta galleta.</Typography.Text>
          )}
          {alergenos.length > 0 && (
            <Alert
              type="warning"
              showIcon
              style={{ marginTop: 16 }}
              title={`Contiene: ${alergenos.join(', ')}`}
              description="* Ingredientes que aportan alérgenos."
            />
          )}

          <Flex justify="space-between" align="center" wrap gap="small" style={{ marginTop: 20 }}>
            <span style={{ color: sinStock ? paleta.error : paleta.textoSecundario }}>
              {sinStock ? 'Sin stock' : `Stock disponible: ${galleta.stock}`}
            </span>
            <Flex gap="small">
              <InputNumber min={1} max={Math.max(galleta.stock, 1)} value={cantidad} disabled={sinStock} onChange={(v) => setCantidad(v || 1)} />
              <Button
                type="primary"
                icon={<ShoppingCartOutlined />}
                disabled={sinStock}
                onClick={() => {
                  onAgregar(galleta, cantidad)
                  onClose()
                }}
              >
                Agregar al carrito
              </Button>
            </Flex>
          </Flex>
        </div>
      </div>
    </Modal>
  )
}
