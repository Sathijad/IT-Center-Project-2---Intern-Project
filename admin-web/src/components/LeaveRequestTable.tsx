import React from 'react'
import { type LeaveRequest } from '../lib/leaveApi'
import { Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react'

interface LeaveRequestTableProps {
  requests: LeaveRequest[]
  isAdmin: boolean
  onSelect?: (request: LeaveRequest) => void
}

export const LeaveRequestTable: React.FC<LeaveRequestTableProps> = ({
  requests,
  isAdmin,
  onSelect,
}) => {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return <CheckCircle className="w-5 h-5 text-green-600" />
      case 'REJECTED':
        return <XCircle className="w-5 h-5 text-red-600" />
      case 'PENDING':
        return <Clock className="w-5 h-5 text-yellow-600" />
      case 'CANCELLED':
        return <AlertCircle className="w-5 h-5 text-gray-600" />
      default:
        return null
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return 'bg-green-100 text-green-800'
      case 'REJECTED':
        return 'bg-red-100 text-red-800'
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800'
      case 'CANCELLED':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {isAdmin && <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>}
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Policy</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dates</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Days</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
            {isAdmin && <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {requests.map((request) => {
            const days =
              typeof request.daysRequested === 'number'
                ? request.daysRequested
                : Number(request.daysRequested) || 0
            const formattedDays = Number.isInteger(days) ? days : Number(days.toFixed(1))

            return (
              <tr
              key={request.requestId}
              className="hover:bg-gray-50 cursor-pointer"
              onClick={() => onSelect?.(request)}
            >
              {isAdmin && (
                <td className="px-6 py-4 whitespace-nowrap">
                  <div>
                    <div className="text-sm font-medium text-gray-900">{request.userName ?? 'Unknown user'}</div>
                    <div className="text-sm text-gray-500">{request.userEmail}</div>
                  </div>
                </td>
              )}
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-900">{request.policyName}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-900">
                  {new Date(request.startDate).toLocaleDateString()} - {new Date(request.endDate).toLocaleDateString()}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-900">
                  {formattedDays} {formattedDays === 1 ? 'day' : 'days'}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
                  {getStatusIcon(request.status)}
                  {request.status}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {new Date(request.createdAt).toLocaleDateString()}
              </td>
              {isAdmin && (
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  {request.status === 'PENDING' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onSelect?.(request)
                      }}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      Review
                    </button>
                  )}
                </td>
              )}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

