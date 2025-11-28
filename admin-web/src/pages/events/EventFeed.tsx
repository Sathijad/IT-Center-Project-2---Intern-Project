import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { listEvents, getEvent } from '../../lib/eventsApi'

export default function EventFeedPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedBody, setSelectedBody] = useState<string>('Select an event to view details.')

  const { data, isLoading } = useQuery({
    queryKey: ['events.feed'],
    queryFn: () => listEvents({ page: 1, size: 10, status: ['PUBLISHED', 'APPROVED'] }),
  })

  async function openEvent(id: string) {
    setSelectedId(id)
    const result = await getEvent(id)
    if (result.status === 200) {
      setSelectedBody(result.data.body?.sanitized ?? result.data.event.summary)
    }
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="space-y-4">
        <h1 className="text-xl font-semibold text-slate-900">Company Feed</h1>
        {isLoading && <p className="text-sm text-slate-500">Loading feed…</p>}
        <div className="space-y-3">
          {data?.items?.map((event) => (
            <button
              key={event.id}
              onClick={() => openEvent(event.id)}
              className={`block w-full rounded border px-4 py-3 text-left ${selectedId === event.id ? 'border-blue-500 bg-blue-50' : 'border-slate-200 bg-white'}`}
            >
              <div className="text-sm text-slate-500">{new Date(event.createdAt).toLocaleDateString()}</div>
              <div className="font-semibold text-slate-900">{event.title}</div>
              <p className="text-sm text-slate-600">{event.summary}</p>
            </button>
          ))}
        </div>
      </div>
      <div className="rounded border border-slate-200 bg-white p-4">
        <h2 className="mb-2 text-lg font-semibold text-slate-900">Details</h2>
        <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: selectedBody }} />
      </div>
    </div>
  )
}

