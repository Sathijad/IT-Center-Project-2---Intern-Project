import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { listSchedules, listTasks } from '../lib/schedulesApi'
import { LineChart, Line, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

const ScheduleReportsPage = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['schedule-reports'],
    queryFn: async () => {
      const [schedules, tasks] = await Promise.all([
        listSchedules({ size: 50 }),
        listTasks({ size: 50 }),
      ])
      return { schedules, tasks }
    },
  })

  const metrics = useMemo(() => {
    if (!data) return null
    const tasksByStatus: Record<string, number> = {}
    const schedulesByDay: Record<string, number> = {}

    data.tasks.items.forEach((task) => {
      tasksByStatus[task.status] = (tasksByStatus[task.status] || 0) + 1
    })

    data.schedules.items.forEach((schedule) => {
      const dateKey = new Date(schedule.startTime).toLocaleDateString()
      schedulesByDay[dateKey] = (schedulesByDay[dateKey] || 0) + 1
    })

    return {
      tasksByStatus: Object.entries(tasksByStatus).map(([status, value]) => ({ status, value })),
      schedulesByDay: Object.entries(schedulesByDay).map(([day, value]) => ({ day, value })),
    }
  }, [data])

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold text-gray-900">Scheduling Reports</h1>
        <p className="text-sm text-gray-500">Monitor workload balance, schedule velocity, and completion trends.</p>
      </header>

      {isLoading && <p className="text-sm text-gray-500">Loading metrics...</p>}
      {error && <p className="text-sm text-red-600">Failed to load reports.</p>}

      {metrics && (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="bg-white rounded-xl shadow border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Schedules created per day</h2>
            {metrics.schedulesByDay.length ? (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={metrics.schedulesByDay}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Line type="monotone" dataKey="value" stroke="#2563eb" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-gray-500">No data for the selected period.</p>
            )}
          </div>

          <div className="bg-white rounded-xl shadow border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Task load distribution</h2>
            {metrics.tasksByStatus.length ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={metrics.tasksByStatus}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="status" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#0f172a" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-gray-500">No tasks available.</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default ScheduleReportsPage

