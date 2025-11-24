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

  const { register, handleSubmit, reset, formState } = useForm<ScheduleForm>({
    resolver: zodResolver(scheduleSchema),
    defaultValues: {
      title: '',
      startTime: new Date().toISOString().slice(0, 16),
      endTime: new Date(Date.now() + 60 * 60 * 1000).toISOString().slice(0, 16),
      isAllDay: false,
    },
  })

  const { data, isLoading, error } = useQuery<PagedResponse<Schedule>>({
    queryKey: ['schedules', filters],
    queryFn: () =>
      listSchedules({
        user_id: filters.userId || undefined,
        team_id: filters.teamId || undefined,
        rangeStart: filters.rangeStart ? new Date(filters.rangeStart).toISOString() : undefined,
        rangeEnd: filters.rangeEnd ? new Date(filters.rangeEnd).toISOString() : undefined,
      }),
  })

  const createMutation = useMutation({
    mutationFn: (payload: ScheduleForm) =>
      createSchedule({
        userId: payload.userId,
        teamId: payload.teamId,
        title: payload.title,
        description: payload.description,
        startTime: new Date(payload.startTime).toISOString(),
        endTime: new Date(payload.endTime).toISOString(),
        isAllDay: payload.isAllDay,
        createRecurrence: false,
      }),
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
                  {['User', 'Team', 'Title', 'Start', 'End', 'Status', 'Actions'].map((header) => (
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
                    <td colSpan={7} className="px-4 py-6 text-center text-sm text-gray-500">
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

