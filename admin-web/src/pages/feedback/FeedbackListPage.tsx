import React, { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { useAuth } from '../../contexts/AuthContext'
import { feedbackApi } from '../../lib/feedbackApi'
import { Link } from 'react-router-dom'
import { Plus, Download, Search } from 'lucide-react'
import FeedbackCard from '../../components/feedback/FeedbackCard'

const FeedbackListPage: React.FC = () => {
  const { user } = useAuth()
  const isAdmin = user?.roles?.includes('ADMIN')

  const [filters, setFilters] = useState({
    status: '',
    assignee: '',
    category: '',
    priority: '',
    search: '',
  })
  const [page, setPage] = useState(1)
  const pageSize = 20

  const { data, isLoading, error } = useQuery({
    queryKey: ['feedback-list', filters, page],
    queryFn: () =>
      feedbackApi.getFeedbackList({
        status: filters.status || undefined,
        assignee: filters.assignee ? parseInt(filters.assignee, 10) : undefined,
        category: filters.category || undefined,
        priority: filters.priority || undefined,
        page,
        size: pageSize,
      }),
  })

  const exportMutation = useMutation({
    mutationFn: () => feedbackApi.exportFeedbackCSV(filters),
    onSuccess: (blob) => {
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `feedback_export_${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    },
  })

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
    setPage(1)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Feedback & Issues</h1>
          <p className="mt-2 text-gray-600">
            {isAdmin ? 'Manage all feedback and issues' : 'View your submitted feedback'}
          </p>
        </div>
        <div className="flex gap-2">
          {isAdmin && (
            <button
              onClick={() => exportMutation.mutate()}
              disabled={exportMutation.isPending}
              className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
          )}
          <Link
            to="/feedback/submit"
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            Submit Feedback
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label htmlFor="status-filter" className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              id="status-filter"
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="">All</option>
              <option value="OPEN">Open</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="RESOLVED">Resolved</option>
              <option value="CLOSED">Closed</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>
          <div>
            <label htmlFor="category-filter" className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <input
              id="category-filter"
              type="text"
              value={filters.category}
              onChange={(e) => handleFilterChange('category', e.target.value)}
              placeholder="Category"
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          <div>
            <label htmlFor="priority-filter" className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
            <select
              id="priority-filter"
              value={filters.priority}
              onChange={(e) => handleFilterChange('priority', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="">All</option>
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="URGENT">Urgent</option>
            </select>
          </div>
          {isAdmin && (
            <div>
              <label htmlFor="assignee-filter" className="block text-sm font-medium text-gray-700 mb-1">Assignee</label>
              <input
                id="assignee-filter"
                type="text"
                value={filters.assignee}
                onChange={(e) => handleFilterChange('assignee', e.target.value)}
                placeholder="User ID"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
          )}
          <div>
            <label htmlFor="search-filter" className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 w-4 h-4 text-gray-400" />
              <input
                id="search-filter"
                type="text"
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                placeholder="Search..."
                className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Feedback List */}
      {isLoading && <div className="text-center py-8">Loading...</div>}
      {error && <div className="text-center py-8 text-red-600">Error loading feedback</div>}
      {data && (
        <>
          <div className="space-y-4">
            {data.items.map((feedback) => (
              <FeedbackCard key={feedback.feedback_id} feedback={feedback} />
            ))}
          </div>

          {/* Pagination */}
          {data.total_pages > 1 && (
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, data.total_count)} of{' '}
                {data.total_count} results
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 border border-gray-300 rounded-md disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(data.total_pages, p + 1))}
                  disabled={page === data.total_pages}
                  className="px-4 py-2 border border-gray-300 rounded-md disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default FeedbackListPage

