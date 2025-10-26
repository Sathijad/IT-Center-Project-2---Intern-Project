import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { startLogin } from '../lib/auth'

const Login: React.FC = () => {
  const navigate = useNavigate()
  const { isAuthenticated: isAuthenticatedState } = useAuth()

  React.useEffect(() => {
    if (isAuthenticatedState) {
      navigate('/')
    }
  }, [isAuthenticatedState, navigate])

  const handleLogin = () => {
    startLogin()
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow-md">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900">IT Center Admin</h2>
          <p className="mt-2 text-sm text-gray-600">Sign in to your account</p>
        </div>
        
        <div className="mt-8">
          <button
            onClick={handleLogin}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition"
          >
            Sign in with Cognito
          </button>
        </div>

        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">
            Secure authentication powered by AWS Cognito
          </p>
        </div>
      </div>
    </div>
  )
}

export default Login

