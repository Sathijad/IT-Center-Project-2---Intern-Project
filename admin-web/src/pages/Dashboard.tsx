import React from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useQuery } from '@tanstack/react-query'
import api from '../lib/api'
import { Users, FileText, Clock, Building2, Calendar } from 'lucide-react'
import { Link } from 'react-router-dom'

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
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Link to="/profile" className="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-600 transition text-left">
            <h3 className="font-medium text-gray-900">View Profile</h3>
            <p className="text-sm text-gray-600 mt-1">Update your profile information</p>
          </Link>
          <Link to="/booking/book" className="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-600 transition text-left">
            <div className="flex items-center space-x-2 mb-2">
              <Building2 className="w-5 h-5 text-blue-600" />
              <h3 className="font-medium text-gray-900">Book a Room</h3>
            </div>
            <p className="text-sm text-gray-600 mt-1">Search and book meeting rooms</p>
          </Link>
          <Link to="/booking/my-bookings" className="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-600 transition text-left">
            <div className="flex items-center space-x-2 mb-2">
              <Calendar className="w-5 h-5 text-green-600" />
              <h3 className="font-medium text-gray-900">My Bookings</h3>
            </div>
            <p className="text-sm text-gray-600 mt-1">View your room bookings</p>
          </Link>
          {user?.roles?.includes('ADMIN') && (
            <>
              <Link to="/users" className="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-600 transition text-left">
                <h3 className="font-medium text-gray-900">Manage Users</h3>
                <p className="text-sm text-gray-600 mt-1">Add, edit, or remove users</p>
              </Link>
              <Link to="/audit" className="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-600 transition text-left">
                <h3 className="font-medium text-gray-900">Audit Log</h3>
                <p className="text-sm text-gray-600 mt-1">View system audit trail</p>
              </Link>
              <Link to="/admin/booking/rooms" className="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-600 transition text-left">
                <div className="flex items-center space-x-2 mb-2">
                  <Building2 className="w-5 h-5 text-purple-600" />
                  <h3 className="font-medium text-gray-900">Manage Rooms</h3>
                </div>
                <p className="text-sm text-gray-600 mt-1">Configure rooms and amenities</p>
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default Dashboard

