import React, { createContext, useContext, useState, useEffect } from 'react'
import api from '../lib/api'
import { isAuthenticated as checkAuth } from '../lib/auth'

interface User {
  id: number
  email: string
  displayName: string
  roles: string[]
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
    if (!checkAuth()) {
      setLoading(false)
      return
    }

    api.get('/api/v1/me')
      .then((response) => {
        setUser(response.data)
      })
      .catch(() => {
        // Token invalid, will redirect to login
        localStorage.removeItem('access_token')
      })
      .finally(() => {
        setLoading(false)
      })
  }, [])

  const isAdmin = user?.roles?.includes('ADMIN') || false
  const isAuthenticated = !!user

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

