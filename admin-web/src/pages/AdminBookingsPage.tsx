import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { listBookings, getRooms, type Booking, type Room } from '../lib/bookingApi'
import { Calendar, Clock, Filter, AlertCircle } from 'lucide-react'

const AdminBookingsPage: React.FC = () => {
  const [filters, setFilters] = useState({
    room_id: '',
    status: '',
    start_date: '',
    end_date: '',
  })

  const { data: bookingsData, isLoading: bookingsLoading, error: bookingsError } = useQuery({
    queryKey: ['bookings', 'admin', filters],
    queryFn: () => listBookings({
      room_id: filters.room_id ? Number(filters.room_id) : undefined,
      status: filters.status as 'PENDING' | 'CONFIRMED' | 'CANCELLED' | undefined,
      start_date: filters.start_date ? `${filters.start_date}T00:00:00Z` : undefined,
      end_date: filters.end_date ? `${filters.end_date}T23:59:59Z` : undefined,
    }),
    retry: 1,
  })

  const { data: roomsData } = useQuery({
    queryKey: ['rooms'],
    queryFn: () => getRooms({ active: true }),
  })

  const bookings = bookingsData?.bookings || []
  const rooms = roomsData?.rooms || []

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  const getRoomName = (booking: Booking) => {
    // Use room info from booking if available (preferred)
    if (booking.room?.name) {
      return booking.room.name
    }
    // Fallback to rooms list lookup
    const bookingRoomId = typeof booking.roomId === 'number' ? booking.roomId : Number(booking.roomId)
    const room = rooms.find((r) => {
      const rId = typeof r.id === 'number' ? r.id : Number(r.id)
      return rId === bookingRoomId
    })
    return room?.name || `Room ${booking.roomId}`
  }

  if (bookingsLoading) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="text-center py-12 text-gray-500">Loading bookings...</div>
      </div>
    )
  }

  if (bookingsError) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-800">Failed to load bookings</p>
            <p className="text-sm text-red-600 mt-1">
              {bookingsError instanceof Error ? bookingsError.message : 'Please try again later'}
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">All Bookings</h1>
        <p className="mt-2 text-gray-600">View and manage all room bookings</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-5 h-5 text-gray-600" />
          <h2 className="text-lg font-semibold">Filters</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Room</label>
            <select
              value={filters.room_id}
              onChange={(e) => setFilters({ ...filters, room_id: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="">All Rooms</option>
              {rooms.map((room) => (
                <option key={room.id} value={room.id}>
                  {room.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="">All Statuses</option>
              <option value="CONFIRMED">Confirmed</option>
              <option value="PENDING">Pending</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
            <input
              type="date"
              value={filters.start_date}
              onChange={(e) => setFilters({ ...filters, start_date: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
            <input
              type="date"
              value={filters.end_date}
              onChange={(e) => setFilters({ ...filters, end_date: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
        </div>
      </div>

      {/* Bookings Table */}
      {bookings.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No bookings found matching your filters.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Title
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Room
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Attendees
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {bookings.map((booking: Booking) => (
                <tr key={booking.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium text-gray-900">
                      {booking.title || 'Untitled Booking'}
                    </div>
                    <div className="text-sm text-gray-500">ID: {booking.id}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{getRoomName(booking)}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-600">
                      <div>{formatDateTime(booking.startTs)}</div>
                      <div className="text-gray-400">to {formatDateTime(booking.endTs)}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 text-xs rounded ${
                        booking.status === 'CONFIRMED'
                          ? 'bg-green-100 text-green-800'
                          : booking.status === 'CANCELLED'
                            ? 'bg-gray-100 text-gray-800'
                            : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {booking.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-600">
                      {booking.attendees.length > 0 ? (
                        <div className="max-w-xs truncate">{booking.attendees.join(', ')}</div>
                      ) : (
                        <span className="text-gray-400">None</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default AdminBookingsPage

