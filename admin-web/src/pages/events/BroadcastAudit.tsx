import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchAudits } from '../../lib/eventsApi'

export default function BroadcastAuditPage() {
  const [eventId, setEventId] = useState('')
  const { data, isFetching, refetch } = useQuery({
    enabled: Boolean(eventId),
    queryKey: ['events.audit', eventId],
    queryFn: () => fetchAudits(eventId),
  })

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">Broadcast Audit</h1>
        <p className="text-sm text-slate-500">Track delivery attempts per channel for any event.</p>
      </header>

      <div className="flex gap-2">
        <input value={eventId} onChange={(e) => setEventId(e.target.value)} placeholder="Event UUID" className="w-full rounded border border-slate-300 px-3 py-2 text-sm" />
        <button onClick={() => refetch()} disabled={!eventId} className="rounded bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
          Lookup
        </button>
      </div>

      {isFetching && <p className="text-sm text-slate-500">Loading audit records…</p>}
      {!isFetching && Array.isArray(data) && (
        <div className="overflow-hidden rounded border border-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-2">Channel</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Message</th>
                <th className="px-4 py-2">Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {data.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-3 text-center text-slate-500">No audit entries yet.</td>
                </tr>
              )}
              {data.map((audit: any) => (
                <tr key={audit.id} className="border-t">
                  <td className="px-4 py-2">{audit.channel}</td>
                  <td className="px-4 py-2">{audit.status}</td>
                  <td className="px-4 py-2">{audit.message}</td>
                  <td className="px-4 py-2">{new Date(audit.createdAt ?? audit.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

