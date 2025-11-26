import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../contexts/AuthContext'
import {
  listTasks,
  createTask,
  updateTask,
  addTaskComment,
  type Task,
  type PagedResponse,
} from '../lib/schedulesApi'

const taskSchema = z.object({
  title: z.string().min(3),
  description: z.string().optional(),
  assigneeId: z.preprocess((val) => Number(val), z.number().positive()),
  scheduleId: z.string().uuid().optional().or(z.literal('')).optional(),
  priority: z.enum(['Low', 'Medium', 'High', 'Critical']).default('Medium'),
  dueDate: z.string().optional(),
  tags: z.string().optional(),
})

type TaskForm = z.infer<typeof taskSchema>

const statusOptions = ['Pending', 'InProgress', 'Blocked', 'Done']

const TasksDashboardPage = () => {
  const { user, isAdmin } = useAuth()
  const queryClient = useQueryClient()
  const [filters, setFilters] = useState({ status: '', assignee: '' })
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({})

  const { register, handleSubmit, reset, formState } = useForm<TaskForm>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      priority: 'Medium',
    },
  })

  // For EMPLOYEE role, automatically filter by their user ID
  const effectiveAssignee = isAdmin 
    ? (filters.assignee || undefined)
    : (user?.id?.toString() || undefined)

  const { data, isLoading, error } = useQuery<PagedResponse<Task>>({
    queryKey: ['tasks', filters, user?.id],
    queryFn: () =>
      listTasks({
        status: filters.status || undefined,
        assignee: effectiveAssignee,
      }),
    enabled: !!user?.id, // Only fetch if user is loaded
  })

  const createMutation = useMutation({
    mutationFn: (payload: TaskForm) =>
      createTask(
        {
          title: payload.title,
          description: payload.description,
          assigneeId: payload.assigneeId,
          scheduleId: payload.scheduleId || undefined,
          priority: payload.priority,
          dueDate: payload.dueDate ? new Date(payload.dueDate).toISOString() : undefined,
          tags: payload.tags ? payload.tags.split(',').map((tag) => tag.trim()) : [],
        },
        crypto.randomUUID ? crypto.randomUUID() : Date.now().toString()
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      reset()
    },
  })

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      updateTask(id, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
  })

  const commentMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: string }) => addTaskComment(id, { body }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      setCommentDrafts((prev) => ({ ...prev, [variables.id]: '' }))
    },
  })

  const onSubmit = (values: TaskForm) => {
    createMutation.mutate(values)
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold text-gray-900">Task Dashboard</h1>
        <p className="text-sm text-gray-500">Assign tasks, change status, and collaborate via comments.</p>
      </header>

      <section className="grid gap-6 md:grid-cols-2">
        {isAdmin && (
          <form onSubmit={handleSubmit(onSubmit)} className="bg-white p-6 rounded-xl shadow border border-gray-100 space-y-4">
            <h2 className="text-lg font-semibold text-gray-800">Assign Task</h2>
          <label className="flex flex-col text-sm text-gray-600">
            Title
            <input type="text" className="mt-1 rounded border px-3 py-2" {...register('title')} />
            {formState.errors.title && <span className="text-xs text-red-600">{formState.errors.title.message}</span>}
          </label>
          <label className="flex flex-col text-sm text-gray-600">
            Description
            <textarea rows={3} className="mt-1 rounded border px-3 py-2" {...register('description')} />
          </label>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="flex flex-col text-sm text-gray-600">
              Assignee ID
              <input type="number" className="mt-1 rounded border px-3 py-2" {...register('assigneeId')} />
              {formState.errors.assigneeId && <span className="text-xs text-red-600">{formState.errors.assigneeId.message}</span>}
            </label>
            <label className="flex flex-col text-sm text-gray-600">
              Schedule ID (optional)
              <input type="text" className="mt-1 rounded border px-3 py-2" {...register('scheduleId')} />
            </label>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="flex flex-col text-sm text-gray-600">
              Priority
              <select className="mt-1 rounded border px-3 py-2" {...register('priority')}>
                {['Low', 'Medium', 'High', 'Critical'].map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
            </label>
            <label className="flex flex-col text-sm text-gray-600">
              Due date
              <input type="date" className="mt-1 rounded border px-3 py-2" {...register('dueDate')} />
            </label>
          </div>
          <label className="flex flex-col text-sm text-gray-600">
            Tags (comma separated)
            <input type="text" className="mt-1 rounded border px-3 py-2" placeholder="infra, reminder" {...register('tags')} />
          </label>
          <button
            type="submit"
            className="w-full rounded bg-indigo-600 text-white py-2 font-semibold hover:bg-indigo-700 transition disabled:opacity-50"
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? 'Saving...' : 'Create Task'}
          </button>
          {createMutation.isError && <p className="text-sm text-red-600">Failed to create task.</p>}
          </form>
        )}

        <div className="bg-white p-6 rounded-xl shadow border border-gray-100 space-y-4">
          <h2 className="text-lg font-semibold text-gray-800">Filters</h2>
          <label className="flex flex-col text-sm text-gray-600">
            Status
            <select
              className="mt-1 rounded border px-3 py-2"
              value={filters.status}
              onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}
            >
              <option value="">All</option>
              {statusOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          {isAdmin && (
            <label className="flex flex-col text-sm text-gray-600">
              Assignee ID
              <input
                type="text"
                className="mt-1 rounded border px-3 py-2"
                value={filters.assignee}
                onChange={(e) => setFilters((prev) => ({ ...prev, assignee: e.target.value }))}
              />
            </label>
          )}
          {!isAdmin && (
            <div className="text-sm text-gray-600">
              <p className="font-medium">Showing your tasks only</p>
              <p className="text-xs text-gray-500 mt-1">You can only view tasks assigned to you.</p>
            </div>
          )}
        </div>
      </section>

      <section className="bg-white rounded-xl shadow border border-gray-100">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800">Task backlog</h2>
          <span className="text-sm text-gray-500">{data?.totalCount ?? 0} tasks</span>
        </div>
        {isLoading && <p className="p-4 text-sm text-gray-500">Loading tasks...</p>}
        {error && <p className="p-4 text-sm text-red-600">Failed to load tasks.</p>}
        {!isLoading && data && (
          <div className="divide-y divide-gray-100">
            {data.items.map((task) => (
              <article key={task.taskId} className="p-4">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-base font-semibold text-gray-900">{task.title}</p>
                    <p className="text-sm text-gray-500">{task.description || 'No description'}</p>
                    <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
                      <span>Assignee #{task.assigneeId}</span>
                      {task.dueDate && <span>Due {new Date(task.dueDate).toLocaleDateString()}</span>}
                      <span>Priority {task.priority}</span>
                    </div>
                  </div>
                  <div className="mt-3 md:mt-0 flex items-center gap-2">
                    <select
                      className="rounded border px-3 py-1 text-sm"
                      value={task.status}
                      onChange={(e) => statusMutation.mutate({ id: task.taskId, status: e.target.value })}
                      disabled={statusMutation.isPending}
                    >
                      {statusOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                    <span className="text-xs rounded-full bg-gray-100 px-3 py-1 text-gray-600">{task.tags.join(', ') || 'No tags'}</span>
                  </div>
                </div>
                <div className="mt-4">
                  <label className="text-xs font-semibold text-gray-600">Add comment</label>
                  <div className="mt-1 flex gap-2">
                    <input
                      type="text"
                      className="flex-1 rounded border px-3 py-2 text-sm"
                      placeholder="Keep everyone posted..."
                      value={commentDrafts[task.taskId] || ''}
                      onChange={(e) => setCommentDrafts((prev) => ({ ...prev, [task.taskId]: e.target.value }))}
                    />
                    <button
                      className="rounded bg-slate-900 text-white px-4 text-sm"
                      onClick={() => commentMutation.mutate({ id: task.taskId, body: commentDrafts[task.taskId] || '' })}
                      disabled={commentMutation.isPending || !commentDrafts[task.taskId]}
                    >
                      Send
                    </button>
                  </div>
                </div>
              </article>
            ))}
            {data.items.length === 0 && (
              <p className="p-6 text-center text-sm text-gray-500">No tasks match the current filters.</p>
            )}
          </div>
        )}
      </section>
    </div>
  )
}

export default TasksDashboardPage

