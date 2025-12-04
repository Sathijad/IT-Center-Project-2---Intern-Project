import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { performanceApi, type KpiResponse, type KpiActual } from '../lib/performanceApi'
import { BarChart, Plus, Calendar } from 'lucide-react'

const KpiActualsPage = () => {
  const queryClient = useQueryClient()
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [actual, setActual] = useState({
    kpiId: '',
    userId: '',
    teamId: '',
    measuredAt: new Date().toISOString().slice(0, 16), // Current date/time
    value: '',
    periodStart: '',
    periodEnd: '',
  })

  // Fetch all KPIs
  const { data: kpisData } = useQuery({
    queryKey: ['kpis-all'],
    queryFn: () => performanceApi.getKpis(),
  })

  const kpis = kpisData || []

  // Create actual mutation
  const createActualMutation = useMutation({
    mutationFn: (actualData: {
      kpiId: string
      userId?: number
      teamId?: number
      measuredAt: string
      value: number
      periodStart?: string
      periodEnd?: string
    }) => performanceApi.createActual(actualData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kpi-metrics'] })
      queryClient.invalidateQueries({ queryKey: ['kpi-actuals'] })
      setShowCreateModal(false)
      setActual({
        kpiId: '',
        userId: '',
        teamId: '',
        measuredAt: new Date().toISOString().slice(0, 16),
        value: '',
        periodStart: '',
        periodEnd: '',
      })
      alert('KPI actual value created successfully!')
    },
    onError: (error: any) => {
      alert(`Failed to create actual: ${error.response?.data?.error || error.message || 'Unknown error'}`)
    },
  })

  const handleCreate = () => {
    if (!actual.kpiId) {
      alert('Please select a KPI')
      return
    }
    if (!actual.value) {
      alert('Please enter a value')
      return
    }
    if (!actual.measuredAt) {
      alert('Please select a measurement date')
      return
    }

    createActualMutation.mutate({
      kpiId: actual.kpiId,
      userId: actual.userId ? Number(actual.userId) : undefined,
      teamId: actual.teamId ? Number(actual.teamId) : undefined,
      measuredAt: new Date(actual.measuredAt).toISOString(),
      value: Number(actual.value),
      periodStart: actual.periodStart ? new Date(actual.periodStart).toISOString().split('T')[0] : undefined,
      periodEnd: actual.periodEnd ? new Date(actual.periodEnd).toISOString().split('T')[0] : undefined,
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">KPI Actuals</h1>
          <p className="mt-2 text-gray-600">Record actual measured values for IT Center KPIs</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
        >
          <Plus className="w-5 h-5" />
          Record Actual Value
        </button>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-gray-600">
            <BarChart className="w-5 h-5" />
            <p className="font-medium">What are KPI Actuals?</p>
          </div>
          <p className="text-sm text-gray-600 ml-7">
            KPI Actuals are the <strong>measured values</strong> - the actual performance data from your systems.
            These become the "Current Value" you see in KPI Reports.
          </p>
          <div className="ml-7 space-y-2 text-sm text-gray-600">
            <p><strong>How to add actuals:</strong></p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li><strong>CSV Import:</strong> Upload bulk data via "KPI Import" page</li>
              <li><strong>Manual Entry:</strong> Use "Record Actual Value" button to add individual measurements</li>
              <li><strong>Employee Self-Service:</strong> Employees can submit their own actuals (coming soon)</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Create Actual Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Record KPI Actual Value</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">KPI *</label>
                <select
                  value={actual.kpiId}
                  onChange={(e) => setActual({ ...actual, kpiId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  required
                >
                  <option value="">Select a KPI</option>
                  {kpis.map((kpi: KpiResponse) => (
                    <option key={kpi.kpiId} value={kpi.kpiId}>
                      {kpi.name || 'Unnamed KPI'} ({kpi.code}) {kpi.unit ? `- ${kpi.unit}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Measured Value *</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.01"
                    value={actual.value}
                    onChange={(e) => setActual({ ...actual, value: e.target.value })}
                    placeholder="e.g., 18.5"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    required
                  />
                  {actual.kpiId && (
                    <span className="text-sm text-gray-500 whitespace-nowrap">
                      {kpis.find((k: KpiResponse) => k.kpiId === actual.kpiId)?.unit || 'units'}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  Enter the actual measured value (e.g., 18.5 hours, 99.7%, 245 tickets)
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Measurement Date & Time *</label>
                <input
                  type="datetime-local"
                  value={actual.measuredAt}
                  onChange={(e) => setActual({ ...actual, measuredAt: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  required
                />
                <p className="mt-1 text-xs text-gray-500">When was this value measured?</p>
              </div>

              <div className="border-t border-gray-200 pt-4">
                <p className="text-sm font-medium text-gray-700 mb-2">Scope (Optional)</p>
                <p className="text-xs text-gray-500 mb-3">
                  Leave both empty to record for the authenticated user, or specify user/team for specific assignments.
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">User ID</label>
                    <input
                      type="number"
                      min="1"
                      value={actual.userId}
                      onChange={(e) => setActual({ ...actual, userId: e.target.value })}
                      placeholder="Optional"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Team ID</label>
                    <input
                      type="number"
                      min="1"
                      value={actual.teamId}
                      onChange={(e) => setActual({ ...actual, teamId: e.target.value })}
                      placeholder="Optional"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-4">
                <p className="text-sm font-medium text-gray-700 mb-2">Period (Optional)</p>
                <p className="text-xs text-gray-500 mb-3">
                  Optional: Specify the period this measurement covers (e.g., for monthly averages).
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Period Start</label>
                    <input
                      type="date"
                      value={actual.periodStart}
                      onChange={(e) => setActual({ ...actual, periodStart: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Period End</label>
                    <input
                      type="date"
                      value={actual.periodEnd}
                      onChange={(e) => setActual({ ...actual, periodEnd: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    />
                  </div>
                </div>
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
                disabled={createActualMutation.isPending}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {createActualMutation.isPending ? 'Recording...' : 'Record Value'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default KpiActualsPage

