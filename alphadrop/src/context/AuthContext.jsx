import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import api, { getStoredToken, setStoredToken } from '../services/api.js'

const AuthContext = createContext(null)

const getUserFromProfile = (profile) => ({
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
})

const fetchCurrentUser = async () => {
  const token = getStoredToken()
  if (!token) return null

  const response = await api.get('/auth/me')
  const profile = response.data?.data
  return profile ? getUserFromProfile(profile) : null
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isCurrent = true

    const verifyAuth = async () => {
      try {
        const currentUser = await fetchCurrentUser()
        if (isCurrent) setUser(currentUser)
      } catch {
        setStoredToken('')
        if (isCurrent) setUser(null)
      } finally {
        if (isCurrent) setLoading(false)
      }
    }

    verifyAuth()
    return () => { isCurrent = false }
  }, [])

  const refreshUser = useCallback(async () => {
    setLoading(true)
    try {
      const currentUser = await fetchCurrentUser()
      setUser(currentUser)
      return currentUser
    } catch {
      setStoredToken('')
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  const logout = useCallback(() => {
    setStoredToken('')
    setUser(null)
  }, [])

  const value = useMemo(() => ({ user, setUser, loading, logout, refreshUser }), [user, loading, logout, refreshUser])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
