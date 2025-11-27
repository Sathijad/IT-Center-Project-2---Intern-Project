import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  listSchedules,
  createSchedule,
  deleteSchedule,
  type Schedule,
  type PagedResponse,
} from '../lib/schedulesApi'

const scheduleSchema = z.object({
  userId: z.preprocess((val) => Number(val), z.number().positive('User ID is required')),
  teamId: z
    .preprocess((val) => (val === '' || val === undefined ? undefined : Number(val)), z.number().positive())
    .optional(),
  title: z.string().min(3),
  description: z.string().optional(),
  startTime: z.string().min(1, 'Start time is required'),
  endTime: z.string().min(1, 'End time is required'),
  isAllDay: z.boolean().optional().default(false),
  createRecurrence: z.boolean().optional().default(false),
  recurrencePattern: z.string().optional(),
  recurrenceInterval: z.preprocess((val) => (val === '' || val === undefined ? undefined : Number(val)), z.number().int().positive()).optional(),
  recurrenceByDay: z.string().optional(),
  recurrenceByMonthDay: z.string().optional(),
  recurrenceUntil: z.string().optional(),
}).refine((data) => {
  // If createRecurrence is true, pattern is required
  if (data.createRecurrence && !data.recurrencePattern) {
    return false
  }
  return true
}, {
  message: 'Recurrence pattern is required when creating a recurring schedule',
  path: ['recurrencePattern'],
})

type ScheduleForm = z.infer<typeof scheduleSchema>

const defaultRange = () => {
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  const end = new Date(start)
  end.setDate(end.getDate() + 7)
  return {
    rangeStart: start.toISOString().slice(0, 16),
    rangeEnd: end.toISOString().slice(0, 16),
  }
}

const SchedulesPlannerPage = () => {
  const queryClient = useQueryClient()
  const [filters, setFilters] = useState(() => ({
    userId: '',
    teamId: '',
    ...defaultRange(),
  }))

  const { register, handleSubmit, reset, formState, watch } = useForm<ScheduleForm>({
    resolver: zodResolver(scheduleSchema),
    defaultValues: {
      title: '',
      startTime: new Date().toISOString().slice(0, 16),
      endTime: new Date(Date.now() + 60 * 60 * 1000).toISOString().slice(0, 16),
      isAllDay: false,
      createRecurrence: false,
      recurrencePattern: '',
      recurrenceInterval: 1,
      recurrenceByDay: '',
      recurrenceByMonthDay: '',
      recurrenceUntil: '',
    },
  })

  const createRecurrence = watch('createRecurrence')

  const { data, isLoading, error } = useQuery<PagedResponse<Schedule>>({
    queryKey: ['schedules', filters],
    queryFn: () => {
      const params: Record<string, any> = {}
      
      // Only include parameters if they have values (not empty strings)
      if (filters.userId && filters.userId.trim() !== '') {
        const userIdNum = Number(filters.userId)
        if (!isNaN(userIdNum) && userIdNum > 0) {
          params.userId = userIdNum
        }
      }
      if (filters.teamId && filters.teamId.trim() !== '') {
        const teamIdNum = Number(filters.teamId)
        if (!isNaN(teamIdNum) && teamIdNum > 0) {
          params.teamId = teamIdNum
        }
      }
      if (filters.rangeStart && filters.rangeStart.trim() !== '') {
        params.rangeStart = new Date(filters.rangeStart).toISOString()
      }
      if (filters.rangeEnd && filters.rangeEnd.trim() !== '') {
        params.rangeEnd = new Date(filters.rangeEnd).toISOString()
      }
      
      return listSchedules(params)
    },
  })

  const createMutation = useMutation({
    mutationFn: (payload: ScheduleForm) => {
      const schedulePayload: any = {
        userId: payload.userId,
        teamId: payload.teamId,
        title: payload.title,
        description: payload.description,
        startTime: new Date(payload.startTime).toISOString(),
        endTime: new Date(payload.endTime).toISOString(),
        isAllDay: payload.isAllDay,
        createRecurrence: payload.createRecurrence || false,
      }

      // Add recurrence data if enabled
      if (payload.createRecurrence && payload.recurrencePattern) {
        schedulePayload.recurrence = {
          pattern: payload.recurrencePattern,
          interval: payload.recurrenceInterval || 1,
          byDay: payload.recurrenceByDay || null,
          byMonthDay: payload.recurrenceByMonthDay || null,
          until: payload.recurrenceUntil ? new Date(payload.recurrenceUntil).toISOString() : null,
        }
      }

      return createSchedule(schedulePayload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] })
      reset()
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteSchedule(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] })
    },
  })

  const onSubmit = (values: ScheduleForm) => {
    createMutation.mutate(values)
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold text-gray-900">Weekly Schedule Planner</h1>
        <p className="text-sm text-gray-500">Create, view, and manage staff schedules with conflict checks.</p>
      </header>

      <section className="grid gap-6 md:grid-cols-2">
        <form onSubmit={handleSubmit(onSubmit)} className="bg-white p-6 rounded-xl shadow border border-gray-100 space-y-4">
          <h2 className="text-lg font-semibold text-gray-800">Create Schedule</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="flex flex-col text-sm text-gray-600">
              User ID
              <input type="number" className="mt-1 rounded border px-3 py-2" {...register('userId')} />
              {formState.errors.userId && <span className="text-xs text-red-600">{formState.errors.userId.message}</span>}
            </label>
            <label className="flex flex-col text-sm text-gray-600">
              Team ID
              <input type="number" className="mt-1 rounded border px-3 py-2" {...register('teamId')} />
            </label>
          </div>
          <label className="flex flex-col text-sm text-gray-600">
            Title
            <input type="text" className="mt-1 rounded border px-3 py-2" {...register('title')} />
            {formState.errors.title && <span className="text-xs text-red-600">{formState.errors.title.message}</span>}
          </label>
          <label className="flex flex-col text-sm text-gray-600">
            Description
            <textarea className="mt-1 rounded border px-3 py-2" rows={3} {...register('description')} />
          </label>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="flex flex-col text-sm text-gray-600">
              Start Time
              <input type="datetime-local" className="mt-1 rounded border px-3 py-2" {...register('startTime')} />
            </label>
            <label className="flex flex-col text-sm text-gray-600">
              End Time
              <input type="datetime-local" className="mt-1 rounded border px-3 py-2" {...register('endTime')} />
            </label>
          </div>
          <label className="inline-flex items-center text-sm text-gray-600 space-x-2">
            <input type="checkbox" {...register('isAllDay')} />
            <span>All day event</span>
          </label>

          <div className="border-t border-gray-200 pt-4 space-y-4">
            <label className="inline-flex items-center text-sm text-gray-600 space-x-2">
              <input type="checkbox" {...register('createRecurrence')} />
              <span className="font-semibold">Create recurring schedule</span>
            </label>

            {createRecurrence && (
              <div className="ml-6 space-y-4 bg-gray-50 p-4 rounded-lg border border-gray-200">
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="flex flex-col text-sm text-gray-600">
                    Recurrence Pattern *
                    <select className="mt-1 rounded border px-3 py-2" {...register('recurrencePattern')}>
                      <option value="">Select pattern</option>
                      <option value="DAILY">Daily</option>
                      <option value="WEEKLY">Weekly</option>
                      <option value="MONTHLY">Monthly</option>
                      <option value="YEARLY">Yearly</option>
                    </select>
                    {formState.errors.recurrencePattern && (
                      <span className="text-xs text-red-600">{formState.errors.recurrencePattern.message}</span>
                    )}
                  </label>
                  <label className="flex flex-col text-sm text-gray-600">
                    Interval (every N)
                    <input
                      type="number"
                      min="1"
                      className="mt-1 rounded border px-3 py-2"
                      {...register('recurrenceInterval')}
                      defaultValue={1}
                    />
                  </label>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="flex flex-col text-sm text-gray-600">
                    By Day (e.g., MO, TU, WE or MO,TU,WE)
                    <input
                      type="text"
                      placeholder="MO, TU, WE"
                      className="mt-1 rounded border px-3 py-2"
                      {...register('recurrenceByDay')}
                    />
                    <span className="text-xs text-gray-500 mt-1">Comma-separated day codes (MO, TU, WE, TH, FR, SA, SU)</span>
                  </label>
                  <label className="flex flex-col text-sm text-gray-600">
                    By Month Day (e.g., 1, 15, -1)
                    <input
                      type="text"
                      placeholder="1, 15"
                      className="mt-1 rounded border px-3 py-2"
                      {...register('recurrenceByMonthDay')}
                    />
                    <span className="text-xs text-gray-500 mt-1">Comma-separated day numbers (1-31, negative for end of month)</span>
                  </label>
                </div>

                <label className="flex flex-col text-sm text-gray-600">
                  Repeat Until (optional)
                  <input
                    type="datetime-local"
                    className="mt-1 rounded border px-3 py-2"
                    {...register('recurrenceUntil')}
                  />
                  <span className="text-xs text-gray-500 mt-1">Leave empty for no end date</span>
                </label>
              </div>
            )}
          </div>

          <button
            type="submit"
            className="w-full rounded bg-blue-600 text-white py-2 font-semibold hover:bg-blue-700 transition disabled:opacity-50"
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? 'Saving...' : 'Create Schedule'}
          </button>
          {createMutation.isError && <p className="text-sm text-red-600">Failed to create schedule.</p>}
        </form>

        <div className="bg-white p-6 rounded-xl shadow border border-gray-100 space-y-4">
          <h2 className="text-lg font-semibold text-gray-800">Filters</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="flex flex-col text-sm text-gray-600">
              User ID
              <input
                type="text"
                className="mt-1 rounded border px-3 py-2"
                value={filters.userId}
                onChange={(e) => setFilters((prev) => ({ ...prev, userId: e.target.value }))}
              />
            </label>
            <label className="flex flex-col text-sm text-gray-600">
              Team ID
              <input
                type="text"
                className="mt-1 rounded border px-3 py-2"
                value={filters.teamId}
                onChange={(e) => setFilters((prev) => ({ ...prev, teamId: e.target.value }))}
              />
            </label>
          </div>
          <label className="flex flex-col text-sm text-gray-600">
            Range Start
            <input
              type="datetime-local"
              className="mt-1 rounded border px-3 py-2"
              value={filters.rangeStart}
              onChange={(e) => setFilters((prev) => ({ ...prev, rangeStart: e.target.value }))}
            />
          </label>
          <label className="flex flex-col text-sm text-gray-600">
            Range End
            <input
              type="datetime-local"
              className="mt-1 rounded border px-3 py-2"
              value={filters.rangeEnd}
              onChange={(e) => setFilters((prev) => ({ ...prev, rangeEnd: e.target.value }))}
            />
          </label>
        </div>
      </section>

      <section className="bg-white rounded-xl shadow border border-gray-100">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800">Upcoming schedules</h2>
          <span className="text-sm text-gray-500">{data?.totalCount ?? 0} records</span>
        </div>
        {isLoading && <p className="p-4 text-sm text-gray-500">Loading schedules...</p>}
        {error && <p className="p-4 text-sm text-red-600">Failed to load schedules.</p>}
        {!isLoading && data && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {['User', 'Team', 'Title', 'Start', 'End', 'Recurrence', 'Status', 'Actions'].map((header) => (
                    <th key={header} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {data.items.map((item) => (
                  <tr key={item.scheduleId}>
                    <td className="px-4 py-3 text-sm text-gray-900">{item.userId}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{item.teamId ?? '-'}</td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{item.title}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{new Date(item.startTime).toLocaleString()}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{new Date(item.endTime).toLocaleString()}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {item.recurrence ? (
                        <div className="flex flex-col">
                          <span className="font-medium">{item.recurrence.pattern}</span>
                          {item.recurrence.interval && item.recurrence.interval > 1 && (
                            <span className="text-xs text-gray-400">Every {item.recurrence.interval}</span>
                          )}
                          {item.recurrence.byDay && (
                            <span className="text-xs text-gray-400">{item.recurrence.byDay}</span>
                          )}
                          {item.recurrence.until && (
                            <span className="text-xs text-gray-400">Until {new Date(item.recurrence.until).toLocaleDateString()}</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                        {item.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <button
                        className="text-red-600 hover:text-red-800"
                        onClick={() => deleteMutation.mutate(item.scheduleId)}
                        disabled={deleteMutation.isPending}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
                {data.items.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-6 text-center text-sm text-gray-500">
                      No schedules in this range.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}

export default SchedulesPlannerPage

