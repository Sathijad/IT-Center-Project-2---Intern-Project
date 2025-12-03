import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { performanceApi, type TrainingCourse, type TrainingAssignment } from '../lib/performanceApi'
import { UserCheck, Send } from 'lucide-react'

const TrainingAssignmentsPage = () => {
  const queryClient = useQueryClient()
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [showNotifyModal, setShowNotifyModal] = useState(false)
  const [assignment, setAssignment] = useState({
    courseId: '',
    assigneeType: 'USER',
    assigneeId: '',
    cohortId: '',
    dueDate: '',
  })
  const [notifyFilters, setNotifyFilters] = useState({
    userId: '',
    teamId: '',
    overdueOnly: false,
    incompleteOnly: false,
  })

  const { data: coursesData } = useQuery({
    queryKey: ['training-courses-all'],
    queryFn: () => performanceApi.getCourses({ page: 1, size: 1000 }),
  })

  const courses = coursesData?.items || []

  const assignMutation = useMutation({
    mutationFn: (assignment: typeof assignment) =>
      performanceApi.assignTraining({
        courseId: assignment.courseId,
        assigneeType: assignment.assigneeType as any,
        assigneeId: assignment.assigneeId ? Number(assignment.assigneeId) : undefined,
        cohortId: assignment.cohortId || undefined,
        dueDate: assignment.dueDate || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training-assignments'] })
      setShowAssignModal(false)
      setAssignment({
        courseId: '',
        assigneeType: 'USER',
        assigneeId: '',
        cohortId: '',
        dueDate: '',
      })
      alert('Training assigned successfully!')
    },
    onError: (error: any) => {
      alert(`Failed to assign training: ${error.message}`)
    },
  })

  const notifyMutation = useMutation({
    mutationFn: () =>
      performanceApi.notifyStaff({
        userId: notifyFilters.userId ? Number(notifyFilters.userId) : undefined,
        teamId: notifyFilters.teamId ? Number(notifyFilters.teamId) : undefined,
        overdueOnly: notifyFilters.overdueOnly || undefined,
        incompleteOnly: notifyFilters.incompleteOnly || undefined,
      }),
    onSuccess: (data) => {
      alert(`Notifications queued for ${data.queued} assignments`)
      setShowNotifyModal(false)
    },
    onError: (error: any) => {
      alert(`Failed to queue notifications: ${error.message}`)
    },
  })

  const handleAssign = () => {
    if (!assignment.courseId) {
      alert('Please select a course')
      return
    }
    if (assignment.assigneeType === 'USER' && !assignment.assigneeId) {
      alert('Please enter a user ID')
      return
    }
    if (assignment.assigneeType === 'COHORT' && !assignment.cohortId) {
      alert('Please enter a cohort ID')
      return
    }
    assignMutation.mutate(assignment)
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Training Assignments</h1>
          <p className="mt-2 text-gray-600">Assign training courses to users and teams</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowAssignModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            <UserCheck className="w-5 h-5" />
            Assign Training
          </button>
          <button
            onClick={() => setShowNotifyModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
          >
            <Send className="w-5 h-5" />
            Send Notifications
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-gray-600">
          Use the buttons above to assign training courses or send notifications to staff members.
        </p>
        <p className="text-sm text-gray-500 mt-2">
          Assignment management and viewing features will be available in a future update.
        </p>
      </div>

      {/* Assign Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Assign Training</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Course *</label>
                <select
                  value={assignment.courseId}
                  onChange={(e) => setAssignment({ ...assignment, courseId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="">Select a course</option>
                  {courses.map((course) => (
                    <option key={course.courseId} value={course.courseId}>
                      {course.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Assignee Type *</label>
                <select
                  value={assignment.assigneeType}
                  onChange={(e) => setAssignment({ ...assignment, assigneeType: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="USER">User</option>
                  <option value="TEAM">Team</option>
                  <option value="COHORT">Cohort</option>
                </select>
              </div>

              {assignment.assigneeType === 'USER' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">User ID *</label>
                  <input
                    type="number"
                    value={assignment.assigneeId}
                    onChange={(e) => setAssignment({ ...assignment, assigneeId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
              )}

              {assignment.assigneeType === 'COHORT' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cohort ID *</label>
                  <input
                    type="text"
                    value={assignment.cohortId}
                    onChange={(e) => setAssignment({ ...assignment, cohortId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                <input
                  type="datetime-local"
                  value={assignment.dueDate}
                  onChange={(e) => setAssignment({ ...assignment, dueDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowAssignModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAssign}
                disabled={assignMutation.isPending}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {assignMutation.isPending ? 'Assigning...' : 'Assign'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notify Modal */}
      {showNotifyModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Send Notifications</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">User ID</label>
                <input
                  type="number"
                  value={notifyFilters.userId}
                  onChange={(e) => setNotifyFilters({ ...notifyFilters, userId: e.target.value })}
                  placeholder="Optional"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Team ID</label>
                <input
                  type="number"
                  value={notifyFilters.teamId}
                  onChange={(e) => setNotifyFilters({ ...notifyFilters, teamId: e.target.value })}
                  placeholder="Optional"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={notifyFilters.overdueOnly}
                    onChange={(e) => setNotifyFilters({ ...notifyFilters, overdueOnly: e.target.checked })}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">Overdue assignments only</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={notifyFilters.incompleteOnly}
                    onChange={(e) => setNotifyFilters({ ...notifyFilters, incompleteOnly: e.target.checked })}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">Incomplete assignments only</span>
                </label>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowNotifyModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => notifyMutation.mutate()}
                disabled={notifyMutation.isPending}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {notifyMutation.isPending ? 'Sending...' : 'Send Notifications'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default TrainingAssignmentsPage

