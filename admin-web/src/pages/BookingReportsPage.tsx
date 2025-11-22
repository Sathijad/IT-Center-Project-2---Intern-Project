import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { listBookings, getRooms, type Booking } from '../lib/bookingApi'
import { BarChart3, Calendar, TrendingUp, AlertCircle } from 'lucide-react'

const BookingReportsPage: React.FC = () => {
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().setDate(1)).toISOString().split('T')[0], // First day of current month
    end: new Date().toISOString().split('T')[0], // Today
  })

  const { data: bookingsData, isLoading, error: bookingsError } = useQuery({
    queryKey: ['bookings', 'reports', dateRange],
    queryFn: () => listBookings({
      start_date: dateRange.start,
      end_date: dateRange.end,
      status: 'CONFIRMED',
    }),
    retry: 1,
  })

  const { data: roomsData, error: roomsError } = useQuery({
    queryKey: ['rooms'],
    queryFn: () => getRooms({ active: true }),
  })

  const bookings = bookingsData?.bookings || []
  const rooms = roomsData?.rooms || []

  // Calculate utilization metrics
  const calculateUtilization = () => {
    const roomStats = rooms.map((room) => {
      // Ensure type-safe comparison - convert both to numbers
      const roomId = typeof room.id === 'number' ? room.id : Number(room.id)
      const roomBookings = bookings.filter((b: Booking) => {
        // First check if booking has room info and it matches
        if (b.room?.id && b.room.id === roomId) {
          return true
        }
        // Fallback to roomId comparison
        const bookingRoomId = typeof b.roomId === 'number' ? b.roomId : Number(b.roomId)
        return bookingRoomId === roomId
      })
      const totalHours = roomBookings.reduce((sum: number, b: Booking) => {
        const start = new Date(b.startTs)
        const end = new Date(b.endTs)
        return sum + (end.getTime() - start.getTime()) / (1000 * 60 * 60)
      }, 0)

      const daysInRange = Math.ceil(
        (new Date(dateRange.end).getTime() - new Date(dateRange.start).getTime()) /
          (1000 * 60 * 60 * 24)
      )
      const totalAvailableHours = daysInRange * 8 // Assuming 8 hours per day
      const utilizationPercent = totalAvailableHours > 0 ? (totalHours / totalAvailableHours) * 100 : 0

      // Use room name from booking if available, otherwise use room list
      const roomName = roomBookings.length > 0 && roomBookings[0].room?.name 
        ? roomBookings[0].room.name 
        : room.name

      return {
        roomId: room.id,
        roomName: roomName,
        bookingCount: roomBookings.length,
        totalHours: Math.round(totalHours * 10) / 10,
        utilizationPercent: Math.round(utilizationPercent * 10) / 10,
      }
    })

    return roomStats.sort((a, b) => b.utilizationPercent - a.utilizationPercent)
  }

  const stats = calculateUtilization()
  const totalBookings = bookings.length
  const totalRooms = rooms.length
  const avgUtilization =
    stats.length > 0
      ? Math.round((stats.reduce((sum, s) => sum + s.utilizationPercent, 0) / stats.length) * 10) / 10
      : 0

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="text-center py-12 text-gray-500">Loading reports...</div>
      </div>
    )
  }

  if (bookingsError || roomsError) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-800">Failed to load booking reports</p>
            <p className="text-sm text-red-600 mt-1">
              {bookingsError instanceof Error ? bookingsError.message : roomsError instanceof Error ? roomsError.message : 'Please try again later'}
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Booking Utilization Reports</h1>
        <p className="mt-2 text-gray-600">Analyze room booking patterns and utilization</p>
      </div>

      {/* Date Range Selector */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium text-gray-700">Date Range:</label>
          <input
            type="date"
            value={dateRange.start}
            onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded-lg"
          />
          <span className="text-gray-600">to</span>
          <input
            type="date"
            value={dateRange.end}
            onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded-lg"
          />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Bookings</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{totalBookings}</p>
            </div>
            <Calendar className="w-12 h-12 text-blue-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active Rooms</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{totalRooms}</p>
            </div>
            <BarChart3 className="w-12 h-12 text-green-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Avg Utilization</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{avgUtilization}%</p>
            </div>
            <TrendingUp className="w-12 h-12 text-purple-500" />
          </div>
        </div>
      </div>

      {/* Room Utilization Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold">Room Utilization</h2>
        </div>
        {stats.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p>No booking data available for the selected date range.</p>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Room
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Bookings
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Hours
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Utilization
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Chart
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {stats.map((stat) => (
                <tr key={stat.roomId}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium text-gray-900">{stat.roomName}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {stat.bookingCount}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {stat.totalHours} hrs
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${Math.min(stat.utilizationPercent, 100)}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium text-gray-700 w-16 text-right">
                        {stat.utilizationPercent}%
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-xs text-gray-500">
                      {stat.utilizationPercent >= 80
                        ? 'High'
                        : stat.utilizationPercent >= 50
                          ? 'Medium'
                          : 'Low'}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

export default BookingReportsPage

