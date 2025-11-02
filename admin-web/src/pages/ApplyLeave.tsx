import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createLeaveRequest, getLeaveBalance } from '../lib/api'
import { useAuth } from '../contexts/AuthContext'
import { Calendar, Save, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

type LeavePolicy = {
  id: number
  type: string
  maxDays: number
  description: string | null
}

export default function ApplyLeave() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [formData, setFormData] = useState({
    policyId: '',
    startDate: '',
    endDate: '',
    halfDay: '' as '' | 'AM' | 'PM',
    reason: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Fetch leave policies and balances
  const { data: balanceData } = useQuery({
    queryKey: ['leaveBalance'],
    queryFn: async () => {
      const response = await getLeaveBalance()
      return response.data
    },
  })

  // Hardcoded policies for now (should come from API)
  const policies: LeavePolicy[] = [
    { id: 1, type: 'ANNUAL', maxDays: 20, description: 'Annual leave' },
    { id: 2, type: 'CASUAL', maxDays: 10, description: 'Casual leave' },
    { id: 3, type: 'SICK', maxDays: 7, description: 'Sick leave' },
  ]

  const createMutation = useMutation({
    mutationFn: (data: any) => createLeaveRequest(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leaveRequests'] })
      queryClient.invalidateQueries({ queryKey: ['leaveBalance'] })
      alert('Leave request submitted successfully!')
      navigate('/leave')
    },
    onError: (err: any) => {
      const errorMsg = err.response?.data?.message || 'Failed to submit leave request'
      alert(errorMsg)
      if (err.response?.data?.code === 'LEAVE_OVERLAP') {
        setErrors({ overlap: 'This leave period overlaps with an existing request' })
      }
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})

    // Validation
    const newErrors: Record<string, string> = {}
    if (!formData.policyId) newErrors.policyId = 'Please select a leave type'
    if (!formData.startDate) newErrors.startDate = 'Start date is required'
    if (!formData.endDate) newErrors.endDate = 'End date is required'

    if (formData.startDate && formData.endDate) {
      const start = new Date(formData.startDate)
      const end = new Date(formData.endDate)
      if (end < start) {
        newErrors.endDate = 'End date must be after start date'
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    createMutation.mutate({
      policyId: parseInt(formData.policyId, 10),
      startDate: formData.startDate,
      endDate: formData.endDate,
      halfDay: formData.halfDay || undefined,
      reason: formData.reason || undefined,
    })
  }

  const selectedPolicy = policies.find((p) => p.id === parseInt(formData.policyId, 10))
  const balance = balanceData?.data?.find(
    (b: any) => b.policyId === parseInt(formData.policyId, 10)
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Apply for Leave</h1>
        <p className="mt-2 text-gray-600">Submit a new leave request</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Leave Type *
          </label>
          <select
            value={formData.policyId}
            onChange={(e) => setFormData({ ...formData, policyId: e.target.value })}
            className={`w-full px-3 py-2 border rounded-md ${
              errors.policyId ? 'border-red-500' : 'border-gray-300'
            }`}
          >
            <option value="">Select leave type</option>
            {policies.map((policy) => (
              <option key={policy.id} value={policy.id}>
                {policy.type} - {policy.description}
              </option>
            ))}
          </select>
          {errors.policyId && (
            <p className="mt-1 text-sm text-red-600">{errors.policyId}</p>
          )}
          {selectedPolicy && balance && (
            <p className="mt-1 text-sm text-gray-600">
              Available balance: {balance.balanceDays} days
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Start Date *
            </label>
            <input
              type="date"
              value={formData.startDate}
              onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              min={new Date().toISOString().split('T')[0]}
              className={`w-full px-3 py-2 border rounded-md ${
                errors.startDate ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.startDate && (
              <p className="mt-1 text-sm text-red-600">{errors.startDate}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              End Date *
            </label>
            <input
              type="date"
              value={formData.endDate}
              onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
              min={formData.startDate || new Date().toISOString().split('T')[0]}
              className={`w-full px-3 py-2 border rounded-md ${
                errors.endDate ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.endDate && (
              <p className="mt-1 text-sm text-red-600">{errors.endDate}</p>
            )}
          </div>
        </div>

        {formData.startDate === formData.endDate && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Half Day
            </label>
            <select
              value={formData.halfDay}
              onChange={(e) =>
                setFormData({ ...formData, halfDay: e.target.value as 'AM' | 'PM' | '' })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="">Full Day</option>
              <option value="AM">Morning (AM)</option>
              <option value="PM">Afternoon (PM)</option>
            </select>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Reason (Optional)
          </label>
          <textarea
            value={formData.reason}
            onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            placeholder="Enter reason for leave..."
          />
        </div>

        {errors.overlap && (
          <div className="p-4 bg-red-50 text-red-800 rounded">
            {errors.overlap}
          </div>
        )}

        <div className="flex justify-end gap-4">
          <button
            type="button"
            onClick={() => navigate('/leave')}
            className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 flex items-center gap-2"
          >
            <X className="w-4 h-4" />
            Cancel
          </button>
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            {createMutation.isPending ? 'Submitting...' : 'Submit Request'}
          </button>
        </div>
      </form>
    </div>
  )
}

