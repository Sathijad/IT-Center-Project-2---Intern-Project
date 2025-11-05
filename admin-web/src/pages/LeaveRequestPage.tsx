import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../contexts/AuthContext'
import { getLeaveRequests, updateLeaveRequest, type LeaveRequest } from '../lib/leaveApi'
import { LeaveRequestTable } from '../components/LeaveRequestTable'
import { LeaveApprovalCard } from '../components/LeaveApprovalCard'
import { Calendar, CheckCircle, XCircle, Clock } from 'lucide-react'

const LeaveRequestPage: React.FC = () => {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [page, setPage] = useState(0)

  const isAdmin = user?.roles?.includes('ADMIN')

  const { data, isLoading, error } = useQuery({
    queryKey: ['leave-requests', statusFilter, page],
    queryFn: () => getLeaveRequests({
      status: statusFilter || undefined,
      page,
      size: 20,
      sort: 'created_at,desc'
    }),
    staleTime: 60000, // 1 minute
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: { action: string; notes?: string } }) =>
      updateLeaveRequest(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-requests'] })
      setSelectedRequest(null)
    },
  })

  const handleApprove = (request: LeaveRequest) => {
    updateMutation.mutate({ id: request.request_id, data: { action: 'APPROVE' } })
  }

  const handleReject = (request: LeaveRequest, notes?: string) => {
    updateMutation.mutate({ id: request.request_id, data: { action: 'REJECT', notes } })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">Error loading leave requests. Please try again.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          {isAdmin ? 'Leave Requests Management' : 'My Leave Requests'}
        </h1>
        <p className="mt-2 text-gray-600">View and manage leave requests</p>
      </div>

      {isAdmin && (
        <div className="flex gap-4">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value)
              setPage(0)
            }}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
          >
            <option value="">All Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>
      )}

      {data?.content && data.content.length > 0 ? (
        <>
          <LeaveRequestTable
            requests={data.content}
            isAdmin={isAdmin}
            onSelect={setSelectedRequest}
          />

          {selectedRequest && isAdmin && (
            <LeaveApprovalCard
              request={selectedRequest}
              onApprove={handleApprove}
              onReject={handleReject}
              onClose={() => setSelectedRequest(null)}
            />
          )}

          {/* Pagination */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Showing {data.page * data.size + 1} to {Math.min((data.page + 1) * data.size, data.totalElements)} of {data.totalElements} requests
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
                className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Previous
              </button>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={page >= data.totalPages - 1}
                className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Next
              </button>
            </div>
          </div>
        </>
      ) : (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No leave requests found</p>
        </div>
      )}
    </div>
  )
}

export default LeaveRequestPage

