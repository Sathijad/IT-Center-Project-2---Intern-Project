import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { performanceApi, type ImportJob } from '../lib/performanceApi'
import { Upload, CheckCircle, XCircle, Clock } from 'lucide-react'

const KpiImportPage = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [importJobId, setImportJobId] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)

  const { data: jobStatus, refetch } = useQuery<ImportJob>({
    queryKey: ['import-job', importJobId],
    queryFn: () => performanceApi.getImportJob(importJobId!),
    enabled: !!importJobId,
    refetchInterval: (data) => {
      // Poll every 2 seconds if job is still processing
      if (data?.status === 'QUEUED' || data?.status === 'PROCESSING') {
        return 2000
      }
      return false
    },
  })

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
        alert('Please select a CSV file')
        return
      }
      setSelectedFile(file)
    }
  }

  const handleUpload = async () => {
    if (!selectedFile) {
      alert('Please select a file')
      return
    }

    setIsUploading(true)
    try {
      const job = await performanceApi.importKpiActuals(selectedFile)
      setImportJobId(job.jobId)
      setSelectedFile(null)
      // Reset file input
      const fileInput = document.getElementById('file-input') as HTMLInputElement
      if (fileInput) fileInput.value = ''
    } catch (error: any) {
      alert(`Failed to upload file: ${error.message}`)
    } finally {
      setIsUploading(false)
    }
  }

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle className="w-5 h-5 text-green-600" />
      case 'FAILED':
        return <XCircle className="w-5 h-5 text-red-600" />
      case 'PROCESSING':
      case 'QUEUED':
        return <Clock className="w-5 h-5 text-yellow-600 animate-spin" />
      default:
        return null
    }
  }

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-green-100 text-green-800'
      case 'FAILED':
        return 'bg-red-100 text-red-800'
      case 'PROCESSING':
      case 'QUEUED':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">KPI Actuals Import</h1>
        <p className="mt-2 text-gray-600">Upload CSV file to import KPI actual values</p>
      </div>

      {/* Upload Section */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Upload CSV File</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              CSV File Format
            </label>
            <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-600">
              <p className="font-medium mb-2">Expected columns:</p>
              <ul className="list-disc list-inside space-y-1">
                <li><code>kpi_code</code> - KPI code (string)</li>
                <li><code>user_id</code> - User ID (number, optional)</li>
                <li><code>measured_at</code> - Measurement timestamp (ISO 8601 format)</li>
                <li><code>value</code> - KPI value (decimal number)</li>
              </ul>
              <p className="mt-3 font-medium">Example:</p>
              <pre className="mt-1 bg-white p-2 rounded border text-xs overflow-x-auto">
{`kpi_code,user_id,measured_at,value
SALES_TARGET,123,2025-01-15T10:00:00Z,15000.50
CUSTOMER_SATISFACTION,123,2025-01-15T10:00:00Z,4.5`}
              </pre>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Select File</label>
            <input
              id="file-input"
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            {selectedFile && (
              <p className="mt-2 text-sm text-gray-600">Selected: {selectedFile.name}</p>
            )}
          </div>

          <button
            onClick={handleUpload}
            disabled={!selectedFile || isUploading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            <Upload className="w-5 h-5" />
            {isUploading ? 'Uploading...' : 'Upload & Import'}
          </button>
        </div>
      </div>

      {/* Job Status */}
      {importJobId && jobStatus && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Import Job Status</h2>

          <div className="space-y-4">
            <div className="flex items-center gap-3">
              {getStatusIcon(jobStatus.status)}
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-900">Status:</span>
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                      jobStatus.status
                    )}`}
                  >
                    {jobStatus.status}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1">Job ID: {jobStatus.jobId}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Processed</p>
                <p className="text-lg font-semibold text-gray-900">{jobStatus.processedCount}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Failed</p>
                <p className="text-lg font-semibold text-red-600">{jobStatus.failedCount}</p>
              </div>
            </div>

            {jobStatus.errorDetails && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm font-medium text-red-800 mb-1">Error Details:</p>
                <p className="text-sm text-red-700">{jobStatus.errorDetails}</p>
              </div>
            )}

            <div className="text-sm text-gray-600">
              <p>Created: {new Date(jobStatus.createdAt).toLocaleString()}</p>
              {jobStatus.startedAt && (
                <p>Started: {new Date(jobStatus.startedAt).toLocaleString()}</p>
              )}
              {jobStatus.completedAt && (
                <p>Completed: {new Date(jobStatus.completedAt).toLocaleString()}</p>
              )}
            </div>

            {(jobStatus.status === 'QUEUED' || jobStatus.status === 'PROCESSING') && (
              <button
                onClick={() => refetch()}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
              >
                Refresh Status
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default KpiImportPage

