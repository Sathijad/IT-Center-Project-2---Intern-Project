import React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { listBookings, cancelBooking, type Booking } from '../lib/bookingApi'
import { Calendar, Clock, X, AlertCircle } from 'lucide-react'
// Note: useAuth hook removed - user context not needed for this page

const MyBookingsPage: React.FC = () => {
  const queryClient = useQueryClient()

  const { data, isLoading, error } = useQuery({
    queryKey: ['bookings', 'my'],
    queryFn: () => listBookings(),
  })

  const cancelMutation = useMutation({
    mutationFn: cancelBooking,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] })
    },
  })

  const bookings = data?.bookings || []

  const handleCancel = (id: number) => {
    if (window.confirm('Are you sure you want to cancel this booking?')) {
      cancelMutation.mutate(id)
    }
  }

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

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="text-center py-12 text-gray-500">Loading bookings...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
          <p className="text-sm text-red-800">Failed to load bookings. Please try again.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">My Bookings</h1>
        <p className="mt-2 text-gray-600">View and manage your room bookings</p>
      </div>

      {bookings.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">You don't have any bookings yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {bookings.map((booking: Booking) => {
            const canCancel = booking.status === 'CONFIRMED' && new Date(booking.startTs) > new Date()
            
            return (
              <div
                key={booking.id}
                className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold">
                        {booking.title || 'Untitled Booking'}
                      </h3>
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
                    </div>

                    <div className="space-y-2 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        <span>{formatDateTime(booking.startTs)} - {formatDateTime(booking.endTs)}</span>
                      </div>

                      {booking.attendees.length > 0 && (
                        <div>
                          <span className="font-medium">Attendees: </span>
                          {booking.attendees.join(', ')}
                        </div>
                      )}
                    </div>
                  </div>

                  {canCancel && (
                    <button
                      onClick={() => handleCancel(booking.id)}
                      disabled={cancelMutation.isPending}
                      className="ml-4 px-4 py-2 text-red-600 border border-red-300 rounded-lg hover:bg-red-50 disabled:opacity-50"
                    >
                      <X className="w-4 h-4 inline mr-1" />
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default MyBookingsPage

