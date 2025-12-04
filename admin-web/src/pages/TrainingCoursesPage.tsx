import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { performanceApi, type TrainingCourse } from '../lib/performanceApi'
import { BookOpen, Plus, ExternalLink, Edit } from 'lucide-react'

const TrainingCoursesPage = () => {
  const queryClient = useQueryClient()
  const [searchQuery, setSearchQuery] = useState('')
  const [page, setPage] = useState(1)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingCourse, setEditingCourse] = useState<TrainingCourse | null>(null)
  const [newCourse, setNewCourse] = useState({
    title: '',
    description: '',
    provider: '',
    modality: 'ONLINE',
    teamsMeetingUrl: '',
    sharepointUrl: '',
    onedriveUrl: '',
    durationMinutes: '',
  })

  const { data, isLoading } = useQuery({
    queryKey: ['training-courses', searchQuery, page],
    queryFn: () => performanceApi.getCourses({ query: searchQuery || undefined, page, size: 20 }),
  })

  const createMutation = useMutation({
    mutationFn: (course: typeof newCourse) =>
      performanceApi.createCourse({
        title: course.title,
        description: course.description || undefined,
        provider: course.provider || undefined,
        modality: course.modality as any,
        teamsMeetingUrl: course.teamsMeetingUrl || undefined,
        sharepointUrl: course.sharepointUrl || undefined,
        onedriveUrl: course.onedriveUrl || undefined,
        durationMinutes: course.durationMinutes ? Number(course.durationMinutes) : undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training-courses'] })
      setShowCreateModal(false)
      setNewCourse({
        title: '',
        description: '',
        provider: '',
        modality: 'ONLINE',
        teamsMeetingUrl: '',
        sharepointUrl: '',
        onedriveUrl: '',
        durationMinutes: '',
      })
      alert('Course created successfully!')
    },
    onError: (error: any) => {
      alert(`Failed to create course: ${error.message}`)
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ courseId, update }: { courseId: string; update: any }) =>
      performanceApi.updateCourse(courseId, update),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training-courses'] })
      setEditingCourse(null)
      alert('Course updated successfully!')
    },
    onError: (error: any) => {
      alert(`Failed to update course: ${error.message}`)
    },
  })

  const handleCreate = () => {
    if (!newCourse.title.trim()) {
      alert('Title is required')
      return
    }
    createMutation.mutate(newCourse)
  }

  const handleEdit = (course: TrainingCourse) => {
    setEditingCourse(course)
  }

  const handleUpdate = () => {
    if (!editingCourse) return
    if (!editingCourse.title.trim()) {
      alert('Title is required')
      return
    }
    updateMutation.mutate({
      courseId: editingCourse.courseId,
      update: {
        title: editingCourse.title,
        description: editingCourse.description || undefined,
        provider: editingCourse.provider || undefined,
        modality: editingCourse.modality,
        teamsMeetingUrl: editingCourse.teamsMeetingUrl || undefined,
        sharepointUrl: editingCourse.sharepointUrl || undefined,
        onedriveUrl: editingCourse.onedriveUrl || undefined,
        durationMinutes: editingCourse.durationMinutes || undefined,
        isActive: editingCourse.isActive,
      },
    })
  }

  const courses = data?.items || []
  const totalPages = Math.ceil((data?.totalCount || 0) / 20)

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Training Courses</h1>
          <p className="mt-2 text-gray-600">Manage training course catalog</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          <Plus className="w-5 h-5" />
          New Course
        </button>
      </div>

      {/* Search */}
      <div className="bg-white rounded-lg shadow p-4">
        <input
          type="text"
          placeholder="Search courses..."
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value)
            setPage(1)
          }}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {/* Courses Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        ) : courses.length === 0 ? (
          <div className="p-8 text-center text-gray-600">No courses found</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Title
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Provider
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Modality
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Duration
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Links
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {courses.map((course) => (
                    <tr key={course.courseId}>
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{course.title}</div>
                          {course.description && (
                            <div className="text-sm text-gray-500 mt-1">{course.description}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {course.provider || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {course.modality}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {course.durationMinutes ? `${course.durationMinutes} min` : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex gap-2">
                          {course.teamsMeetingUrl && (
                            <a
                              href={course.teamsMeetingUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800"
                              title="Teams Meeting"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          )}
                          {course.sharepointUrl && (
                            <a
                              href={course.sharepointUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800"
                              title="SharePoint"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          )}
                          {course.onedriveUrl && (
                            <a
                              href={course.onedriveUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800"
                              title="OneDrive"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          )}
                          {!course.teamsMeetingUrl && !course.sharepointUrl && !course.onedriveUrl && (
                            <span className="text-gray-400">—</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 text-xs rounded-full ${
                            course.isActive
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {course.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => handleEdit(course)}
                          className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
                        >
                          <Edit className="w-4 h-4" />
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  Page {page} of {totalPages}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Create Training Course</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                <input
                  type="text"
                  value={newCourse.title}
                  onChange={(e) => setNewCourse({ ...newCourse, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={newCourse.description}
                  onChange={(e) => setNewCourse({ ...newCourse, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Provider</label>
                  <input
                    type="text"
                    value={newCourse.provider}
                    onChange={(e) => setNewCourse({ ...newCourse, provider: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Modality</label>
                  <select
                    value={newCourse.modality}
                    onChange={(e) => setNewCourse({ ...newCourse, modality: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="ONLINE">Online</option>
                    <option value="IN_PERSON">In Person</option>
                    <option value="HYBRID">Hybrid</option>
                    <option value="SELF_PACED">Self Paced</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Duration (minutes)</label>
                <input
                  type="number"
                  value={newCourse.durationMinutes}
                  onChange={(e) => setNewCourse({ ...newCourse, durationMinutes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Teams Meeting URL</label>
                <input
                  type="url"
                  value={newCourse.teamsMeetingUrl}
                  onChange={(e) => setNewCourse({ ...newCourse, teamsMeetingUrl: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">SharePoint URL</label>
                <input
                  type="url"
                  value={newCourse.sharepointUrl}
                  onChange={(e) => setNewCourse({ ...newCourse, sharepointUrl: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">OneDrive URL</label>
                <input
                  type="url"
                  value={newCourse.onedriveUrl}
                  onChange={(e) => setNewCourse({ ...newCourse, onedriveUrl: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={createMutation.isPending}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {createMutation.isPending ? 'Creating...' : 'Create Course'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingCourse && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Edit Training Course</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                <input
                  type="text"
                  value={editingCourse.title}
                  onChange={(e) => setEditingCourse({ ...editingCourse, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={editingCourse.description || ''}
                  onChange={(e) => setEditingCourse({ ...editingCourse, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Provider</label>
                  <input
                    type="text"
                    value={editingCourse.provider || ''}
                    onChange={(e) => setEditingCourse({ ...editingCourse, provider: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Modality</label>
                  <select
                    value={editingCourse.modality}
                    onChange={(e) => setEditingCourse({ ...editingCourse, modality: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="ONLINE">Online</option>
                    <option value="IN_PERSON">In Person</option>
                    <option value="HYBRID">Hybrid</option>
                    <option value="SELF_PACED">Self Paced</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Duration (minutes)</label>
                <input
                  type="number"
                  value={editingCourse.durationMinutes || ''}
                  onChange={(e) => setEditingCourse({ ...editingCourse, durationMinutes: e.target.value ? Number(e.target.value) : undefined })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Teams Meeting URL</label>
                <input
                  type="url"
                  value={editingCourse.teamsMeetingUrl || ''}
                  onChange={(e) => setEditingCourse({ ...editingCourse, teamsMeetingUrl: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">SharePoint URL</label>
                <input
                  type="url"
                  value={editingCourse.sharepointUrl || ''}
                  onChange={(e) => setEditingCourse({ ...editingCourse, sharepointUrl: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">OneDrive URL</label>
                <input
                  type="url"
                  value={editingCourse.onedriveUrl || ''}
                  onChange={(e) => setEditingCourse({ ...editingCourse, onedriveUrl: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={editingCourse.isActive}
                    onChange={(e) => setEditingCourse({ ...editingCourse, isActive: e.target.checked })}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Active</span>
                </label>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setEditingCourse(null)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdate}
                disabled={updateMutation.isPending}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {updateMutation.isPending ? 'Updating...' : 'Update Course'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default TrainingCoursesPage

