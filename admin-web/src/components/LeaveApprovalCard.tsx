import React, { useState } from 'react'
import { type LeaveRequest } from '../lib/leaveApi'
import { CheckCircle, XCircle, X } from 'lucide-react'

interface LeaveApprovalCardProps {
  request: LeaveRequest
  onApprove: (request: LeaveRequest) => void
  onReject: (request: LeaveRequest, notes?: string) => void
  onClose: () => void
}

export const LeaveApprovalCard: React.FC<LeaveApprovalCardProps> = ({
  request,
  onApprove,
  onReject,
  onClose,
}) => {
  const [rejectNotes, setRejectNotes] = useState('')
  const [showRejectForm, setShowRejectForm] = useState(false)

  if (request.status !== 'PENDING') {
    return null
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900">Review Leave Request</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
              aria-label="Close"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Employee</label>
              <p className="mt-1 text-sm text-gray-900">{request.user_name} ({request.user_email})</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Leave Policy</label>
              <p className="mt-1 text-sm text-gray-900">{request.policy_name}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Start Date</label>
                <p className="mt-1 text-sm text-gray-900">{new Date(request.start_date).toLocaleDateString()}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">End Date</label>
                <p className="mt-1 text-sm text-gray-900">{new Date(request.end_date).toLocaleDateString()}</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Total Days</label>
              <p className="mt-1 text-sm text-gray-900">{request.days} days</p>
            </div>

            {request.reason && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Reason</label>
                <p className="mt-1 text-sm text-gray-900">{request.reason}</p>
              </div>
            )}

            {showRejectForm && (
              <div>
                <label htmlFor="reject-notes" className="block text-sm font-medium text-gray-700 mb-2">
                  Rejection Reason (Optional)
                </label>
                <textarea
                  id="reject-notes"
                  value={rejectNotes}
                  onChange={(e) => setRejectNotes(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                  placeholder="Provide a reason for rejection..."
                />
              </div>
            )}
          </div>

          <div className="mt-6 flex gap-4">
            <button
              onClick={() => onApprove(request)}
              className="flex-1 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 flex items-center justify-center gap-2"
            >
              <CheckCircle className="w-5 h-5" />
              Approve
            </button>
            {!showRejectForm ? (
              <button
                onClick={() => setShowRejectForm(true)}
                className="flex-1 bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 flex items-center justify-center gap-2"
              >
                <XCircle className="w-5 h-5" />
                Reject
              </button>
            ) : (
              <button
                onClick={() => onReject(request, rejectNotes)}
                className="flex-1 bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 flex items-center justify-center gap-2"
              >
                <XCircle className="w-5 h-5" />
                Confirm Rejection
              </button>
            )}
            <button
              onClick={onClose}
              className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

