import React, { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'
import { Settings } from 'lucide-react'

const UserDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [selectedRoles, setSelectedRoles] = useState<string[]>([])
  const [isLoadingRoles, setIsLoadingRoles] = useState(false)
  const [showRoleModal, setShowRoleModal] = useState(false)

  const allRoles = ['ADMIN', 'EMPLOYEE']

  const { data: user, isLoading } = useQuery({
    queryKey: ['user', id],
    queryFn: async () => {
      const response = await api.get(`/api/v1/admin/users/${id}`)
      return response.data
    },
  })

  const openRoleModal = () => {
    setSelectedRoles(user?.roles || [])
    setShowRoleModal(true)
  }

  const toggleRole = (role: string) => {
    setSelectedRoles(prev =>
      prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]
    )
  }

  const saveRoles = async () => {
    if (!user) return
    
    setIsLoadingRoles(true)
    try {
      await api.patch(`/api/v1/admin/users/${user.id}/roles`, {
        roles: selectedRoles,
      })
      
      queryClient.invalidateQueries({ queryKey: ['user', id] })
      setShowRoleModal(false)
      alert('Roles updated successfully!')
    } catch (error) {
      console.error('Failed to update roles:', error)
      alert('Failed to update roles')
    } finally {
      setIsLoadingRoles(false)
    }
  }

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
          <div className="flex items-center justify-between mb-1">
            <label className="text-sm font-medium text-gray-700">Roles</label>
            <button
              onClick={openRoleModal}
              className="text-green-600 hover:text-green-900 flex items-center gap-1 text-sm"
            >
              <Settings className="w-4 h-4" />
              Manage Roles
            </button>
          </div>
          <div className="flex space-x-2">
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

      {/* Role Management Modal */}
      {showRoleModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full">
            <h2 className="text-2xl font-bold mb-4">
              Manage Roles for {user?.displayName || user?.email}
            </h2>
            
            <div className="space-y-3 mb-6">
              {allRoles.map((role) => (
                <label key={role} className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedRoles.includes(role)}
                    onChange={() => toggleRole(role)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-900">{role}</span>
                </label>
              ))}
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowRoleModal(false)}
                disabled={isLoadingRoles}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={saveRoles}
                disabled={isLoadingRoles}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
              >
                {isLoadingRoles ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default UserDetail

