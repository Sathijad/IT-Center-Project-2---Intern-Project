import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { performanceApi, type KpiSnapshot, type KpiTimeSeries } from '../lib/performanceApi'
import { BarChart3, TrendingUp } from 'lucide-react'

const KpiReportsPage = () => {
  const [filters, setFilters] = useState({
    userId: '',
    teamId: '',
    kpi: '',
    range: 'last30days',
  })
  const [viewMode, setViewMode] = useState<'snapshot' | 'timeseries'>('snapshot')

  const { data: snapshotData, isLoading: isLoadingSnapshot, error: snapshotError } = useQuery<KpiSnapshot[]>({
    queryKey: ['kpi-metrics', filters.userId, filters.teamId, filters.kpi, filters.range, 'snapshot'],
    queryFn: () =>
      performanceApi.getMetrics({
        userId: filters.userId ? Number(filters.userId) : undefined,
        teamId: filters.teamId ? Number(filters.teamId) : undefined,
        kpi: filters.kpi || undefined,
        range: filters.range,
      }),
    enabled: viewMode === 'snapshot',
    retry: 1,
    refetchOnWindowFocus: false,
  })

  const { data: timeSeriesData, isLoading: isLoadingTimeSeries, error: timeSeriesError } = useQuery<KpiTimeSeries[]>({
    queryKey: ['kpi-metrics', filters.userId, filters.teamId, filters.kpi, filters.range, 'timeseries'],
    queryFn: () =>
      performanceApi.getTimeSeries({
        userId: filters.userId ? Number(filters.userId) : undefined,
        teamId: filters.teamId ? Number(filters.teamId) : undefined,
        kpi: filters.kpi || undefined,
        range: filters.range,
      }),
    enabled: viewMode === 'timeseries',
    retry: 1,
    refetchOnWindowFocus: false,
  })

  // Safety check: ensure snapshotData is an array
  const safeSnapshotData = Array.isArray(snapshotData) ? snapshotData : []
  const safeTimeSeriesData = Array.isArray(timeSeriesData) ? timeSeriesData : []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">KPI Reports</h1>
        <p className="mt-2 text-gray-600">View IT Center performance metrics and trends</p>
        <p className="mt-1 text-sm text-gray-500">
          Track service desk metrics, system availability, security incidents, and customer satisfaction
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">User ID</label>
            <input
              type="number"
              value={filters.userId}
              onChange={(e) => setFilters({ ...filters, userId: e.target.value })}
              placeholder="Optional"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Team ID</label>
            <input
              type="number"
              value={filters.teamId}
              onChange={(e) => setFilters({ ...filters, teamId: e.target.value })}
              placeholder="Optional"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">KPI Code</label>
            <input
              type="text"
              value={filters.kpi}
              onChange={(e) => setFilters({ ...filters, kpi: e.target.value })}
              placeholder="Optional"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Time Range</label>
            <select
              value={filters.range}
              onChange={(e) => setFilters({ ...filters, range: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="last30days">Last 30 Days</option>
              <option value="last7days">Last 7 Days</option>
              <option value="last90days">Last 90 Days</option>
            </select>
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          <button
            onClick={() => setViewMode('snapshot')}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              viewMode === 'snapshot'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <BarChart3 className="w-4 h-4 inline mr-2" />
            Snapshot
          </button>
          <button
            onClick={() => setViewMode('timeseries')}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              viewMode === 'timeseries'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <TrendingUp className="w-4 h-4 inline mr-2" />
            Time Series
          </button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      {viewMode === 'snapshot' && safeSnapshotData.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {safeSnapshotData.slice(0, 3).map((kpi) => (
            <div key={kpi?.kpiCode || `kpi-${Math.random()}`} className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">{kpi?.kpiName || 'Unknown KPI'}</h3>
                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">{kpi?.kpiCode || 'N/A'}</span>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Current</span>
                  <span className="text-lg font-bold text-gray-900">
                    {kpi?.currentValue != null && typeof kpi.currentValue === 'number'
                      ? `${kpi.currentValue.toFixed(2)}${kpi?.unit ? ` ${kpi.unit}` : ''}`
                      : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Target</span>
                  <span className="text-lg font-semibold text-blue-600">
                    {kpi?.targetValue != null && typeof kpi.targetValue === 'number'
                      ? `${kpi.targetValue.toFixed(2)}${kpi?.unit ? ` ${kpi.unit}` : ''}`
                      : 'N/A'}
                  </span>
                </div>
                <div className="pt-2 border-t border-gray-200">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Variance</span>
                    <span
                      className={`text-sm font-semibold ${
                        kpi?.variance != null && typeof kpi.variance === 'number'
                          ? kpi.variance >= 0
                            ? 'text-green-600'
                            : 'text-red-600'
                          : 'text-gray-500'
                      }`}
                    >
                      {kpi?.variance != null && typeof kpi.variance === 'number'
                        ? `${kpi.variance >= 0 ? '+' : ''}${kpi.variance.toFixed(2)}${kpi?.unit ? ` ${kpi.unit}` : ''}`
                        : 'N/A'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Snapshot View */}
      {viewMode === 'snapshot' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {isLoadingSnapshot ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            </div>
          ) : snapshotError ? (
            <div className="p-8 text-center">
              <p className="text-red-600 mb-2">Error loading KPI data</p>
              <p className="text-sm text-gray-600">
                {snapshotError instanceof Error ? snapshotError.message : 'Unknown error occurred'}
              </p>
            </div>
          ) : safeSnapshotData.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      KPI
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Current Value
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Target
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Variance
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Last Measured
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {safeSnapshotData.map((kpi, index) => (
                    <tr key={kpi?.kpiCode || `kpi-${index}`}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{kpi?.kpiName || 'Unknown'}</div>
                          <div className="text-sm text-gray-500">{kpi?.kpiCode || 'N/A'}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {kpi?.currentValue != null && typeof kpi.currentValue === 'number'
                            ? `${kpi.currentValue.toFixed(2)}${kpi?.unit ? ` ${kpi.unit}` : ''}`
                            : 'N/A'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {kpi?.targetValue != null && typeof kpi.targetValue === 'number'
                            ? `${kpi.targetValue.toFixed(2)}${kpi?.unit ? ` ${kpi.unit}` : ''}`
                            : 'N/A'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div
                          className={`text-sm font-medium ${
                            kpi?.variance != null && typeof kpi.variance === 'number'
                              ? kpi.variance >= 0
                                ? 'text-green-600'
                                : 'text-red-600'
                              : 'text-gray-500'
                          }`}
                        >
                          {kpi?.variance != null && typeof kpi.variance === 'number'
                            ? `${kpi.variance >= 0 ? '+' : ''}${kpi.variance.toFixed(2)}${kpi?.unit ? ` ${kpi.unit}` : ''}`
                            : 'N/A'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {kpi?.lastMeasuredAt
                          ? new Date(kpi.lastMeasuredAt).toLocaleDateString()
                          : 'Never'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 text-center text-gray-600">No KPI data found</div>
          )}
        </div>
      )}

      {/* Time Series View */}
      {viewMode === 'timeseries' && (
        <div className="space-y-4">
          {isLoadingTimeSeries ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            </div>
          ) : timeSeriesError ? (
            <div className="p-8 text-center">
              <p className="text-red-600 mb-2">Error loading time series data</p>
              <p className="text-sm text-gray-600">
                {timeSeriesError instanceof Error ? timeSeriesError.message : 'Unknown error occurred'}
              </p>
            </div>
          ) : safeTimeSeriesData.length > 0 ? (
            safeTimeSeriesData.map((series) => (
              <div key={series.kpiCode} className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  {series.kpiName} ({series.kpiCode})
                  {series.unit && <span className="text-sm text-gray-500 ml-2">({series.unit})</span>}
                </h3>
                {series.dataPoints.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                            Date
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                            Value
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {series.dataPoints.map((point, idx) => (
                          <tr key={idx}>
                            <td className="px-4 py-2 text-sm text-gray-900">
                              {new Date(point.timestamp).toLocaleString()}
                            </td>
                            <td className="px-4 py-2 text-sm text-gray-900">
                              {point.value != null && typeof point.value === 'number'
                                ? `${point.value.toFixed(2)}${series.unit ? ` ${series.unit}` : ''}`
                                : 'N/A'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-gray-500">No data points available</p>
                )}
              </div>
            ))
          ) : (
            <div className="p-8 text-center text-gray-600">No time series data found</div>
          )}
        </div>
      )}
    </div>
  )
}

export default KpiReportsPage

