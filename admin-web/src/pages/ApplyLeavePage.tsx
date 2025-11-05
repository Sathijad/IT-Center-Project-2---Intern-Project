import React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { createLeaveRequest, getLeaveBalance } from '../lib/leaveApi'
import { Calendar, Send, AlertCircle } from 'lucide-react'

const leaveRequestSchema = z.object({
  policy_id: z.number().min(1, 'Please select a leave policy'),
  start_date: z.string().min(1, 'Start date is required'),
  end_date: z.string().min(1, 'End date is required'),
  reason: z.string().max(1000, 'Reason must be less than 1000 characters').optional(),
}).refine(
  (data) => new Date(data.end_date) >= new Date(data.start_date),
  { message: 'End date must be after start date', path: ['end_date'] }
)

type LeaveRequestForm = z.infer<typeof leaveRequestSchema>

const ApplyLeavePage: React.FC = () => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { register, handleSubmit, formState: { errors }, watch } = useForm<LeaveRequestForm>({
    resolver: zodResolver(leaveRequestSchema),
  })

  const { data: balances } = useQuery({
    queryKey: ['leave-balance'],
    queryFn: () => getLeaveBalance(),
  })

  const createMutation = useMutation({
    mutationFn: createLeaveRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-requests'] })
      queryClient.invalidateQueries({ queryKey: ['leave-balance'] })
      navigate('/leave/history')
    },
  })

  const onSubmit = (data: LeaveRequestForm) => {
    createMutation.mutate(data)
  }

  const startDate = watch('start_date')
  const endDate = watch('end_date')
  const days = startDate && endDate
    ? Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1
    : 0

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Apply for Leave</h1>
        <p className="mt-2 text-gray-600">Submit a new leave request</p>
      </div>

      {balances?.balances && balances.balances.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2">Your Leave Balances</h3>
          <div className="grid grid-cols-2 gap-4">
            {balances.balances.map((balance: any) => (
              <div key={balance.policy_id}>
                <p className="text-sm text-blue-700">{balance.policy_name}</p>
                <p className="text-lg font-bold text-blue-900">{balance.balance_days} days</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-lg shadow p-6 space-y-6">
        <div>
          <label htmlFor="policy_id" className="block text-sm font-medium text-gray-700 mb-2">
            Leave Policy *
          </label>
          <select
            id="policy_id"
            {...register('policy_id', { valueAsNumber: true })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
            aria-invalid={errors.policy_id ? 'true' : 'false'}
            aria-describedby={errors.policy_id ? 'policy-error' : undefined}
          >
            <option value="">Select a policy</option>
            <option value="1">Annual Leave (14 days)</option>
            <option value="2">Casual Leave (7 days)</option>
            <option value="3">Sick Leave (10 days)</option>
            <option value="4">Personal Leave (5 days)</option>
          </select>
          {errors.policy_id && (
            <p id="policy-error" className="mt-1 text-sm text-red-600" role="alert">
              {errors.policy_id.message}
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="start_date" className="block text-sm font-medium text-gray-700 mb-2">
              Start Date *
            </label>
            <input
              type="date"
              id="start_date"
              {...register('start_date')}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
              aria-invalid={errors.start_date ? 'true' : 'false'}
              aria-describedby={errors.start_date ? 'start-date-error' : undefined}
            />
            {errors.start_date && (
              <p id="start-date-error" className="mt-1 text-sm text-red-600" role="alert">
                {errors.start_date.message}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="end_date" className="block text-sm font-medium text-gray-700 mb-2">
              End Date *
            </label>
            <input
              type="date"
              id="end_date"
              {...register('end_date')}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
              aria-invalid={errors.end_date ? 'true' : 'false'}
              aria-describedby={errors.end_date ? 'end-date-error' : undefined}
            />
            {errors.end_date && (
              <p id="end-date-error" className="mt-1 text-sm text-red-600" role="alert">
                {errors.end_date.message}
              </p>
            )}
          </div>
        </div>

        {days > 0 && (
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-600">Total Days: <span className="font-semibold">{days}</span></p>
          </div>
        )}

        <div>
          <label htmlFor="reason" className="block text-sm font-medium text-gray-700 mb-2">
            Reason (Optional)
          </label>
          <textarea
            id="reason"
            {...register('reason')}
            rows={4}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
            aria-invalid={errors.reason ? 'true' : 'false'}
            aria-describedby={errors.reason ? 'reason-error' : undefined}
          />
          {errors.reason && (
            <p id="reason-error" className="mt-1 text-sm text-red-600" role="alert">
              {errors.reason.message}
            </p>
          )}
        </div>

        {createMutation.isError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start">
            <AlertCircle className="w-5 h-5 text-red-600 mr-2 mt-0.5" />
            <p className="text-sm text-red-800">
              {createMutation.error instanceof Error
                ? createMutation.error.message
                : 'Failed to submit leave request. Please try again.'}
            </p>
          </div>
        )}

        <div className="flex gap-4">
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {createMutation.isPending ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            ) : (
              <>
                <Send className="w-5 h-5 mr-2" />
                Submit Request
              </>
            )}
          </button>
          <button
            type="button"
            onClick={() => navigate('/leave/history')}
            className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}

export default ApplyLeavePage

