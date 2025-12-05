import React from 'react'
import { Link } from 'react-router-dom'
import { Feedback } from '../../lib/feedbackApi'
import { Clock, User, Tag } from 'lucide-react'

interface FeedbackCardProps {
  feedback: Feedback
}

const FeedbackCard: React.FC<FeedbackCardProps> = ({ feedback }) => {
  const statusColors: Record<string, string> = {
    OPEN: 'bg-yellow-100 text-yellow-800',
    IN_PROGRESS: 'bg-blue-100 text-blue-800',
    RESOLVED: 'bg-green-100 text-green-800',
    CLOSED: 'bg-gray-100 text-gray-800',
    REJECTED: 'bg-red-100 text-red-800',
  }

  const priorityColors: Record<string, string> = {
    LOW: 'bg-gray-100 text-gray-800',
    MEDIUM: 'bg-blue-100 text-blue-800',
    HIGH: 'bg-orange-100 text-orange-800',
    URGENT: 'bg-red-100 text-red-800',
  }

  return (
    <Link
      to={`/feedback/${feedback.feedback_id}`}
      className="block bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-lg font-semibold text-gray-900">{feedback.title}</h3>
            <span className={`px-2 py-1 text-xs font-medium rounded ${statusColors[feedback.status]}`}>
              {feedback.status.replace('_', ' ')}
            </span>
            <span className={`px-2 py-1 text-xs font-medium rounded ${priorityColors[feedback.priority]}`}>
              {feedback.priority}
            </span>
          </div>
          <p className="text-gray-600 text-sm mb-3 line-clamp-2">{feedback.description}</p>
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <span className="flex items-center gap-1">
              <Tag className="w-4 h-4" />
              {feedback.category}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {new Date(feedback.created_at).toLocaleDateString()}
            </span>
            {feedback.assigned_to && (
              <span className="flex items-center gap-1">
                <User className="w-4 h-4" />
                Assigned
              </span>
            )}
          </div>
        </div>
        {feedback.messages && feedback.messages.length > 0 && (
          <div className="ml-4 text-sm text-gray-500">
            {feedback.messages.length} message{feedback.messages.length !== 1 ? 's' : ''}
          </div>
        )}
      </div>
    </Link>
  )
}

export default FeedbackCard

