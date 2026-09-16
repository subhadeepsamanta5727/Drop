import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import api, { getStoredToken, setStoredToken } from '../services/api.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    refreshUser()
  }, [])

  const refreshUser = async () => {
    const token = getStoredToken()
    if (!token) {
      setUser(null)
      setLoading(false)
      return null
    }

    try {
      const response = await api.get('/auth/me')
      const profile = response.data?.data
      if (profile) {
        const updatedUser = {
          id: profile.id,
          name: profile.name,
          email: profile.email,
          role: profile.role,
          hasActiveSubscription: Boolean(profile.hasActiveSubscription),
          hasOneTimeAccess: Boolean(profile.hasOneTimeAccess),
          subscription: profile.subscription || {
            plan: null,
            status: profile.hasActiveSubscription ? 'active' : 'inactive',
            expiresAt: null,
          },
          purchasedCategories: profile.purchasedCategories || [],
          lifetimeCategories: profile.lifetimeCategories || [],
        }
        setUser(updatedUser)
        return updatedUser
      }
    } catch {
      setStoredToken('')
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  const logout = () => {
    setStoredToken('')
    setUser(null)
  }

  const value = useMemo(() => ({ user, setUser, loading, logout, refreshUser }), [user, loading])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
