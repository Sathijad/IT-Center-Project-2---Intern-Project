import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getAttendanceLogs, clockIn, clockOut, getTodayAttendance } from '../lib/api'
import { useAuth } from '../contexts/AuthContext'
import { Clock, LogIn, LogOut, Calendar } from 'lucide-react'

type AttendanceLog = {
  id: number
  userId: number
  clockIn: string
  clockOut: string | null
  durationMinutes: number | null
  source: string
  createdAt: string
}

export default function Attendance() {
  const { user, isAdmin } = useAuth()
  const queryClient = useQueryClient()
  const [dateRange, setDateRange] = useState({
    from: new Date(new Date().setDate(new Date().getDate() - 7)).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0],
  })

  const { data: todayData } = useQuery({
    queryKey: ['todayAttendance'],
    queryFn: async () => {
      const response = await getTodayAttendance()
      return response.data
    },
  })

  const { data, isLoading } = useQuery({
    queryKey: ['attendanceLogs', dateRange],
    queryFn: async () => {
      const params: any = { ...dateRange }
      if (!isAdmin) params.user_id = user?.id
      const response = await getAttendanceLogs(params)
      return response.data
    },
  })

  const clockInMutation = useMutation({
    mutationFn: () => clockIn(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['todayAttendance'] })
      queryClient.invalidateQueries({ queryKey: ['attendanceLogs'] })
      alert('Clocked in successfully')
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Failed to clock in')
    },
  })

  const clockOutMutation = useMutation({
    mutationFn: () => clockOut(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['todayAttendance'] })
      queryClient.invalidateQueries({ queryKey: ['attendanceLogs'] })
      alert('Clocked out successfully')
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Failed to clock out')
    },
  })

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const formatDuration = (minutes: number | null) => {
    if (!minutes) return '-'
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours}h ${mins}m`
  }

  const today = todayData?.data
  const canClockIn = !today || today.clockOut !== null
  const canClockOut = today && today.clockOut === null

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  const logs = data?.data || []

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Attendance</h1>
        <div className="flex gap-2">
          {canClockIn && (
            <button
              onClick={() => clockInMutation.mutate()}
              disabled={clockInMutation.isPending}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
            >
              <LogIn className="w-4 h-4" />
              Clock In
            </button>
          )}
          {canClockOut && (
            <button
              onClick={() => clockOutMutation.mutate()}
              disabled={clockOutMutation.isPending}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              Clock Out
            </button>
          )}
        </div>
      </div>

      {today && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h2 className="text-lg font-semibold text-blue-900 mb-2">Today's Status</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-blue-700">Clock In</p>
              <p className="text-lg font-medium text-blue-900">
                {formatTime(today.clockIn)}
              </p>
            </div>
            {today.clockOut ? (
              <div>
                <p className="text-sm text-blue-700">Clock Out</p>
                <p className="text-lg font-medium text-blue-900">
                  {formatTime(today.clockOut)}
                </p>
              </div>
            ) : (
              <div>
                <p className="text-sm text-blue-700">Status</p>
                <p className="text-lg font-medium text-blue-900">Active</p>
              </div>
            )}
            {today.durationMinutes && (
              <div className="col-span-2">
                <p className="text-sm text-blue-700">Duration</p>
                <p className="text-lg font-medium text-blue-900">
                  {formatDuration(today.durationMinutes)}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="bg-white p-4 rounded-lg shadow">
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">From</label>
            <input
              type="date"
              value={dateRange.from}
              onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">To</label>
            <input
              type="date"
              value={dateRange.to}
              onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Clock In
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Clock Out
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Duration
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Source
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {logs.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                  No attendance records found
                </td>
              </tr>
            ) : (
              logs.map((log: AttendanceLog) => (
                <tr key={log.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-900">
                        {formatDate(log.clockIn)}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <LogIn className="w-4 h-4 text-green-500" />
                      <span className="text-sm text-gray-900">{formatTime(log.clockIn)}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {log.clockOut ? (
                      <div className="flex items-center gap-2">
                        <LogOut className="w-4 h-4 text-red-500" />
                        <span className="text-sm text-gray-900">{formatTime(log.clockOut)}</span>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatDuration(log.durationMinutes)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {log.source}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

