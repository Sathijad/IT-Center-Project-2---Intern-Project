import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { performanceApi, type KpiResponse } from '../lib/performanceApi'
import { Target, Plus, Calendar, FileText } from 'lucide-react'

const KpiTargetsPage = () => {
  const queryClient = useQueryClient()
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showCreateKpiModal, setShowCreateKpiModal] = useState(false)
  const [target, setTarget] = useState({
    kpiId: '',
    userId: '',
    teamId: '',
    periodType: 'Monthly',
    periodStart: '',
    periodEnd: '',
    targetValue: '',
  })
  const [newKpi, setNewKpi] = useState({
    code: '',
    name: '',
    description: '',
    unit: '',
    category: '',
    calculationHint: '',
    // Optional initial actual value
    includeInitialValue: false,
    initialValue: '',
    initialMeasuredAt: new Date().toISOString().slice(0, 16),
    initialUserId: '',
  })

  // Fetch all KPIs
  const { data: kpisData } = useQuery({
    queryKey: ['kpis-all'],
    queryFn: () => performanceApi.getKpis(),
  })

  const kpis = kpisData || []

  // Create KPI mutation
  const createKpiMutation = useMutation({
    mutationFn: async (data: {
      kpiData: {
        code: string
        name: string
        description?: string
        unit?: string
        category?: string
        calculationHint?: string
      }
      includeInitialValue?: boolean
      initialValue?: string
      initialMeasuredAt?: string
      initialUserId?: string
    }) => {
      // First create the KPI
      const kpi = await performanceApi.createKpi(data.kpiData)
      
      // If initial value is provided, create an actual
      let hadInitialValue = false
      if (data.includeInitialValue && data.initialValue && data.initialMeasuredAt) {
        try {
          await performanceApi.createActual({
            kpiId: kpi.kpiId,
            userId: data.initialUserId ? Number(data.initialUserId) : undefined,
            measuredAt: new Date(data.initialMeasuredAt).toISOString(),
            value: Number(data.initialValue),
          })
          hadInitialValue = true
        } catch (error) {
          // Log error but don't fail the KPI creation
          console.error('Failed to create initial actual:', error)
        }
      }
      
      return { kpi, hadInitialValue }
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['kpis-all'] })
      queryClient.invalidateQueries({ queryKey: ['kpi-metrics'] })
      setShowCreateKpiModal(false)
      setNewKpi({
        code: '',
        name: '',
        description: '',
        unit: '',
        category: '',
        calculationHint: '',
        includeInitialValue: false,
        initialValue: '',
        initialMeasuredAt: new Date().toISOString().slice(0, 16),
        initialUserId: '',
      })
      alert(result.hadInitialValue 
        ? 'KPI created successfully! Initial value recorded.' 
        : 'KPI created successfully!')
    },
    onError: (error: any) => {
      alert(`Failed to create KPI: ${error.response?.data?.error || error.message || 'Unknown error'}`)
    },
  })

  const handleCreateKpi = () => {
    if (!newKpi.code.trim()) {
      alert('Please enter a KPI code')
      return
    }
    if (!newKpi.name.trim()) {
      alert('Please enter a KPI name')
      return
    }

    // Validate code format (should be uppercase with underscores)
    const codePattern = /^[A-Z][A-Z0-9_]*$/
    if (!codePattern.test(newKpi.code)) {
      alert('KPI code must be uppercase letters, numbers, and underscores only (e.g., TICKET_RESOLUTION_TIME)')
      return
    }

    // Validate initial value if included
    if (newKpi.includeInitialValue) {
      if (!newKpi.initialValue.trim()) {
        alert('Please enter an initial value or uncheck "Include Initial Value"')
        return
      }
      if (!newKpi.initialMeasuredAt) {
        alert('Please select a measurement date for the initial value')
        return
      }
    }

    createKpiMutation.mutate({
      kpiData: {
        code: newKpi.code.trim().toUpperCase(),
        name: newKpi.name.trim(),
        description: newKpi.description.trim() || undefined,
        unit: newKpi.unit.trim() || undefined,
        category: newKpi.category.trim() || undefined,
        calculationHint: newKpi.calculationHint.trim() || undefined,
      },
      includeInitialValue: newKpi.includeInitialValue,
      initialValue: newKpi.includeInitialValue ? newKpi.initialValue.trim() : undefined,
      initialMeasuredAt: newKpi.includeInitialValue ? newKpi.initialMeasuredAt : undefined,
      initialUserId: newKpi.includeInitialValue && newKpi.initialUserId ? newKpi.initialUserId.trim() : undefined,
    })
  }

  // Create target mutation
  const createTargetMutation = useMutation({
    mutationFn: (targetData: {
      kpiId: string
      userId?: number
      teamId?: number
      periodType: string
      periodStart: string
      periodEnd: string
      targetValue: number
    }) => performanceApi.createTarget(targetData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kpi-targets'] })
      queryClient.invalidateQueries({ queryKey: ['kpi-metrics'] })
      setShowCreateModal(false)
      setTarget({
        kpiId: '',
        userId: '',
        teamId: '',
        periodType: 'Monthly',
        periodStart: '',
        periodEnd: '',
        targetValue: '',
      })
      alert('KPI target created successfully!')
    },
    onError: (error: any) => {
      alert(`Failed to create target: ${error.message || 'Unknown error'}`)
    },
  })

  const handleCreate = () => {
    if (!target.kpiId) {
      alert('Please select a KPI')
      return
    }
    if (!target.periodStart || !target.periodEnd) {
      alert('Please select period start and end dates')
      return
    }
    if (!target.targetValue) {
      alert('Please enter a target value')
      return
    }

    // Validate dates
    const startDate = new Date(target.periodStart)
    const endDate = new Date(target.periodEnd)
    if (endDate < startDate) {
      alert('Period end date must be after period start date')
      return
    }

    createTargetMutation.mutate({
      kpiId: target.kpiId,
      userId: target.userId ? Number(target.userId) : undefined,
      teamId: target.teamId ? Number(target.teamId) : undefined,
      periodType: target.periodType,
      periodStart: new Date(target.periodStart).toISOString().split('T')[0], // YYYY-MM-DD format
      periodEnd: new Date(target.periodEnd).toISOString().split('T')[0], // YYYY-MM-DD format
      targetValue: Number(target.targetValue),
    })
  }

  // Helper to set period dates based on period type
  const handlePeriodTypeChange = (periodType: string) => {
    const today = new Date()
    let startDate = new Date()
    let endDate = new Date()

    switch (periodType) {
      case 'Daily':
        startDate = new Date(today)
        endDate = new Date(today)
        break
      case 'Weekly':
        // Start of current week (Monday)
        const dayOfWeek = today.getDay()
        const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1)
        startDate = new Date(today.setDate(diff))
        endDate = new Date(startDate)
        endDate.setDate(startDate.getDate() + 6)
        break
      case 'Monthly':
        startDate = new Date(today.getFullYear(), today.getMonth(), 1)
        endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0)
        break
      case 'Quarterly':
        const quarter = Math.floor(today.getMonth() / 3)
        startDate = new Date(today.getFullYear(), quarter * 3, 1)
        endDate = new Date(today.getFullYear(), (quarter + 1) * 3, 0)
        break
      case 'Yearly':
        startDate = new Date(today.getFullYear(), 0, 1)
        endDate = new Date(today.getFullYear(), 11, 31)
        break
    }

    setTarget({
      ...target,
      periodType,
      periodStart: startDate.toISOString().split('T')[0],
      periodEnd: endDate.toISOString().split('T')[0],
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">KPI Targets</h1>
          <p className="mt-2 text-gray-600">Set performance targets for IT Center KPIs</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowCreateKpiModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
          >
            <FileText className="w-5 h-5" />
            Create KPI
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            <Plus className="w-5 h-5" />
            Create Target
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-gray-600">
            <Target className="w-5 h-5" />
            <p className="font-medium">Understanding KPIs, Actuals, and Targets</p>
          </div>
          <div className="ml-7 space-y-3 text-sm text-gray-600">
            <div>
              <p className="font-semibold text-gray-900 mb-1">1. KPI Definition (What you're measuring)</p>
              <p>KPIs are just definitions - they don't have values. They define what you're tracking (e.g., "Ticket Resolution Time", "System Uptime").</p>
              <p className="text-xs text-gray-500 mt-1">✅ Create manually OR auto-created during CSV import</p>
            </div>
            <div>
              <p className="font-semibold text-gray-900 mb-1">2. KPI Actuals (Current Values - what happened)</p>
              <p>These are the <strong>measured values</strong> - the actual performance data. This is what shows as "Current Value" in reports.</p>
              <p className="text-xs text-gray-500 mt-1">✅ Created via CSV Import (upload actual measured values)</p>
            </div>
            <div>
              <p className="font-semibold text-gray-900 mb-1">3. KPI Targets (Goals - what you want)</p>
              <p>These are the <strong>goals/targets</strong> you want to achieve. This is what shows as "Target Value" in reports.</p>
              <p className="text-xs text-gray-500 mt-1">✅ Created manually using "Create Target" button</p>
            </div>
            <div className="border-t border-gray-200 pt-2 mt-2">
              <p className="font-semibold text-gray-900 mb-1">In KPI Reports:</p>
              <p>Current Value = Latest actual (from import) | Target Value = Goal (from targets) | Variance = Current - Target</p>
            </div>
          </div>
        </div>
      </div>

      {/* Create Target Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Create KPI Target</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">KPI *</label>
                <select
                  value={target.kpiId}
                  onChange={(e) => setTarget({ ...target, kpiId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="">Select a KPI</option>
                  {kpis.map((kpi: KpiResponse) => (
                    <option key={kpi.kpiId} value={kpi.kpiId}>
                      {kpi.name || 'Unnamed KPI'} ({kpi.code}) {kpi.unit ? `- ${kpi.unit}` : ''}
                    </option>
                  ))}
                </select>
                {target.kpiId && (
                  <p className="mt-1 text-xs text-gray-500">
                    {kpis.find((k: KpiResponse) => k.kpiId === target.kpiId)?.description || 'No description available'}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Period Type *</label>
                <select
                  value={target.periodType}
                  onChange={(e) => handlePeriodTypeChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="Daily">Daily</option>
                  <option value="Weekly">Weekly</option>
                  <option value="Monthly">Monthly</option>
                  <option value="Quarterly">Quarterly</option>
                  <option value="Yearly">Yearly</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Period Start *</label>
                  <input
                    type="date"
                    value={target.periodStart}
                    onChange={(e) => setTarget({ ...target, periodStart: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Period End *</label>
                  <input
                    type="date"
                    value={target.periodEnd}
                    onChange={(e) => setTarget({ ...target, periodEnd: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Target Value *</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.01"
                    value={target.targetValue}
                    onChange={(e) => setTarget({ ...target, targetValue: e.target.value })}
                    placeholder="e.g., 24.0"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                  {target.kpiId && (
                    <span className="text-sm text-gray-500 whitespace-nowrap">
                      {kpis.find((k: KpiResponse) => k.kpiId === target.kpiId)?.unit || 'units'}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  Enter the target value you want to achieve for this KPI during the selected period.
                </p>
              </div>

              <div className="border-t border-gray-200 pt-4">
                <p className="text-sm font-medium text-gray-700 mb-2">Scope (Optional)</p>
                <p className="text-xs text-gray-500 mb-3">
                  Leave both empty for organization-wide target, or specify user/team for specific targets.
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">User ID</label>
                    <input
                      type="number"
                      value={target.userId}
                      onChange={(e) => setTarget({ ...target, userId: e.target.value })}
                      placeholder="Optional"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Team ID</label>
                    <input
                      type="number"
                      value={target.teamId}
                      onChange={(e) => setTarget({ ...target, teamId: e.target.value })}
                      placeholder="Optional"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                disabled={createTargetMutation.isPending}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {createTargetMutation.isPending ? 'Creating...' : 'Create Target'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create KPI Modal */}
      {showCreateKpiModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Create New KPI</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  KPI Code * <span className="text-xs text-gray-500">(e.g., TICKET_RESOLUTION_TIME)</span>
                </label>
                <input
                  type="text"
                  value={newKpi.code}
                  onChange={(e) => setNewKpi({ ...newKpi, code: e.target.value.toUpperCase() })}
                  placeholder="TICKET_RESOLUTION_TIME"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  required
                />
                <p className="mt-1 text-xs text-gray-500">
                  Use uppercase letters, numbers, and underscores. This is the unique identifier.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">KPI Name *</label>
                <input
                  type="text"
                  value={newKpi.name}
                  onChange={(e) => setNewKpi({ ...newKpi, name: e.target.value })}
                  placeholder="Ticket Resolution Time"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  required
                />
                <p className="mt-1 text-xs text-gray-500">A human-readable name for this KPI.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={newKpi.description}
                  onChange={(e) => setNewKpi({ ...newKpi, description: e.target.value })}
                  placeholder="Average time taken to resolve support tickets..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
                  <select
                    value={newKpi.unit}
                    onChange={(e) => setNewKpi({ ...newKpi, unit: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  >
                    <option value="">Select unit</option>
                    <option value="Hours">Hours</option>
                    <option value="Minutes">Minutes</option>
                    <option value="Percentage">Percentage</option>
                    <option value="Count">Count</option>
                    <option value="Score">Score</option>
                    <option value="USD">USD</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select
                    value={newKpi.category}
                    onChange={(e) => setNewKpi({ ...newKpi, category: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  >
                    <option value="">Select category</option>
                    <option value="Service Desk">Service Desk</option>
                    <option value="System Availability">System Availability</option>
                    <option value="Security">Security</option>
                    <option value="Change Management">Change Management</option>
                    <option value="Customer Satisfaction">Customer Satisfaction</option>
                    <option value="Training & Development">Training & Development</option>
                    <option value="General">General</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Calculation Hint</label>
                <input
                  type="text"
                  value={newKpi.calculationHint}
                  onChange={(e) => setNewKpi({ ...newKpi, calculationHint: e.target.value })}
                  placeholder="e.g., Average of resolution times"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
                <p className="mt-1 text-xs text-gray-500">Optional hint about how this KPI is calculated.</p>
              </div>

              {/* Optional Initial Actual Value */}
              <div className="border-t border-gray-200 pt-4">
                <div className="flex items-center gap-2 mb-3">
                  <input
                    type="checkbox"
                    id="includeInitialValue"
                    checked={newKpi.includeInitialValue}
                    onChange={(e) => setNewKpi({ ...newKpi, includeInitialValue: e.target.checked })}
                    className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                  />
                  <label htmlFor="includeInitialValue" className="text-sm font-medium text-gray-700">
                    Include Initial Actual Value (Optional)
                  </label>
                </div>
                <p className="text-xs text-gray-500 mb-3 ml-6">
                  Record the first measured value for this KPI when creating it. This is useful when you already have data.
                </p>

                {newKpi.includeInitialValue && (
                  <div className="ml-6 space-y-3 bg-gray-50 p-4 rounded-lg">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Initial Value *</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          step="0.01"
                          value={newKpi.initialValue}
                          onChange={(e) => setNewKpi({ ...newKpi, initialValue: e.target.value })}
                          placeholder="e.g., 18.5"
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        />
                        {newKpi.unit && (
                          <span className="text-sm text-gray-500 whitespace-nowrap">{newKpi.unit}</span>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-gray-500">Enter the actual measured value (e.g., 18.5 hours, 99.7%, 245 tickets)</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Measurement Date & Time *</label>
                      <input
                        type="datetime-local"
                        value={newKpi.initialMeasuredAt}
                        onChange={(e) => setNewKpi({ ...newKpi, initialMeasuredAt: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">User ID (Optional)</label>
                      <input
                        type="number"
                        min="1"
                        value={newKpi.initialUserId}
                        onChange={(e) => setNewKpi({ ...newKpi, initialUserId: e.target.value })}
                        placeholder="Leave empty for organization-wide"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      />
                      <p className="mt-1 text-xs text-gray-500">Leave empty to record organization-wide, or specify user ID for user-specific value</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowCreateKpiModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateKpi}
                disabled={createKpiMutation.isPending}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {createKpiMutation.isPending ? 'Creating...' : 'Create KPI'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Info Section */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Calendar className="w-5 h-5 text-blue-600 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-blue-900 mb-1">Example: Setting a Monthly Target</p>
            <p className="text-xs text-blue-800">
              To set a target for "Ticket Resolution Time" in January 2025:
            </p>
            <ul className="text-xs text-blue-800 mt-2 ml-4 list-disc space-y-1">
              <li>Select KPI: <strong>Ticket Resolution Time</strong></li>
              <li>Period Type: <strong>Monthly</strong></li>
              <li>Period Start: <strong>2025-01-01</strong></li>
              <li>Period End: <strong>2025-01-31</strong></li>
              <li>Target Value: <strong>24</strong> (hours)</li>
            </ul>
            <p className="text-xs text-blue-800 mt-2">
              This means your goal is to resolve tickets within 24 hours during January 2025.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default KpiTargetsPage

