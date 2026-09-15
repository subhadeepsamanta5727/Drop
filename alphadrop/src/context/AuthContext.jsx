import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import api, { getStoredToken, setStoredToken } from '../services/api.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = getStoredToken()
    if (!token) {
      setLoading(false)
      return
    }

    api
      .get('/auth/me')
      .then((response) => {
        const profile = response.data?.data
        if (profile) {
          setUser({
            id: profile.id,
            name: profile.name,
            email: profile.email,
            role: profile.role,
            hasActiveSubscription: profile.hasActiveSubscription,
            hasOneTimeAccess: profile.hasOneTimeAccess,
          })
        }
      })
      .catch(() => {
        setStoredToken('')
        setUser(null)
      })
      .finally(() => setLoading(false))
  }, [])

  const logout = () => {
    setStoredToken('')
    setUser(null)
  }

  const value = useMemo(() => ({ user, setUser, loading, logout }), [user, loading])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
