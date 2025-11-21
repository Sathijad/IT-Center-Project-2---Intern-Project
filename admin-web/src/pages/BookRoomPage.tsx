import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  getRooms,
  getRoomAvailability,
  createBooking,
  type Room,
  type AvailabilityResponse,
} from '../lib/bookingApi'
import { Calendar, Clock, Users, MapPin, Search, AlertCircle } from 'lucide-react'

const bookingSchema = z.object({
  room_id: z.number().min(1, 'Please select a room'),
  start_ts: z.string().min(1, 'Start time is required'),
  end_ts: z.string().min(1, 'End time is required'),
  title: z.string().max(255, 'Title must be less than 255 characters').optional(),
  attendees: z.string().optional(),
}).refine(
  (data) => new Date(data.end_ts) > new Date(data.start_ts),
  { message: 'End time must be after start time', path: ['end_ts'] }
)

type BookingForm = z.infer<typeof bookingSchema>

const BookRoomPage: React.FC = () => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null)
  const [searchFilters, setSearchFilters] = useState({
    capacity: '',
    location: '',
    amenities: [] as string[],
  })

  const { register, handleSubmit, formState: { errors }, watch, setValue } = useForm<BookingForm>({
    resolver: zodResolver(bookingSchema),
  })

  const startTs = watch('start_ts')
  const endTs = watch('end_ts')
  const roomId = watch('room_id')
  const isValidRange =
    !!startTs && !!endTs ? new Date(endTs).getTime() > new Date(startTs).getTime() : true

  // Fetch rooms
  const { data: roomsData, isLoading: roomsLoading, error: roomsError } = useQuery({
    queryKey: ['rooms', searchFilters],
    queryFn: () => getRooms({
      capacity: searchFilters.capacity ? Number(searchFilters.capacity) : undefined,
      location: searchFilters.location || undefined,
      active: true,
    }),
    retry: 1,
  })

  const rooms = roomsData?.rooms || []

  // Fetch availability when room and time are selected
  const { data: availability, isLoading: availabilityLoading, error: availabilityError } = useQuery({
    queryKey: ['room-availability', roomId, startTs, endTs],
    queryFn: () => {
      if (!roomId || !startTs || !endTs || !isValidRange) return null
      // Convert datetime-local format to ISO string
      const startISO = new Date(startTs).toISOString()
      const endISO = new Date(endTs).toISOString()
      return getRoomAvailability(roomId, startISO, endISO)
    },
    enabled: !!roomId && !!startTs && !!endTs && isValidRange,
    retry: 1,
  })

  const createMutation = useMutation({
    mutationFn: (data: BookingForm) => {
      const idempotencyKey = `booking-${data.room_id}-${data.start_ts}-${Date.now()}`
      // Convert datetime-local format to ISO string
      const startISO = new Date(data.start_ts).toISOString()
      const endISO = new Date(data.end_ts).toISOString()
      return createBooking(
        {
          ...data,
          start_ts: startISO,
          end_ts: endISO,
          attendees: data.attendees ? data.attendees.split(',').map(a => a.trim()).filter(Boolean) : [],
        },
        idempotencyKey
      )
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] })
      queryClient.invalidateQueries({ queryKey: ['rooms'] })
      navigate('/bookings/my')
    },
  })

  const onSubmit = (data: BookingForm) => {
    createMutation.mutate(data)
  }

  const handleRoomSelect = (room: Room) => {
    setSelectedRoom(room)
    setValue('room_id', room.id)
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Book a Room</h1>
        <p className="mt-2 text-gray-600">Search and book available rooms</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Room Search */}
        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <h2 className="text-xl font-semibold">Search Rooms</h2>
          
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Minimum Capacity
              </label>
              <input
                type="number"
                min="1"
                value={searchFilters.capacity}
                onChange={(e) => setSearchFilters({ ...searchFilters, capacity: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="Any"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Location
              </label>
              <input
                type="text"
                value={searchFilters.location}
                onChange={(e) => setSearchFilters({ ...searchFilters, location: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="Building, Floor..."
              />
            </div>
          </div>

          {roomsLoading ? (
            <div className="text-center py-8 text-gray-500">Loading rooms...</div>
          ) : roomsError ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-800">Failed to load rooms</p>
                <p className="text-sm text-red-600 mt-1">
                  {roomsError instanceof Error ? roomsError.message : 'Please try again later'}
                </p>
              </div>
            </div>
          ) : rooms.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No rooms found</div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {rooms.map((room) => (
                <button
                  key={room.id}
                  onClick={() => handleRoomSelect(room)}
                  className={`w-full text-left p-4 border rounded-lg transition-colors ${
                    selectedRoom?.id === room.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="font-semibold">{room.name}</div>
                  <div className="text-sm text-gray-600 mt-1 flex items-center gap-4">
                    <span className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      {room.capacity}
                    </span>
                    {room.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        {room.location}
                      </span>
                    )}
                  </div>
                  {room.amenities.length > 0 && (
                    <div className="text-xs text-gray-500 mt-2">
                      {room.amenities.join(', ')}
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Booking Form */}
        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <h2 className="text-xl font-semibold">Booking Details</h2>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <input type="hidden" {...register('room_id', { valueAsNumber: true })} />

            {!selectedRoom && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                <p className="text-sm text-yellow-800">Please select a room from the list</p>
              </div>
            )}

            {selectedRoom && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="font-semibold text-blue-900">{selectedRoom.name}</div>
                <div className="text-sm text-blue-700 mt-1">
                  Capacity: {selectedRoom.capacity} • {selectedRoom.location || 'No location'}
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Title *
              </label>
              <input
                type="text"
                {...register('title')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="Meeting title"
                aria-invalid={errors.title ? 'true' : 'false'}
              />
              {errors.title && (
                <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Time *
                </label>
                <input
                  type="datetime-local"
                  {...register('start_ts')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  aria-invalid={errors.start_ts ? 'true' : 'false'}
                />
                {errors.start_ts && (
                  <p className="mt-1 text-sm text-red-600">{errors.start_ts.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Time *
                </label>
                <input
                  type="datetime-local"
                  {...register('end_ts')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  aria-invalid={errors.end_ts ? 'true' : 'false'}
                />
                {errors.end_ts && (
                  <p className="mt-1 text-sm text-red-600">{errors.end_ts.message}</p>
                )}
              </div>
            </div>

            {!isValidRange && startTs && endTs && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                End time must be after the start time.
              </div>
            )}

            {availabilityError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-800">Failed to load availability</p>
                  <p className="text-sm text-red-600 mt-1">
                    {availabilityError instanceof Error ? availabilityError.message : 'Please try again later'}
                  </p>
                </div>
              </div>
            )}

            {availability && (
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold mb-2">Availability</h3>
                {availability.bookings.length > 0 && (
                  <div className="text-sm text-red-600 mb-2">
                    {availability.bookings.length} conflicting booking(s)
                  </div>
                )}
                {availability.blackouts.length > 0 && (
                  <div className="text-sm text-orange-600">
                    {availability.blackouts.length} blackout period(s)
                  </div>
                )}
                {availability.bookings.length === 0 && availability.blackouts.length === 0 && (
                  <div className="text-sm text-green-600">Room is available</div>
                )}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Attendees (comma-separated emails)
              </label>
              <input
                type="text"
                {...register('attendees')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="email1@example.com, email2@example.com"
              />
            </div>

            {createMutation.isError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-800">
                  {createMutation.error instanceof Error
                    ? createMutation.error.message
                    : 'Failed to create booking'}
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={!selectedRoom || createMutation.isPending}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {createMutation.isPending ? 'Creating...' : 'Book Room'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default BookRoomPage

