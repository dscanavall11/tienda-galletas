import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { api } from '../api.js'

const AdminAuthContext = createContext(null)

// Sesión del panel, independiente de la del cliente: su cookie es otra y dura
// menos (8 horas). El backend exige esta sesión en las rutas de administración.
export function AdminAuthProvider({ children }) {
  const [admin, setAdmin] = useState(null)
  const [cargando, setCargando] = useState(true)

  const recargar = useCallback(async () => {
    try {
      const data = await api.adminMe()
      setAdmin(data.admin)
    } catch {
      setAdmin(null)
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => {
    recargar()
  }, [recargar])

  const login = useCallback(async (payload) => {
    const data = await api.adminLogin(payload)
    setAdmin(data.admin)
    return data.admin
  }, [])

  const logout = useCallback(async () => {
    await api.adminLogout()
    setAdmin(null)
  }, [])

  const value = useMemo(
    () => ({ admin, cargando, login, logout, recargar }),
    [admin, cargando, login, logout, recargar],
  )

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>
}

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext)
  if (!ctx) throw new Error('useAdminAuth debe usarse dentro de <AdminAuthProvider>')
  return ctx
}
