import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../contexts/AuthContext'
import { getAttendanceLogs, clockIn, clockOut, type AttendanceLog } from '../lib/attendanceApi'
import { Download, Calendar, LogIn, LogOut, CheckCircle, XCircle } from 'lucide-react'

const MyAttendancePage: React.FC = () => {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')
  const [page, setPage] = useState(1)
  const [clockingIn, setClockingIn] = useState(false)
  const [clockingOut, setClockingOut] = useState(false)
  const pageSize = 20

  // Get user's attendance logs - always filter by current user's ID
  const { data, isLoading, error } = useQuery({
    queryKey: ['my-attendance-logs', user?.id, startDate, endDate, page],
    queryFn: () => {
      // Backend automatically scopes to the authenticated user when no user_id is provided
      return getAttendanceLogs({
        // Do not pass user_id to let backend infer current user
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        page,
        size: pageSize,
        sort: 'clock_in,desc'
      })
    },
    enabled: !!user?.id, // Only fetch when user ID is available
    staleTime: 30000, // 30 seconds
  })

  // Check if user is currently clocked in (has an open session)
  const todayLogs = data?.items?.filter((log: AttendanceLog) => {
    const logDate = new Date(log.clockIn).toDateString()
    const today = new Date().toDateString()
    return logDate === today
  }) || []

  const currentOpenSession = todayLogs.find((log: AttendanceLog) => !log.clockOut)

  // Clock in mutation
  const clockInMutation = useMutation({
    mutationFn: async () => {
      // Try to get user's location, but don't require it
      let location: { latitude: number; longitude: number; accuracy?: number } | null = null
      
      try {
        if (navigator.geolocation) {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: true,
              timeout: 5000,
              maximumAge: 0
            })
          })
          location = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy
          }
        }
      } catch (err) {
        console.warn('Could not get location:', err)
        // Continue without location - backend may accept it
      }

      if (location) {
        return await clockIn(location)
      } else {
        // Use default location if geolocation is not available
        return await clockIn({ latitude: 0, longitude: 0 })
      }
    },
    onMutate: () => {
      setClockingIn(true)
    },
    onSuccess: () => {
      // Invalidate the correct query key to refresh the attendance list
      queryClient.invalidateQueries({ queryKey: ['my-attendance-logs'] })
      setClockingIn(false)
    },
    onError: (error: any) => {
      console.error('Clock in error:', error)
      setClockingIn(false)
      alert(error.response?.data?.message || 'Failed to clock in. Please try again.')
    }
  })

  // Clock out mutation
  const clockOutMutation = useMutation({
    mutationFn: async () => {
      // Try to get user's location, but don't require it
      let location: { latitude?: number; longitude?: number } | undefined = undefined
      
      try {
        if (navigator.geolocation) {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: true,
              timeout: 5000,
              maximumAge: 0
            })
          })
          location = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          }
        }
      } catch (err) {
        console.warn('Could not get location:', err)
        // Continue without location
      }

      return await clockOut(location)
    },
    onMutate: () => {
      setClockingOut(true)
    },
    onSuccess: () => {
      // Invalidate the correct query key to refresh the attendance list
      queryClient.invalidateQueries({ queryKey: ['my-attendance-logs'] })
      setClockingOut(false)
    },
    onError: (error: any) => {
      console.error('Clock out error:', error)
      setClockingOut(false)
      alert(error.response?.data?.message || 'Failed to clock out. Please try again.')
    }
  })

  const handleClockIn = () => {
    if (currentOpenSession) {
      alert('You are already clocked in. Please clock out first.')
      return
    }
    clockInMutation.mutate()
  }

  const handleClockOut = () => {
    if (!currentOpenSession) {
      alert('You are not currently clocked in.')
      return
    }
    clockOutMutation.mutate()
  }

  const handleExport = () => {
    const csv = [
      ['Date', 'Clock In', 'Clock Out', 'Duration (minutes)'],
      ...(data?.items || []).map((log: AttendanceLog) => [
        new Date(log.clockIn).toLocaleDateString(),
        new Date(log.clockIn).toLocaleString(),
        log.clockOut ? new Date(log.clockOut).toLocaleString() : 'N/A',
        log.durationMinutes ?? 'N/A'
      ])
    ].map(row => row.join(',')).join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `my-attendance-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
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
        <p className="text-red-800">Error loading attendance logs. Please try again.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">My Attendance</h1>
        <p className="mt-2 text-gray-600">View and manage your attendance records</p>
      </div>

      {/* Clock In/Out Section */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Today's Status</h2>
            {currentOpenSession ? (
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="w-5 h-5" />
                <span className="font-medium">Clocked In</span>
                <span className="text-gray-600 text-sm">
                  Since {new Date(currentOpenSession.clockIn).toLocaleTimeString()}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-gray-600">
                <XCircle className="w-5 h-5" />
                <span>Not Clocked In</span>
              </div>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleClockIn}
              disabled={clockingIn || currentOpenSession !== undefined}
              className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium transition"
            >
              {clockingIn ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Clocking In...
                </>
              ) : (
                <>
                  <LogIn className="w-5 h-5" />
                  Clock In
                </>
              )}
            </button>
            <button
              onClick={handleClockOut}
              disabled={clockingOut || currentOpenSession === undefined}
              className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium transition"
            >
              {clockingOut ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Clocking Out...
                </>
              ) : (
                <>
                  <LogOut className="w-5 h-5" />
                  Clock Out
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Attendance Records Section */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1">
            <label htmlFor="start-date" className="block text-sm font-medium text-gray-700 mb-2">
              Start Date
            </label>
            <input
              type="date"
              id="start-date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value)
                setPage(1)
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
            />
          </div>
          <div className="flex-1">
            <label htmlFor="end-date" className="block text-sm font-medium text-gray-700 mb-2">
              End Date
            </label>
            <input
              type="date"
              id="end-date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value)
                setPage(1)
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={handleExport}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <Download className="w-5 h-5" />
              Export
            </button>
          </div>
        </div>

        {data?.items && data.items.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Clock In</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Clock Out</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {data.items.map((log: AttendanceLog) => (
                    <tr key={log.logId} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {new Date(log.clockIn).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {new Date(log.clockIn).toLocaleTimeString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {log.clockOut ? new Date(log.clockOut).toLocaleTimeString() : '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {log.durationMinutes
                            ? `${Math.floor(log.durationMinutes / 60)}h ${log.durationMinutes % 60}m`
                            : '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {log.clockOut ? (
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                            Complete
                          </span>
                        ) : (
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
                            Open
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="mt-6 flex items-center justify-between">
              <p className="text-sm text-gray-600">
                {(() => {
                  const start = (data.page - 1) * data.size + 1
                  const end = Math.min(data.page * data.size, data.total)
                  return `Showing ${start} to ${end} of ${data.total} records`
                })()}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={!data.hasPreviousPage}
                  className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage(p => p + 1)}
                  disabled={!data.hasNextPage}
                  className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-12">
            <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No attendance records found</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default MyAttendancePage

