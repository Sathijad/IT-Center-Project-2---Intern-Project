import React from 'react'
import { useQuery } from '@tanstack/react-query'
import api from '../lib/api'
import { FileText } from 'lucide-react'

const AuditLog: React.FC = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['audit-log'],
    queryFn: async () => {
      const response = await api.get('/api/v1/admin/audit-log', {
        params: { page: 0, size: 50 },
      })
      return response.data
    },
  })

  const audits = data?.content || []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Audit Log</h1>
        <p className="mt-2 text-gray-600">View system activity and login events</p>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        ) : audits.length === 0 ? (
          <div className="p-8 text-center text-gray-600">
            <FileText className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <p>No audit log entries found</p>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Timestamp
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Event
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  IP Address
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {audits.map((audit: any) => (
                <tr key={audit.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(audit.createdAt).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {audit.userEmail || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      audit.eventType === 'LOGIN_SUCCESS'
                        ? 'bg-green-100 text-green-800'
                        : audit.eventType === 'LOGIN_FAILURE'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {audit.eventType}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {audit.ipAddress || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

export default AuditLog
