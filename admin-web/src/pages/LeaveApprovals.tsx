import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getLeaveRequests, updateLeaveRequestStatus } from '../lib/api'
import { Check, X, Clock } from 'lucide-react'

type LeaveRequest = {
  id: number
  userId: number
  policyId: number
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED'
  startDate: string
  endDate: string
  halfDay: 'AM' | 'PM' | null
  reason: string | null
  createdAt: string
  // Extended fields (would need to join with app_users)
  userEmail?: string
  userName?: string
}

export default function LeaveApprovals() {
  const queryClient = useQueryClient()
  const [rejectionReasons, setRejectionReasons] = useState<Record<number, string>>({})

  const { data, isLoading } = useQuery({
    queryKey: ['leaveApprovals'],
    queryFn: async () => {
      const response = await getLeaveRequests({ status: 'PENDING' })
      return response.data
    },
  })

  const approveMutation = useMutation({
    mutationFn: (id: number) => updateLeaveRequestStatus(id, 'APPROVED'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leaveApprovals'] })
      alert('Leave request approved')
    },
  })

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason?: string }) =>
      updateLeaveRequestStatus(id, 'REJECTED', reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leaveApprovals'] })
      setRejectionReasons({})
      alert('Leave request rejected')
    },
  })

  const handleApprove = (id: number) => {
    if (confirm('Approve this leave request?')) {
      approveMutation.mutate(id)
    }
  }

  const handleReject = (id: number) => {
    const reason = rejectionReasons[id] || ''
    if (!reason && !confirm('Reject without a reason?')) {
      return
    }
    rejectMutation.mutate({ id, reason: reason || undefined })
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  const requests = data?.data || []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Pending Leave Approvals</h1>
        <p className="mt-2 text-gray-600">
          {requests.length} pending request{requests.length !== 1 ? 's' : ''}
        </p>
      </div>

      {requests.length === 0 ? (
        <div className="bg-white p-8 rounded-lg shadow text-center">
          <Check className="w-12 h-12 mx-auto text-green-400 mb-4" />
          <p className="text-gray-600">No pending leave requests</p>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((request: LeaveRequest) => (
            <div key={request.id} className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="w-5 h-5 text-yellow-500" />
                    <span className="text-sm font-medium text-gray-700">
                      Request #{request.id}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Period:</span>{' '}
                      {formatDate(request.startDate)} - {formatDate(request.endDate)}
                      {request.halfDay && ` (${request.halfDay})`}
                    </p>
                    {request.reason && (
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">Reason:</span> {request.reason}
                      </p>
                    )}
                    <p className="text-sm text-gray-500">
                      Submitted: {formatDate(request.createdAt)}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleApprove(request.id)}
                    disabled={approveMutation.isPending || rejectMutation.isPending}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
                  >
                    <Check className="w-4 h-4" />
                    Approve
                  </button>
                  <button
                    onClick={() => handleReject(request.id)}
                    disabled={approveMutation.isPending || rejectMutation.isPending}
                    className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
                  >
                    <X className="w-4 h-4" />
                    Reject
                  </button>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Rejection Reason (Optional)
                </label>
                <textarea
                  value={rejectionReasons[request.id] || ''}
                  onChange={(e) =>
                    setRejectionReasons({ ...rejectionReasons, [request.id]: e.target.value })
                  }
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  placeholder="Enter rejection reason..."
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

