import React, { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../contexts/AuthContext'
import { feedbackApi } from '../../lib/feedbackApi'
import { ArrowLeft, Send, Download, Brain, Bell } from 'lucide-react'
import MessageThread from '../../components/feedback/MessageThread'
import WorkflowHistory from '../../components/feedback/WorkflowHistory'
import FeedbackAnalytics from '../../components/feedback/FeedbackAnalytics'

const FeedbackDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const isAdmin = user?.roles?.includes('ADMIN')

  const { data: feedback, isLoading } = useQuery({
    queryKey: ['feedback', id],
    queryFn: () => feedbackApi.getFeedbackById(id!),
    enabled: !!id,
  })

  const updateMutation = useMutation({
    mutationFn: (updates: any) => feedbackApi.updateFeedback(id!, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feedback', id] })
      queryClient.invalidateQueries({ queryKey: ['feedback-list'] })
    },
  })

  const analyzeMutation = useMutation({
    mutationFn: () => feedbackApi.analyzeFeedback(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feedback', id] })
    },
  })

  const teamsMutation = useMutation({
    mutationFn: () => feedbackApi.sendTeamsNotification({ feedback_id: id! }),
  })

  const [updateForm, setUpdateForm] = useState({
    status: '',
    assignee_id: '',
    priority: '',
  })

  if (isLoading) return <div className="text-center py-8">Loading...</div>
  if (!feedback) return <div className="text-center py-8">Feedback not found</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/feedback')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to List
        </button>
        {isAdmin && (
          <div className="flex gap-2">
            <button
              onClick={() => analyzeMutation.mutate()}
              disabled={analyzeMutation.isPending}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
            >
              <Brain className="w-4 h-4" />
              Analyze Sentiment
            </button>
            <button
              onClick={() => teamsMutation.mutate()}
              disabled={teamsMutation.isPending}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              <Bell className="w-4 h-4" />
              Notify Teams
            </button>
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{feedback.title}</h1>
            <p className="text-sm text-gray-500 mt-1">ID: {feedback.feedback_id}</p>
          </div>
          <div className="flex gap-2">
            <span className={`px-3 py-1 text-sm font-medium rounded ${getStatusColor(feedback.status)}`}>
              {feedback.status.replace('_', ' ')}
            </span>
            <span className={`px-3 py-1 text-sm font-medium rounded ${getPriorityColor(feedback.priority)}`}>
              {feedback.priority}
            </span>
          </div>
        </div>

        <div className="mb-6">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Description</h3>
          <p className="text-gray-900 whitespace-pre-wrap">{feedback.description}</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div>
            <p className="text-sm text-gray-500">Category</p>
            <p className="font-medium">{feedback.category}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Created</p>
            <p className="font-medium">{new Date(feedback.created_at).toLocaleString()}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Created By</p>
            <p className="font-medium">User #{feedback.created_by}</p>
          </div>
          {feedback.assigned_to && (
            <div>
              <p className="text-sm text-gray-500">Assigned To</p>
              <p className="font-medium">User #{feedback.assigned_to}</p>
            </div>
          )}
        </div>

        {/* Attachments */}
        {feedback.attachments && feedback.attachments.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Attachments</h3>
            <div className="space-y-2">
              {feedback.attachments.map((attachment) => (
                <a
                  key={attachment.attachment_id}
                  href={attachment.download_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-blue-600 hover:text-blue-800"
                >
                  <Download className="w-4 h-4" />
                  {attachment.file_name} ({formatFileSize(attachment.file_size)})
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Admin Update Form */}
        {isAdmin && (
          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold mb-4">Update Feedback</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="update-status" className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  id="update-status"
                  value={updateForm.status || feedback.status}
                  onChange={(e) => setUpdateForm({ ...updateForm, status: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="OPEN">Open</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="RESOLVED">Resolved</option>
                  <option value="CLOSED">Closed</option>
                  <option value="REJECTED">Rejected</option>
                </select>
              </div>
              <div>
                <label htmlFor="update-priority" className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                <select
                  id="update-priority"
                  value={updateForm.priority || feedback.priority}
                  onChange={(e) => setUpdateForm({ ...updateForm, priority: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent</option>
                </select>
              </div>
              <div>
                <label htmlFor="update-assignee" className="block text-sm font-medium text-gray-700 mb-1">Assignee (User ID)</label>
                <input
                  id="update-assignee"
                  type="number"
                  value={updateForm.assignee_id || feedback.assigned_to || ''}
                  onChange={(e) => setUpdateForm({ ...updateForm, assignee_id: e.target.value })}
                  placeholder="User ID"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
            </div>
            <button
              onClick={() => {
                const updates: any = {}
                if (updateForm.status && updateForm.status !== feedback.status) updates.status = updateForm.status
                if (updateForm.priority && updateForm.priority !== feedback.priority) updates.priority = updateForm.priority
                if (updateForm.assignee_id) updates.assignee_id = parseInt(updateForm.assignee_id)
                if (Object.keys(updates).length > 0) {
                  updateMutation.mutate(updates)
                }
              }}
              disabled={updateMutation.isPending}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              Update
            </button>
          </div>
        )}
      </div>

      {/* Messages Thread */}
      <MessageThread feedbackId={id!} messages={feedback.messages || []} />

      {/* Analytics */}
      {feedback.nlp_analysis && feedback.nlp_analysis.length > 0 && (
        <FeedbackAnalytics analysis={feedback.nlp_analysis[0]} />
      )}

      {/* Workflow History */}
      {feedback.audit_logs && feedback.audit_logs.length > 0 && (
        <WorkflowHistory auditLogs={feedback.audit_logs} />
      )}
    </div>
  )
}

function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    OPEN: 'bg-yellow-100 text-yellow-800',
    IN_PROGRESS: 'bg-blue-100 text-blue-800',
    RESOLVED: 'bg-green-100 text-green-800',
    CLOSED: 'bg-gray-100 text-gray-800',
    REJECTED: 'bg-red-100 text-red-800',
  }
  return colors[status] || 'bg-gray-100 text-gray-800'
}

function getPriorityColor(priority: string): string {
  const colors: Record<string, string> = {
    LOW: 'bg-gray-100 text-gray-800',
    MEDIUM: 'bg-blue-100 text-blue-800',
    HIGH: 'bg-orange-100 text-orange-800',
    URGENT: 'bg-red-100 text-red-800',
  }
  return colors[priority] || 'bg-gray-100 text-gray-800'
}

function formatFileSize(bytes?: number): string {
  if (!bytes) return 'Unknown size'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default FeedbackDetailPage

