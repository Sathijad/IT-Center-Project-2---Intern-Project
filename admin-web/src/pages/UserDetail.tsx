import React from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import api from '../lib/api'

const UserDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const { data: user, isLoading } = useQuery({
    queryKey: ['user', id],
    queryFn: async () => {
      const response = await api.get(`/api/v1/admin/users/${id}`)
      return response.data
    },
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">User not found</p>
        <button
          onClick={() => navigate('/users')}
          className="mt-4 text-blue-600 hover:text-blue-800"
        >
          Back to Users
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">User Details</h1>
          <p className="mt-2 text-gray-600">{user.email}</p>
        </div>
        <button
          onClick={() => navigate('/users')}
          className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          Back
        </button>
      </div>

      <div className="bg-white rounded-lg shadow p-6 space-y-4">
        <div>
          <label className="text-sm font-medium text-gray-700">Email</label>
          <p className="mt-1 text-gray-900">{user.email}</p>
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700">Display Name</label>
          <p className="mt-1 text-gray-900">{user.displayName || '-'}</p>
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700">Roles</label>
          <div className="mt-1 flex space-x-2">
            {user.roles?.map((role: string) => (
              <span
                key={role}
                className="px-3 py-1 text-sm font-medium bg-blue-100 text-blue-800 rounded-full"
              >
                {role}
              </span>
            ))}
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700">Created At</label>
          <p className="mt-1 text-gray-900">
            {new Date(user.createdAt).toLocaleString()}
          </p>
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700">Last Login</label>
          <p className="mt-1 text-gray-900">
            {user.lastLogin 
              ? new Date(user.lastLogin).toLocaleString()
              : 'Never'}
          </p>
        </div>
      </div>
    </div>
  )
}

export default UserDetail

