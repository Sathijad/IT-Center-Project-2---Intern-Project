import React from 'react'
import { FeedbackAudit } from '../../lib/feedbackApi'
import { Clock, User } from 'lucide-react'

interface WorkflowHistoryProps {
  auditLogs: FeedbackAudit[]
}

const WorkflowHistory: React.FC<WorkflowHistoryProps> = ({ auditLogs }) => {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4">Workflow History</h2>
      <div className="space-y-4">
        {auditLogs.map((log) => (
          <div key={log.audit_id} className="border-l-4 border-gray-300 pl-4 py-2">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-gray-400" />
              <span className="text-sm font-medium text-gray-700">{log.action}</span>
              {log.user_id && (
                <span className="text-xs text-gray-500 flex items-center gap-1">
                  <User className="w-3 h-3" />
                  User #{log.user_id}
                </span>
              )}
              <span className="text-xs text-gray-500 ml-auto">
                {new Date(log.created_at).toLocaleString()}
              </span>
            </div>
            {log.new_value && (
              <div className="text-sm text-gray-600 mt-1">
                {Object.entries(log.new_value).map(([key, value]) => (
                  <div key={key}>
                    <span className="font-medium">{key}:</span> {String(value)}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export default WorkflowHistory

