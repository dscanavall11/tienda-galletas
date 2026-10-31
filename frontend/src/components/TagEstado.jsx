import { Tag } from 'antd'

// Color de cada estado del flujo de la cola: gris → azul → naranja → verde.
const COLORES = {
  PENDIENTE: 'default',
  EN_PREPARACION: 'processing',
  LISTO: 'warning',
  ENTREGADO: 'success',
  CANCELADO: 'error',
}

export default function TagEstado({ estado }) {
  return <Tag color={COLORES[estado.codigo]}>{estado.nombre}</Tag>
}
