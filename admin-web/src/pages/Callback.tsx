import React, { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { exchangeCodeForTokens } from '../lib/auth'
import { useAuth } from '../contexts/AuthContext'
import api from '../lib/api'

const Callback: React.FC = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { setUser } = useAuth()

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get('code')
      const state = searchParams.get('state')
      const error = searchParams.get('error')

      if (error) {
        console.error('OAuth error:', error)
        navigate('/login?error=' + encodeURIComponent(error))
        return
      }

      if (!code || !state) {
        navigate('/login?error=missing_parameters')
        return
      }

      try {
        // Exchange authorization code for tokens
        const data = await exchangeCodeForTokens(code, state)

        // Exchange code for tokens will handle storage
        // Now fetch user details from backend
        const userResponse = await api.get('/api/v1/me')
        setUser(userResponse.data)
        
        // Redirect to dashboard
        navigate('/')
      } catch (error) {
        console.error('Failed to exchange code:', error)
        navigate('/login?error=exchange_failed')
      }
    }

    handleCallback()
  }, [searchParams, navigate, setUser])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow-md text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="text-gray-600">Completing sign in...</p>
      </div>
    </div>
  )
}

export default Callback
