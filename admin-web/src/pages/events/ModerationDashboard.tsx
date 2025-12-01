import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { listEvents, moderateEvent } from '../../lib/eventsApi'

export default function ModerationDashboard() {
  const [notes, setNotes] = useState('')
  const queryClient = useQueryClient()

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['events.list', 'moderation'],
    queryFn: () => listEvents({ page: 1, size: 10, status: ['PENDING_MODERATION'] }),
  })

  const mutation = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'APPROVE' | 'REJECT' }) => moderateEvent(id, action, notes),
    onSuccess: () => {
      setNotes('')
      queryClient.invalidateQueries({ queryKey: ['events.list', 'moderation'] })
      queryClient.invalidateQueries({ queryKey: ['events.list'] })
    },
  })

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">Moderation Queue</h1>
        <p className="text-sm text-slate-500">Review pending announcements before they go live.</p>
      </header>

      <label className="block text-sm">
        <span className="font-medium text-slate-700">Moderator Notes</span>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm" placeholder="Optional context shared with authors" />
      </label>

      <div className="space-y-3">
        {isLoading && <p className="text-sm text-slate-500">Loading pending events…</p>}
        {error && (
          <div className="rounded border border-red-200 bg-red-50 p-4">
            <p className="text-sm font-semibold text-red-800">Failed to load events</p>
            <p className="mt-1 text-xs text-red-600">
              {error instanceof Error ? error.message : 'Unknown error occurred'}
            </p>
            <button
              onClick={() => refetch()}
              className="mt-2 text-xs text-blue-600 hover:underline"
            >
              Try again
            </button>
          </div>
        )}
        {!isLoading && !error && data?.items?.length === 0 && <p className="text-sm text-slate-500">No events awaiting moderation 🎉</p>}
        {!isLoading && !error && data?.items?.map((event) => (
          <div key={event.id} className="rounded border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">{event.title}</h3>
                <p className="text-sm text-slate-500">{event.summary}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => mutation.mutate({ id: event.id, action: 'REJECT' })}
                  className="rounded border border-red-200 px-3 py-1 text-sm text-red-700"
                >
                  Reject
                </button>
                <button
                  onClick={() => mutation.mutate({ id: event.id, action: 'APPROVE' })}
                  className="rounded bg-green-600 px-3 py-1 text-sm font-semibold text-white"
                >
                  Approve
                </button>
              </div>
            </div>
            <div className="mt-3 text-xs text-slate-500">
              Tags: {event.tags.join(', ')} • Channel: {event.channel} • Created {new Date(event.createdAt).toLocaleString()}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

