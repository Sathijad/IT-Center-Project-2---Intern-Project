import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../contexts/AuthContext'
import { performanceApi, type KpiSnapshot } from '../lib/performanceApi'
import { TrendingUp, RefreshCw, AlertCircle } from 'lucide-react'

const EmployeeKpiDashboard: React.FC = () => {
  const { user } = useAuth()

  const { data: kpiData, isLoading, error, refetch } = useQuery<KpiSnapshot[]>({
    queryKey: ['employee-kpi-metrics', user?.id],
    queryFn: async () => {
      try {
        return await performanceApi.getMetrics({
          userId: user?.id,
          range: 'last30days',
        })
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

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Never'
    try {
      const date = new Date(dateString)
      return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`
    } catch (e) {
      return dateString
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  // Show error state if there's an error
  if (error) {
    const errorMessage = error instanceof Error 
      ? error.message 
      : (error as any)?.response?.data?.message || 'An error occurred while loading KPIs'
    
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">KPI Dashboard</h1>
          <p className="mt-2 text-gray-600">View your performance metrics</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="w-16 h-16 text-red-400 mb-4" />
            <p className="text-lg font-medium text-gray-900 mb-2">Failed to load KPIs</p>
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
  const safeKpiData = Array.isArray(kpiData) ? kpiData.filter(kpi => kpi != null) : []

  if (safeKpiData.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">KPI Dashboard</h1>
          <p className="mt-2 text-gray-600">View your performance metrics</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex flex-col items-center justify-center py-12">
            <TrendingUp className="w-16 h-16 text-gray-400 mb-4" />
            <p className="text-lg font-medium text-gray-900">No KPI data available</p>
            <p className="text-sm text-gray-600 mt-2">
              Your performance metrics will appear here once data is available
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
          <h1 className="text-3xl font-bold text-gray-900">KPI Dashboard</h1>
          <p className="mt-2 text-gray-600">View your performance metrics</p>
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
        {safeKpiData.map((kpi, index) => {
          // Safely extract numeric values with null checks
          const currentValue = kpi.currentValue != null ? Number(kpi.currentValue) : null
          const targetValue = kpi.targetValue != null ? Number(kpi.targetValue) : null
          const variance = kpi.variance != null ? Number(kpi.variance) : null
          
          return (
            <div key={index} className="bg-white rounded-lg shadow p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">{kpi.kpiName || 'Unknown KPI'}</h3>
                  {kpi.kpiCode && (
                    <p className="text-sm text-gray-600 mt-1">{kpi.kpiCode}</p>
                  )}
                </div>
                {variance !== null && !isNaN(variance) && (
                  <div
                    className={`px-4 py-2 rounded-full text-sm font-bold ${
                      variance >= 0
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {variance >= 0 ? '+' : ''}
                    {variance.toFixed(2)}
                    {kpi.unit ? ` ${kpi.unit}` : ''}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-sm font-medium text-gray-600 mb-1">Current</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {currentValue !== null && !isNaN(currentValue)
                      ? `${currentValue.toFixed(2)}${kpi.unit ? ` ${kpi.unit}` : ''}`
                      : 'N/A'}
                  </p>
                </div>
                <div className="bg-orange-50 rounded-lg p-4">
                  <p className="text-sm font-medium text-gray-600 mb-1">Target</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {targetValue !== null && !isNaN(targetValue)
                      ? `${targetValue.toFixed(2)}${kpi.unit ? ` ${kpi.unit}` : ''}`
                      : 'N/A'}
                  </p>
                </div>
              </div>

              {kpi.lastMeasuredAt && (
                <p className="text-sm text-gray-600">
                  Last measured: {formatDate(kpi.lastMeasuredAt)}
                </p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default EmployeeKpiDashboard

