import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { importSchedules, getImportJob } from '../lib/schedulesApi'

const CsvImportPage = () => {
  const [fileName, setFileName] = useState('')
  const [base64Payload, setBase64Payload] = useState('')
  const [jobId, setJobId] = useState<string | null>(null)
  const [dryRun, setDryRun] = useState(false)

  const mutation = useMutation({
    mutationFn: () => importSchedules({ fileName, base64Payload, dryRun }),
    onSuccess: (data) => setJobId(data.jobId),
  })

  const jobQuery = useQuery({
    queryKey: ['import-job', jobId],
    queryFn: () => getImportJob(jobId as string),
    enabled: Boolean(jobId),
    refetchInterval: (query) => {
      const status = query.state.data?.status
      return status === 'Succeeded' || status === 'Failed' ? false : 4000
    },
  })

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      const base64 = result.split(',')[1]
      setBase64Payload(base64)
      setFileName(file.name)
    }
    reader.readAsDataURL(file)
  }

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    if (!fileName || !base64Payload) return
    mutation.mutate()
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold text-gray-900">Bulk Schedule Import</h1>
        <p className="text-sm text-gray-500">
          Upload CSV files to create weekly schedules in bulk. Track job processing status below.
        </p>
      </header>

      <section className="bg-white rounded-xl shadow border border-gray-100 p-6 space-y-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block text-sm text-gray-600">
            CSV File
            <input type="file" accept=".csv" className="mt-1 block w-full" onChange={handleFileChange} />
          </label>
          <label className="inline-flex items-center text-sm text-gray-600 space-x-2">
            <input type="checkbox" checked={dryRun} onChange={(e) => setDryRun(e.target.checked)} />
            <span>Dry run (validation only)</span>
          </label>
          <button
            type="submit"
            className="px-4 py-2 bg-emerald-600 text-white rounded font-semibold hover:bg-emerald-700 disabled:opacity-50"
            disabled={mutation.isPending || !base64Payload}
          >
            {mutation.isPending ? 'Submitting...' : 'Start Import'}
          </button>
        </form>
        {mutation.isError && <p className="text-sm text-red-600">Failed to queue import job.</p>}
      </section>

      {jobId && (
        <section className="bg-white rounded-xl shadow border border-gray-100 p-6 space-y-2">
          <h2 className="text-lg font-semibold text-gray-800">Job Status</h2>
          <p className="text-sm text-gray-500">Job ID: {jobId}</p>
          {jobQuery.data ? (
            <div className="grid gap-2 text-sm text-gray-700">
              <div className="flex justify-between"><span>Status</span><span className="font-semibold">{jobQuery.data.status}</span></div>
              <div className="flex justify-between"><span>Processed</span><span>{jobQuery.data.processedCount}</span></div>
              <div className="flex justify-between"><span>Failed</span><span>{jobQuery.data.failedCount}</span></div>
              {jobQuery.data.errorDetails && <p className="text-red-600">Error: {jobQuery.data.errorDetails}</p>}
            </div>
          ) : (
            <p className="text-sm text-gray-500">Loading job status...</p>
          )}
        </section>
      )}
    </div>
  )
}

export default CsvImportPage

