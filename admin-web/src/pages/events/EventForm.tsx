import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import { createEvent, updateEvent, getEvent, suggestTags, broadcastEvent, EventMutationPayload } from '../../lib/eventsApi'

const schema = z.object({
  title: z.string().min(4, 'Title required'),
  summary: z.string().min(10, 'Summary required'),
  body: z.string().min(20, 'Body required'),
  channel: z.string().min(2),
  tags: z.array(z.string()).default([]),
  rsvpRequired: z.boolean().default(false),
  scheduledFor: z.string().optional().nullable(),
  expiresAt: z.string().optional().nullable(),
})

export default function EventFormPage() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [tagInput, setTagInput] = useState('')
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [showBroadcastDialog, setShowBroadcastDialog] = useState(false)
  const [selectedChannels, setSelectedChannels] = useState<string[]>(['EMAIL', 'PUSH'])

  const { data: existing } = useQuery({
    enabled: isEdit,
    queryKey: ['events.detail', id],
    queryFn: async () => {
      const result = await getEvent(id!)
      if (result.status !== 200) throw new Error('Not found')
      return result.data
    },
  })

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: '',
      summary: '',
      body: '',
      channel: 'INTERNAL',
      tags: [],
      rsvpRequired: false,
    },
  })

  useEffect(() => {
    if (existing?.event) {
      const event = existing.event
      setValue('title', event.title)
      setValue('summary', event.summary)
      setValue('body', existing.body?.html ?? '')
      setValue('channel', event.channel)
      setValue('tags', event.tags)
      setValue('rsvpRequired', event.rsvpRequired)
      setValue('scheduledFor', event.scheduledFor ?? '')
      setValue('expiresAt', event.expiresAt ?? '')
    }
  }, [existing, setValue])

  const mutation = useMutation({
    mutationFn: async (data: z.infer<typeof schema>) => {
      const payload: EventMutationPayload = {
        ...data,
        attachments: [],
        // Convert datetime-local format to ISO 8601 for backend
        scheduledFor: data.scheduledFor ? new Date(data.scheduledFor).toISOString() : undefined,
        expiresAt: data.expiresAt ? new Date(data.expiresAt).toISOString() : undefined,
      }
      console.log('[EventForm] Submitting payload:', payload)
      if (isEdit) {
        return updateEvent(id!, payload)
      }
      return createEvent(payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events.list'] })
      navigate('/events')
    },
    onError: (error: any) => {
      console.error('[EventForm] Mutation error:', error)
      const errorMessage = error.response?.data?.message || error.message || 'Failed to save event'
      alert(`Error: ${errorMessage}`)
    },
  })

  const tags = watch('tags')

  function addTag(tag: string) {
    const normalized = tag.trim().toLowerCase()
    if (!normalized) return
    if (tags.includes(normalized)) return
    setValue('tags', [...tags, normalized])
    setTagInput('')
  }

  function removeTag(tag: string) {
    setValue('tags', tags.filter((t) => t !== tag))
  }

  async function loadSuggestions() {
    if (!tagInput.trim()) return
    const results = await suggestTags(tagInput.trim())
    setSuggestions(results)
  }

  const broadcastMutation = useMutation({
    mutationFn: async (channels: string[]) => {
      if (!id) throw new Error('Event ID is required')
      return broadcastEvent(id, { channels })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events.list'] })
      queryClient.invalidateQueries({ queryKey: ['events.detail', id] })
      setShowBroadcastDialog(false)
      alert('Event broadcasted successfully! Users will receive emails and mobile notifications.')
    },
    onError: (error: any) => {
      console.error('[EventForm] Broadcast error:', error)
      const errorMessage = error.response?.data?.message || error.message || 'Failed to broadcast event'
      alert(`Error: ${errorMessage}`)
    },
  })

  function handleBroadcast() {
    if (!id) {
      alert('Please save the event first before broadcasting')
      return
    }
    if (!existing?.event) {
      alert('Event not loaded')
      return
    }
    if (existing.event.status !== 'APPROVED') {
      alert('Only approved events can be broadcasted. Please approve the event first in the Moderation page.')
      return
    }
    setShowBroadcastDialog(true)
  }

  function toggleChannel(channel: string) {
    setSelectedChannels(prev => 
      prev.includes(channel) 
        ? prev.filter(c => c !== channel)
        : [...prev, channel]
    )
  }

  function confirmBroadcast() {
    if (selectedChannels.length === 0) {
      alert('Please select at least one channel')
      return
    }
    broadcastMutation.mutate(selectedChannels)
  }

  return (
    <form onSubmit={handleSubmit((data) => mutation.mutate(data))} className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">{isEdit ? 'Edit Event' : 'Create Event'}</h1>
        <p className="text-sm text-slate-500">{isEdit ? 'Update the announcement content and scheduling' : 'Add a new announcement for employees'}</p>
      </header>
      <div className="grid gap-4">
        <label className="space-y-1 text-sm">
          <span className="font-medium text-slate-700">Title</span>
          <input {...register('title')} className="w-full rounded border border-slate-300 px-3 py-2" />
          {errors.title && <p className="text-xs text-red-600">{errors.title.message}</p>}
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium text-slate-700">Summary</span>
          <textarea {...register('summary')} rows={2} className="w-full rounded border border-slate-300 px-3 py-2" />
          {errors.summary && <p className="text-xs text-red-600">{errors.summary.message}</p>}
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium text-slate-700">Body</span>
          <textarea {...register('body')} rows={6} className="w-full rounded border border-slate-300 px-3 py-2 font-mono" />
          {errors.body && <p className="text-xs text-red-600">{errors.body.message}</p>}
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium text-slate-700">Channel</span>
          <select {...register('channel')} className="w-full rounded border border-slate-300 px-3 py-2">
            <option value="INTERNAL">Internal</option>
            <option value="TEAMS">Teams Only</option>
            <option value="PUSH">Mobile Push</option>
          </select>
        </label>
        <div>
          <span className="text-sm font-medium text-slate-700">Tags</span>
          <div className="mt-2 flex gap-2">
            <input value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag(tagInput))} className="flex-1 rounded border border-slate-300 px-3 py-2 text-sm" placeholder="Add tag" />
            <button type="button" onClick={() => addTag(tagInput)} className="rounded bg-slate-200 px-3 py-2 text-sm">Add</button>
            <button type="button" onClick={loadSuggestions} className="rounded bg-indigo-50 px-3 py-2 text-sm text-indigo-700">Suggest</button>
          </div>
          {suggestions.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2 text-xs">
              {suggestions.map((tag) => (
                <button key={tag} type="button" onClick={() => addTag(tag)} className="rounded-full bg-indigo-100 px-3 py-1 text-indigo-800">
                  {tag}
                </button>
              ))}
            </div>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            {tags.map((tag) => (
              <span key={tag} className="flex items-center gap-1 rounded-full bg-slate-200 px-3 py-1 text-xs">
                {tag}
                <button type="button" onClick={() => removeTag(tag)} aria-label={`Remove ${tag}`}>
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" {...register('rsvpRequired')} />
          <span>Require RSVP</span>
        </label>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-1 text-sm">
            <span className="font-medium text-slate-700">Schedule Time</span>
            <input type="datetime-local" {...register('scheduledFor')} className="w-full rounded border border-slate-300 px-3 py-2" />
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium text-slate-700">Expires At</span>
            <input type="datetime-local" {...register('expiresAt')} className="w-full rounded border border-slate-300 px-3 py-2" />
          </label>
        </div>
      </div>
      {mutation.error && (
        <div className="rounded border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-semibold text-red-800">Error saving event</p>
          <p className="mt-1 text-xs text-red-600">
            {mutation.error instanceof Error 
              ? mutation.error.message 
              : (mutation.error as any)?.response?.data?.message || 'Unknown error occurred'}
          </p>
        </div>
      )}
      
      {/* Broadcast Dialog */}
      {showBroadcastDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">Broadcast Event</h2>
            <p className="text-sm text-slate-600 mb-4">
              Select channels to broadcast this event. Users will receive emails and mobile notifications.
            </p>
            
            <div className="space-y-2 mb-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedChannels.includes('EMAIL')}
                  onChange={() => toggleChannel('EMAIL')}
                  className="rounded"
                />
                <span className="text-sm">📧 Email - Send event details via email to all users</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedChannels.includes('PUSH')}
                  onChange={() => toggleChannel('PUSH')}
                  className="rounded"
                />
                <span className="text-sm">📱 Push Notification - Send notification to mobile app users</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedChannels.includes('TEAMS')}
                  onChange={() => toggleChannel('TEAMS')}
                  className="rounded"
                />
                <span className="text-sm">💬 Teams - Post to Microsoft Teams channel</span>
              </label>
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowBroadcastDialog(false)}
                className="rounded border border-slate-300 px-4 py-2 text-sm"
                disabled={broadcastMutation.isPending}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmBroadcast}
                disabled={broadcastMutation.isPending || selectedChannels.length === 0}
                className="rounded bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-500 disabled:opacity-60"
              >
                {broadcastMutation.isPending ? 'Broadcasting…' : 'Broadcast'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center">
        <div>
          {isEdit && existing?.event && (
            <button
              type="button"
              onClick={handleBroadcast}
              disabled={existing.event.status !== 'APPROVED'}
              className="rounded bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
              title={existing.event.status !== 'APPROVED' ? 'Event must be approved before broadcasting' : 'Broadcast event to users via email and mobile notifications'}
            >
              📢 Broadcast Event
            </button>
          )}
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => navigate(-1)} className="rounded border border-slate-300 px-4 py-2 text-sm">Cancel</button>
          <button type="submit" disabled={mutation.isPending} className="rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-60">
            {mutation.isPending ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Event'}
          </button>
        </div>
      </div>
    </form>
  )
}

