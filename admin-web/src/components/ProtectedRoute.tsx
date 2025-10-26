import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { isAuthenticated } from '../lib/auth'

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredRole?: string
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requiredRole }) => {
  const { user, loading, isAdmin } = useAuth()

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />
  }

  if (requiredRole && requiredRole === 'ADMIN' && !isAdmin) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">403 Forbidden</h1>
          <p className="text-gray-600 mt-2">You do not have permission to access this page.</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}

export default ProtectedRoute

