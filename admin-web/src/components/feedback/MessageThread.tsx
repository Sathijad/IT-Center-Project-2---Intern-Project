import React, { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../contexts/AuthContext'
import { feedbackApi, FeedbackMessage } from '../../lib/feedbackApi'
import { Send, User } from 'lucide-react'

interface MessageThreadProps {
  feedbackId: string
  messages: FeedbackMessage[]
}

const MessageThread: React.FC<MessageThreadProps> = ({ feedbackId, messages }) => {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [content, setContent] = useState('')

  const addMessageMutation = useMutation({
    mutationFn: (data: { content: string }) => feedbackApi.addMessage(feedbackId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feedback', feedbackId] })
      setContent('')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (content.trim()) {
      addMessageMutation.mutate({ content: content.trim() })
    }
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4">Messages</h2>

      <div className="space-y-4 mb-6">
        {messages.length === 0 ? (
          <p className="text-gray-500 text-center py-4">No messages yet</p>
        ) : (
          messages.map((message) => (
            <div key={message.message_id} className="border-l-4 border-blue-500 pl-4 py-2">
              <div className="flex items-center gap-2 mb-1">
                <User className="w-4 h-4 text-gray-400" />
                <span className="text-sm font-medium text-gray-700">User #{message.user_id}</span>
                <span className="text-xs text-gray-500">
                  {new Date(message.created_at).toLocaleString()}
                </span>
              </div>
              <p className="text-gray-900 whitespace-pre-wrap">{message.content}</p>
            </div>
          ))
        )}
      </div>

      <form onSubmit={handleSubmit} className="border-t pt-4">
        <div className="flex gap-2">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Add a comment..."
            rows={3}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
          />
          <button
            type="submit"
            disabled={addMessageMutation.isPending || !content.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            <Send className="w-4 h-4" />
            Send
          </button>
        </div>
      </form>
    </div>
  )
}

export default MessageThread

