import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../contexts/AuthContext'
import { getAttendanceLogs, type AttendanceLog } from '../lib/attendanceApi'
import { Download, Calendar, Users } from 'lucide-react'
import api from '../lib/api'

const AttendancePage: React.FC = () => {
  const { user } = useAuth()
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')
  const [selectedUserId, setSelectedUserId] = useState<string>('')
  const [page, setPage] = useState(1)
  const pageSize = 20

  // Fetch users for filter dropdown
  const { data: usersData } = useQuery({
    queryKey: ['users-for-filter'],
    queryFn: async () => {
      const response = await api.get('/api/v1/admin/users', {
        params: { page: 0, size: 1000 }, // Get all users for filter
      })
      return response.data
    },
    enabled: !!user?.roles?.includes('ADMIN'),
  })

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-attendance-logs', startDate, endDate, selectedUserId, page],
    queryFn: () =>
      getAttendanceLogs({
        user_id: selectedUserId ? parseInt(selectedUserId) : undefined,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        page,
        size: pageSize,
        sort: 'clock_in,desc',
      }),
    staleTime: 60000, // 1 minute
  })

  const handleExport = () => {
    // Export functionality - would generate CSV/Excel
    const csv = [
      ['Date', 'User', 'Clock In', 'Clock Out', 'Duration (minutes)'],
      ...(data?.items || []).map((log: AttendanceLog) => [
        new Date(log.clockIn).toLocaleDateString(),
        log.userEmail ?? log.userName ?? 'Unknown user',
        new Date(log.clockIn).toLocaleString(),
        log.clockOut ? new Date(log.clockOut).toLocaleString() : 'N/A',
        log.durationMinutes ?? 'N/A',
      ]),
    ]
      .map((row) => row.join(','))
      .join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `attendance-${new Date().toISOString().split('T')[0]}.csv`
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
        <h1 className="text-3xl font-bold text-gray-900">Attendance Management</h1>
        <p className="mt-2 text-gray-600">View and manage all users' attendance records</p>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div>
            <label htmlFor="user-filter" className="block text-sm font-medium text-gray-700 mb-2">
              Filter by User
            </label>
            <select
              id="user-filter"
              value={selectedUserId}
              onChange={(e) => {
              setSelectedUserId(e.target.value)
              setPage(1)
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
            >
              <option value="">All Users</option>
              {usersData?.content?.map((user: any) => (
                <option key={user.id} value={user.id.toString()}>
                  {user.displayName || user.email}
                </option>
              ))}
            </select>
          </div>
          <div>
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
          <div>
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
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
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
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
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
                        <div className="flex items-center">
                          <Users className="w-4 h-4 text-gray-400 mr-2" />
                          <div className="text-sm font-medium text-gray-900">
                            {log.userEmail ?? log.userName ?? 'Unknown user'}
                          </div>
                        </div>
                      </td>
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

export default AttendancePage

