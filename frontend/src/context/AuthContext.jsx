import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { api } from '../api.js'

const AuthContext = createContext(null)

// Sesión del cliente en la tienda. El token real vive en una cookie HttpOnly
// que el navegador envía sola; aquí solo se guarda el perfil para la interfaz.
export function AuthProvider({ children }) {
  const [cliente, setCliente] = useState(null)
  const [cargando, setCargando] = useState(true)

  const recargar = useCallback(async () => {
    try {
      const data = await api.me()
      setCliente(data.cliente)
    } catch {
      setCliente(null)
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => {
    recargar()
  }, [recargar])

  const ingresar = useCallback(async (payload) => {
    const data = await api.ingresar(payload)
    setCliente(data.cliente)
    return data.cliente
  }, [])

  const registrar = useCallback(async (payload) => {
    const data = await api.registrar(payload)
    setCliente(data.cliente)
    return data.cliente
  }, [])

  const salir = useCallback(async () => {
    await api.salir()
    setCliente(null)
  }, [])

  const actualizarPerfil = useCallback(async (payload) => {
    const actualizado = await api.actualizarPerfil(payload)
    setCliente(actualizado)
    return actualizado
  }, [])

  const value = useMemo(
    () => ({ cliente, cargando, ingresar, registrar, salir, actualizarPerfil, recargar }),
    [cliente, cargando, ingresar, registrar, salir, actualizarPerfil, recargar],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  return ctx
}
