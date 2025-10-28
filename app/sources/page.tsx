'use client'

import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/DashboardLayout'
import DashboardFilters from '@/components/DashboardFilters'
import TopSourcesChart from '@/components/TopSourcesChart'
import TopExtrasChart from '@/components/TopExtrasChart'
import { filterDashboardData, DashboardData } from '@/lib/dataFilters'
import { useDataRefresh } from '@/lib/useDataRefresh'

export default function SourcesPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('All')
  const [classFilter, setClassFilter] = useState<string>('All')
  const refreshKey = useDataRefresh()

  useEffect(() => {
    fetchData()
  }, [refreshKey])

  const fetchData = async () => {
    try {
      const response = await fetch('/api/data')
      if (!response.ok) throw new Error('Failed to fetch data')
      const jsonData = await response.json()
      setData(jsonData)
      setLoading(false)
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('An unknown error occurred')
      }
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading sources data...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (error || !data) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <p className="text-red-600 mb-4">Error loading data</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  const filteredData = filterDashboardData(data, statusFilter, classFilter)

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Sources & Extras</h1>
          <p className="text-gray-600">
            Booking sources performance and revenue extras analysis
          </p>
        </div>

        <DashboardFilters
          statusFilter={statusFilter}
          classFilter={classFilter}
          onStatusFilterChange={setStatusFilter}
          onClassFilterChange={setClassFilter}
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <TopSourcesChart data={filteredData.by_source || data.by_source} />
          <TopExtrasChart data={filteredData.top_extras || data.top_extras} />
        </div>
      </div>
    </DashboardLayout>
  )
}
