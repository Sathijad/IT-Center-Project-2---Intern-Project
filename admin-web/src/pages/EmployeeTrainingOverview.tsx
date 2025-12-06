import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../contexts/AuthContext'
import { performanceApi, type TrainingAssignment } from '../lib/performanceApi'
import { GraduationCap, RefreshCw, AlertCircle, Edit, ExternalLink } from 'lucide-react'

const EmployeeTrainingOverview: React.FC = () => {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [editingAssignment, setEditingAssignment] = useState<string | null>(null)
  const [progressValue, setProgressValue] = useState<number>(0)
  const [statusValue, setStatusValue] = useState<string>('')

  const { data: assignments, isLoading, error, refetch } = useQuery<TrainingAssignment[]>({
    queryKey: ['employee-training-assignments', user?.id],
    queryFn: async () => {
      try {
        return await performanceApi.getAssignments({ userId: user?.id })
      } catch (err: any) {
        // Handle connection errors more gracefully
        if (err?.code === 'ERR_NETWORK' || err?.message?.includes('ERR_CONNECTION_REFUSED')) {
          throw new Error('Unable to connect to the performance API. Please ensure the backend service is running.')
        }
        throw err
      }
    },
    enabled: !!user?.id,
    retry: 1,
    refetchOnWindowFocus: false,
  })

  const updateMutation = useMutation({
    mutationFn: ({ assignmentId, update }: { assignmentId: string; update: { status?: string; progress?: number } }) =>
      performanceApi.updateAssignment(assignmentId, update),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee-training-assignments', user?.id] })
      setEditingAssignment(null)
      alert('Progress updated successfully!')
    },
    onError: (error: any) => {
      alert(`Failed to update progress: ${error.message || 'Unknown error'}`)
    },
  })

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'No date'
    try {
      const date = new Date(dateString)
      return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`
    } catch (e) {
      return dateString
    }
  }

  const formatStatus = (status?: string) => {
    if (!status) return 'Unknown'
    return status
      .split(/(?=[A-Z])/)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ')
  }

  const getStatusColor = (status?: string) => {
    const statusUpper = status?.toUpperCase() || ''
    if (statusUpper.includes('COMPLETED')) return 'bg-green-100 text-green-800'
    if (statusUpper.includes('PROGRESS') || statusUpper.includes('IN_PROGRESS')) return 'bg-blue-100 text-blue-800'
    if (statusUpper.includes('OVERDUE')) return 'bg-red-100 text-red-800'
    if (statusUpper.includes('ASSIGNED')) return 'bg-orange-100 text-orange-800'
    return 'bg-gray-100 text-gray-800'
  }

  const handleEdit = (assignment: TrainingAssignment) => {
    setEditingAssignment(assignment.assignmentId)
    setProgressValue(assignment.progress || 0)
    setStatusValue(assignment.status || 'Assigned')
  }

  const handleSave = (assignmentId: string) => {
    // Convert status to backend format (PascalCase)
    const statusMap: Record<string, string> = {
      'Not Started': 'NotStarted',
      'Assigned': 'Assigned',
      'In Progress': 'InProgress',
      'Completed': 'Completed',
      'Overdue': 'Overdue',
    }
    const backendStatus = statusMap[statusValue] || statusValue

    updateMutation.mutate({
      assignmentId,
      update: {
        progress: Math.round(progressValue),
        status: backendStatus,
      },
    })
  }

  const handleCancel = () => {
    setEditingAssignment(null)
    setProgressValue(0)
    setStatusValue('')
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error) {
    const errorMessage = error instanceof Error 
      ? error.message 
      : (error as any)?.response?.data?.message || 'An error occurred while loading training assignments'
    
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Training</h1>
          <p className="mt-2 text-gray-600">View your training courses and assignments</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="w-16 h-16 text-red-400 mb-4" />
            <p className="text-lg font-medium text-gray-900 mb-2">Failed to load training assignments</p>
            <p className="text-sm text-gray-600 mb-4 text-center max-w-md">
              {errorMessage}
            </p>
            <button
              onClick={() => refetch()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Ensure we have valid data before rendering
  const safeAssignments = Array.isArray(assignments) ? assignments.filter(a => a != null) : []

  if (safeAssignments.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Training</h1>
          <p className="mt-2 text-gray-600">View your training courses and assignments</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex flex-col items-center justify-center py-12">
            <GraduationCap className="w-16 h-16 text-gray-400 mb-4" />
            <p className="text-lg font-medium text-gray-900">No training assignments</p>
            <p className="text-sm text-gray-600 mt-2">
              Your assigned training courses will appear here
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Training</h1>
          <p className="mt-2 text-gray-600">View your training courses and assignments</p>
        </div>
        <button
          onClick={() => refetch()}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {safeAssignments.map((assignment) => {
          const isEditing = editingAssignment === assignment.assignmentId
          const progress = assignment.progress || 0

          return (
            <div key={assignment.assignmentId} className="bg-white rounded-lg shadow p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900">{assignment.courseTitle || 'Unknown Course'}</h3>
                  {assignment.courseId && (
                    <p className="text-sm text-gray-600 mt-1">Course ID: {assignment.courseId}</p>
                  )}
                </div>
                <span className={`px-4 py-2 rounded-full text-sm font-bold ${getStatusColor(assignment.status)}`}>
                  {formatStatus(assignment.status)}
                </span>
              </div>

              {/* Progress Section */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-700">Progress</span>
                    <span className="px-3 py-1 bg-blue-50 rounded-lg text-sm font-bold text-blue-800">
                      {progress}%
                    </span>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div
                    className={`h-2.5 rounded-full transition-all ${
                      progress === 100
                        ? 'bg-green-600'
                        : progress > 0
                        ? 'bg-blue-600'
                        : 'bg-gray-300'
                    }`}
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
              </div>

              {/* Assignment Details */}
              <div className="space-y-2 mb-4 text-sm text-gray-600">
                {assignment.dueDate && (
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Due Date:</span>
                    <span>{formatDate(assignment.dueDate)}</span>
                  </div>
                )}
                {assignment.completedAt && (
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Completed:</span>
                    <span>{formatDate(assignment.completedAt)}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <span className="font-medium">Assigned:</span>
                  <span>{formatDate(assignment.createdAt)}</span>
                </div>
              </div>

              {/* Edit Form */}
              {isEditing ? (
                <div className="border-t pt-4 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Progress: {Math.round(progressValue)}%
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={progressValue}
                      onChange={(e) => {
                        const value = Number(e.target.value)
                        setProgressValue(value)
                        if (value >= 100) {
                          setStatusValue('Completed')
                        } else if (value > 0) {
                          setStatusValue('In Progress')
                        } else {
                          setStatusValue('Not Started')
                        }
                      }}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                    <select
                      value={statusValue}
                      onChange={(e) => {
                        setStatusValue(e.target.value)
                        if (e.target.value === 'Completed' && progressValue < 100) {
                          setProgressValue(100)
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="Not Started">Not Started</option>
                      <option value="Assigned">Assigned</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Completed">Completed</option>
                      <option value="Overdue">Overdue</option>
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleSave(assignment.assignmentId)}
                      disabled={updateMutation.isPending}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                    >
                      {updateMutation.isPending ? 'Saving...' : 'Save'}
                    </button>
                    <button
                      onClick={handleCancel}
                      className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => handleEdit(assignment)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 border-2 border-gray-300 rounded-lg hover:border-blue-600 hover:text-blue-600 transition"
                >
                  <Edit className="w-4 h-4" />
                  Update Progress
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default EmployeeTrainingOverview

