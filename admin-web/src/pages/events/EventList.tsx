import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { listEvents, Event } from '../../lib/eventsApi'

const statusFilters: { label: string; value?: string }[] = [
  { label: 'All', value: undefined },
  { label: 'Pending', value: 'PENDING_MODERATION' },
  { label: 'Approved', value: 'APPROVED' },
  { label: 'Scheduled', value: 'SCHEDULED' },
  { label: 'Published', value: 'PUBLISHED' },
]

function StatusBadge({ status }: { status: string }) {
  const palette: Record<string, string> = {
    PENDING_MODERATION: 'bg-yellow-100 text-yellow-900',
    APPROVED: 'bg-green-100 text-green-800',
    REJECTED: 'bg-red-100 text-red-800',
    PUBLISHED: 'bg-blue-100 text-blue-800',
    SCHEDULED: 'bg-indigo-100 text-indigo-800',
  }
  return <span className={`px-2 py-1 rounded text-xs font-semibold ${palette[status] ?? 'bg-slate-200 text-slate-800'}`}>{status.replace('_', ' ')}</span>
}

function EventRow({ event, onEdit }: { event: Event; onEdit: () => void }) {
  return (
    <tr className="border-b last:border-none">
      <td className="py-3">
        <div className="font-medium">{event.title}</div>
        <div className="text-sm text-slate-500">{event.summary}</div>
      </td>
      <td className="py-3 text-sm">{event.channel}</td>
      <td className="py-3">
        <StatusBadge status={event.status} />
      </td>
      <td className="py-3 text-sm">{event.tags.join(', ')}</td>
      <td className="py-3 text-right">
        <button onClick={onEdit} className="text-sm text-blue-600 hover:underline">Manage</button>
      </td>
    </tr>
  )
}

export default function EventListPage() {
  const [status, setStatus] = useState<string | undefined>(undefined)
  const navigate = useNavigate()

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['events.list', status],
    queryFn: () => {
      const params = { page: 1, size: 20, status: status ? [status] : undefined }
      console.log('[EventList] Fetching events with filter:', { status, params })
      return listEvents(params)
    },
  })

  // Debug: Log when data changes
  useEffect(() => {
    if (data) {
      console.log('[EventList] Events loaded:', {
        filter: status || 'All',
        count: data.items?.length || 0,
        statuses: data.items?.map(e => e.status) || [],
      })
    }
  }, [data, status])

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Events & Announcements</h1>
          <p className="text-slate-500 text-sm">Create, schedule, and moderate internal announcements.</p>
        </div>
        <button onClick={() => navigate('/events/new')} className="rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500">
          New Event
        </button>
      </header>

      <div className="flex flex-wrap items-center gap-3">
        {statusFilters.map((filter) => (
          <button
            key={filter.label}
            onClick={() => setStatus(filter.value)}
            className={`rounded-full px-3 py-1 text-sm ${status === filter.value ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}
          >
            {filter.label}
          </button>
        ))}
        <button onClick={() => refetch()} className="text-sm text-slate-500 hover:text-slate-900">Refresh</button>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="w-full">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Event</th>
              <th className="px-4 py-3">Channel</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Tags</th>
              <th className="px-4 py-3 text-right"></th>
            </tr>
          </thead>
          <tbody className="px-4">
            {isLoading && (
              <tr>
                <td colSpan={5} className="py-6 text-center text-sm text-slate-500">
                  Loading events…
                </td>
              </tr>
            )}
            {error && (
              <tr>
                <td colSpan={5} className="py-6 text-center">
                  <div className="text-sm text-red-600">
                    <p className="font-semibold">Failed to load events</p>
                    <p className="mt-1 text-xs text-red-500">
                      {error instanceof Error ? error.message : 'Unknown error occurred'}
                    </p>
                    <button
                      onClick={() => refetch()}
                      className="mt-2 text-xs text-blue-600 hover:underline"
                    >
                      Try again
                    </button>
                  </div>
                </td>
              </tr>
            )}
            {!isLoading && !error && data?.items?.length === 0 && (
              <tr>
                <td colSpan={5} className="py-6 text-center text-sm text-slate-500">
                  No events found.
                </td>
              </tr>
            )}
            {!isLoading && !error && data?.items?.map((event) => (
              <EventRow key={event.id} event={event} onEdit={() => navigate(`/events/${event.id}/edit`)} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

