import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { isAuthenticated } from '../lib/auth'

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredRole?: string
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requiredRole }) => {
  const { user, loading } = useAuth()
  const roles = user?.roles || []
  const hasToken = isAuthenticated()

  // Debug logging
  React.useEffect(() => {
    console.log('[ProtectedRoute] Auth check:', {
      path: window.location.pathname,
      hasToken,
      loading,
      user: user ? { email: user.email, roles: user.roles } : null,
      requiredRole,
      hasRequiredRole: requiredRole ? roles.includes(requiredRole) : true,
    })
  }, [hasToken, loading, user, requiredRole, roles])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  if (!hasToken) {
    console.warn('[ProtectedRoute] No token found, redirecting to login')
    return <Navigate to="/login" replace />
  }

  if (requiredRole && !roles.includes(requiredRole)) {
    console.warn('[ProtectedRoute] Missing required role:', {
      requiredRole,
      userRoles: roles,
    })
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">403 Forbidden</h1>
          <p className="text-gray-600 mt-2">You do not have permission to access this page.</p>
          <p className="text-sm text-gray-500 mt-1">Required role: {requiredRole}</p>
          <p className="text-sm text-gray-500">Your roles: {roles.length > 0 ? roles.join(', ') : 'None'}</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}

export default ProtectedRoute

