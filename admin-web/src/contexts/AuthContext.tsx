import React, { createContext, useContext, useState, useEffect } from 'react'
import api from '../lib/api'
import { isAuthenticated as checkAuth } from '../lib/auth'

interface User {
  id: number
  email: string
  displayName: string
  roles: string[]
  lastLogin?: string
}

interface AuthContextType {
  user: User | null
  loading: boolean
  isAdmin: boolean
  isAuthenticated: boolean
  setUser: React.Dispatch<React.SetStateAction<User | null>>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const hasToken = checkAuth()
    console.log('[AuthContext] Initializing:', { hasToken })
    
    if (!hasToken) {
      console.log('[AuthContext] No token found, skipping user fetch')
      setLoading(false)
      return
    }

    console.log('[AuthContext] Fetching user profile from /api/v1/me')
    api.get('/api/v1/me')
      .then((response) => {
        console.log('[AuthContext] User profile loaded:', {
          email: response.data?.email,
          roles: response.data?.roles,
        })
        setUser(response.data)
      })
      .catch((error) => {
        console.error('[AuthContext] Failed to fetch user profile:', {
          status: error.response?.status,
          message: error.message,
          hasResponse: !!error.response,
        })
        // Only remove token on 401 (unauthorized), not on other errors
        if (error.response?.status === 401) {
          console.warn('[AuthContext] 401 received, clearing tokens')
          localStorage.removeItem('access_token')
          localStorage.removeItem('id_token')
        } else {
          console.log('[AuthContext] Non-401 error, keeping token (backend might be unavailable)')
        }
        // Don't clear user state on other errors - token might still be valid
        // This allows pages to load even if Phase 1 backend is temporarily unavailable
      })
      .finally(() => {
        setLoading(false)
      })
  }, [])

  const isAdmin = user?.roles?.includes('ADMIN') || false
  // Consider authenticated if token exists, even if user data hasn't loaded yet
  const isAuthenticated = checkAuth() || !!user

  return (
    <AuthContext.Provider value={{ user, loading, isAdmin, isAuthenticated, setUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}

