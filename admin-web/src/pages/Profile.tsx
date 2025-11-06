import React, { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../contexts/AuthContext'
import api from '../lib/api'
import { User } from 'lucide-react'

const Profile: React.FC = () => {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [displayName, setDisplayName] = useState('')
  const [locale, setLocale] = useState('en-US')

  const { data: currentUser, isLoading } = useQuery({
    queryKey: ['current-user'],
    queryFn: async () => {
      const response = await api.get('/api/v1/me')
      return response.data
    },
  })

  // Update local state when currentUser changes
  useEffect(() => {
    if (currentUser) {
      setDisplayName(currentUser.displayName || '')
      setLocale(currentUser.locale || 'en-US')
    }
  }, [currentUser])

  const updateMutation = useMutation({
    mutationFn: async (data: { displayName?: string; locale?: string }) => {
      const response = await api.patch('/api/v1/me', data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['current-user'] })
      alert('Profile updated successfully')
    },
    onError: (error: any) => {
      alert(error?.response?.data?.message || 'Failed to update profile')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    updateMutation.mutate({
      displayName: displayName.trim(),
      locale: locale.trim(),
    })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading profile...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Profile</h1>
        <p className="mt-2 text-gray-600">Manage your profile information</p>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center space-x-4 mb-6">
          <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
            <User className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">{currentUser?.displayName || currentUser?.email}</h2>
            <p className="text-gray-600">{currentUser?.email}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="display-name-input" className="block text-sm font-medium text-gray-700 mb-2">
              Display Name
            </label>
            <input
              id="display-name-input"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={80}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter your display name"
            />
          </div>

          <div>
            <label htmlFor="locale-select" className="block text-sm font-medium text-gray-700 mb-2">
              Locale
            </label>
            <select
              id="locale-select"
              value={locale}
              onChange={(e) => setLocale(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="en-US">English (US)</option>
              <option value="en-GB">English (UK)</option>
              <option value="fr-FR">French</option>
              <option value="de-DE">German</option>
              <option value="es-ES">Spanish</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Roles
            </label>
            <div className="flex space-x-2">
              {currentUser?.roles?.map((role: string) => (
                <span
                  key={role}
                  className="px-3 py-1 text-sm font-medium bg-blue-100 text-blue-800 rounded-full"
                >
                  {role}
                </span>
              ))}
            </div>
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={updateMutation.isPending}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
            >
              {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default Profile

