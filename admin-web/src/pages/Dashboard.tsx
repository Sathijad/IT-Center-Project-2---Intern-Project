import React from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useQuery } from '@tanstack/react-query'
import api from '../lib/api'
import { Users, FileText, Clock } from 'lucide-react'

const Dashboard: React.FC = () => {
  const { user } = useAuth()

  const { data: userStats } = useQuery({
    queryKey: ['user-stats'],
    queryFn: async () => {
      const response = await api.get('/api/v1/admin/users', { params: { size: 1 } })
      return response.data
    },
    enabled: !!user?.roles?.includes('ADMIN'),
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-2 text-gray-600">Welcome back, {user?.displayName || user?.email}</p>
      </div>

      {user?.roles?.includes('ADMIN') && (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <Users className="w-8 h-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Users</p>
                <p className="text-2xl font-bold text-gray-900">
                  {userStats?.totalElements || '...'}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <FileText className="w-8 h-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Audit Logs</p>
                <p className="text-2xl font-bold text-gray-900">
                  {userStats?.totalElements || '...'}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <Clock className="w-8 h-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Last Active</p>
                <p className="text-sm font-medium text-gray-900">
                  {user?.lastLogin 
                    ? new Date(user.lastLogin).toLocaleDateString()
                    : 'Never'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <button className="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-600 transition text-left">
            <h3 className="font-medium text-gray-900">View Profile</h3>
            <p className="text-sm text-gray-600 mt-1">Update your profile information</p>
          </button>
          {user?.roles?.includes('ADMIN') && (
            <>
              <button className="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-600 transition text-left">
                <h3 className="font-medium text-gray-900">Manage Users</h3>
                <p className="text-sm text-gray-600 mt-1">Add, edit, or remove users</p>
              </button>
              <button className="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-600 transition text-left">
                <h3 className="font-medium text-gray-900">Audit Log</h3>
                <p className="text-sm text-gray-600 mt-1">View system audit trail</p>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default Dashboard

