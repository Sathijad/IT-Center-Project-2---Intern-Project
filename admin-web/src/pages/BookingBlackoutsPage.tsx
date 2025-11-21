import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { listBlackouts, createBlackout, updateBlackout, deleteBlackout, getRooms, type BlackoutWindow, type Room } from '../lib/bookingApi'
import { Plus, Edit, Trash2, Calendar, AlertCircle } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const blackoutSchema = z.object({
  room_id: z.number().min(1, 'Please select a room'),
  start_ts: z.string().min(1, 'Start time is required'),
  end_ts: z.string().min(1, 'End time is required'),
  reason: z.string().optional(),
}).refine(
  (data) => new Date(data.end_ts) > new Date(data.start_ts),
  { message: 'End time must be after start time', path: ['end_ts'] }
)

type BlackoutForm = z.infer<typeof blackoutSchema>

const BookingBlackoutsPage: React.FC = () => {
  const queryClient = useQueryClient()
  const [editingBlackout, setEditingBlackout] = useState<BlackoutWindow | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)

  const { data: blackoutsData, isLoading: blackoutsLoading, error: blackoutsError } = useQuery({
    queryKey: ['blackouts'],
    queryFn: () => listBlackouts(),
    retry: 1,
  })

  const { data: roomsData, error: roomsError } = useQuery({
    queryKey: ['rooms'],
    queryFn: () => getRooms({ active: true }),
    retry: 1,
  })

  const blackouts = blackoutsData?.blackouts || []
  const rooms = roomsData?.rooms || []

  const { register, handleSubmit, formState: { errors }, reset, setValue } = useForm<BlackoutForm>({
    resolver: zodResolver(blackoutSchema),
  })

  const createMutation = useMutation({
    mutationFn: createBlackout,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blackouts'] })
      reset()
      setShowCreateForm(false)
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<BlackoutForm> }) =>
      updateBlackout(id, {
        start_ts: data.start_ts,
        end_ts: data.end_ts,
        reason: data.reason || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blackouts'] })
      reset()
      setEditingBlackout(null)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteBlackout,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blackouts'] })
    },
  })

  const onSubmit = (data: BlackoutForm) => {
    const startISO = new Date(data.start_ts).toISOString()
    const endISO = new Date(data.end_ts).toISOString()

    if (editingBlackout) {
      updateMutation.mutate({
        id: editingBlackout.id,
        data: {
          room_id: data.room_id,
          start_ts: startISO,
          end_ts: endISO,
          reason: data.reason,
        },
      })
    } else {
      createMutation.mutate({
        ...data,
        start_ts: startISO,
        end_ts: endISO,
      })
    }
  }

  const handleEdit = (blackout: BlackoutWindow) => {
    setEditingBlackout(blackout)
    setValue('room_id', blackout.roomId)
    setValue('start_ts', new Date(blackout.startTs).toISOString().slice(0, 16))
    setValue('end_ts', new Date(blackout.endTs).toISOString().slice(0, 16))
    setValue('reason', blackout.reason || '')
    setShowCreateForm(true)
  }

  const handleDelete = (id: number) => {
    if (window.confirm('Are you sure you want to delete this blackout window?')) {
      deleteMutation.mutate(id)
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

  const getRoomName = (roomId: number) => {
    return rooms.find((r) => r.id === roomId)?.name || `Room ${roomId}`
  }

  if (blackoutsLoading) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="text-center py-12 text-gray-500">Loading blackouts...</div>
      </div>
    )
  }

  if (blackoutsError || roomsError) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-800">Failed to load blackout windows</p>
            <p className="text-sm text-red-600 mt-1">
              {blackoutsError instanceof Error
                ? blackoutsError.message
                : roomsError instanceof Error
                  ? roomsError.message
                  : 'Please try again later'}
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Blackout Windows</h1>
          <p className="mt-2 text-gray-600">Manage periods when rooms are unavailable for booking</p>
        </div>
        <button
          onClick={() => {
            setEditingBlackout(null)
            reset()
            setShowCreateForm(true)
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Blackout
        </button>
      </div>

      {showCreateForm && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">
            {editingBlackout ? 'Edit Blackout Window' : 'Create Blackout Window'}
          </h2>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Room *
              </label>
              <select
                {...register('room_id', { valueAsNumber: true })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                disabled={!!editingBlackout}
              >
                <option value="">Select a room</option>
                {rooms.map((room) => (
                  <option key={room.id} value={room.id}>
                    {room.name}
                  </option>
                ))}
              </select>
              {errors.room_id && (
                <p className="mt-1 text-sm text-red-600">{errors.room_id.message}</p>
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
                />
                {errors.end_ts && (
                  <p className="mt-1 text-sm text-red-600">{errors.end_ts.message}</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reason (Optional)
              </label>
              <textarea
                {...register('reason')}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="E.g., Maintenance, Event, etc."
              />
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {editingBlackout ? 'Update' : 'Create'} Blackout
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCreateForm(false)
                  setEditingBlackout(null)
                  reset()
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {blackouts.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No blackout windows configured.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Room
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Start Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  End Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Reason
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {blackouts.map((blackout) => (
                <tr key={blackout.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium text-gray-900">{getRoomName(blackout.roomId)}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {formatDateTime(blackout.startTs)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {formatDateTime(blackout.endTs)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {blackout.reason || <span className="text-gray-400">—</span>}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => handleEdit(blackout)}
                        className="text-blue-600 hover:text-blue-900"
                        title="Edit blackout"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(blackout.id)}
                        disabled={deleteMutation.isPending}
                        className="text-red-600 hover:text-red-900 disabled:opacity-50"
                        title="Delete blackout"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
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

export default BookingBlackoutsPage

