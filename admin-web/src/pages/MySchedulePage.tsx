import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../contexts/AuthContext'
import {
  listMySchedules,
  type Schedule,
  type PagedResponse,
} from '../lib/schedulesApi'

const defaultRange = () => {
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  const end = new Date(start)
  end.setDate(end.getDate() + 7)
  return {
    rangeStart: start.toISOString(),
    rangeEnd: end.toISOString(),
  }
}

const MySchedulePage = () => {
  const { user } = useAuth()
  const [filters, setFilters] = useState(() => defaultRange())

  const { data, isLoading, error } = useQuery<PagedResponse<Schedule>>({
    queryKey: ['my-schedules', filters],
    queryFn: () => {
      return listMySchedules({
        rangeStart: filters.rangeStart,
        rangeEnd: filters.rangeEnd,
      })
    },
    enabled: !!user?.id,
  })

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold text-gray-900">My Schedule</h1>
        <p className="text-sm text-gray-500">View your upcoming shifts and schedules.</p>
      </header>

      <section className="bg-white p-6 rounded-xl shadow border border-gray-100 space-y-4">
        <h2 className="text-lg font-semibold text-gray-800">Date Range</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="flex flex-col text-sm text-gray-600">
            Range Start
            <input
              type="datetime-local"
              className="mt-1 rounded border px-3 py-2"
              value={filters.rangeStart ? new Date(filters.rangeStart).toISOString().slice(0, 16) : ''}
              onChange={(e) => setFilters((prev) => ({ ...prev, rangeStart: e.target.value ? new Date(e.target.value).toISOString() : '' }))}
            />
          </label>
          <label className="flex flex-col text-sm text-gray-600">
            Range End
            <input
              type="datetime-local"
              className="mt-1 rounded border px-3 py-2"
              value={filters.rangeEnd ? new Date(filters.rangeEnd).toISOString().slice(0, 16) : ''}
              onChange={(e) => setFilters((prev) => ({ ...prev, rangeEnd: e.target.value ? new Date(e.target.value).toISOString() : '' }))}
            />
          </label>
        </div>
      </section>

      <section className="bg-white rounded-xl shadow border border-gray-100">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800">My Schedules</h2>
          <span className="text-sm text-gray-500">{data?.totalCount ?? 0} schedules</span>
        </div>
        {isLoading && <p className="p-4 text-sm text-gray-500">Loading schedules...</p>}
        {error && <p className="p-4 text-sm text-red-600">Failed to load schedules.</p>}
        {!isLoading && data && (
          <div className="divide-y divide-gray-100">
            {data.items.map((schedule) => (
              <article key={schedule.scheduleId} className="p-4">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-base font-semibold text-gray-900">{schedule.title}</p>
                    <p className="text-sm text-gray-500">{schedule.description || 'No description'}</p>
                    <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
                      <span>Start: {new Date(schedule.startTime).toLocaleString()}</span>
                      <span>End: {new Date(schedule.endTime).toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="mt-3 md:mt-0">
                    <span className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                      {schedule.status}
                    </span>
                  </div>
                </div>
              </article>
            ))}
            {data.items.length === 0 && (
              <p className="p-6 text-center text-sm text-gray-500">No schedules found in this date range.</p>
            )}
          </div>
        )}
      </section>
    </div>
  )
}

export default MySchedulePage

