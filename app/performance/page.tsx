'use client'

import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/DashboardLayout'
import DashboardFilters from '@/components/DashboardFilters'
import { filterDashboardData } from '@/lib/dataFilters'
import { useDataRefresh } from '@/lib/useDataRefresh'
import RevenueTimeChart from '@/components/RevenueTimeChart'
import RevenueEfficiencyChart from '@/components/RevenueEfficiencyChart'
import TopAgentsChart from '@/components/TopAgentsChart'
import TopSourcesChart from '@/components/TopSourcesChart'

export default function PerformancePage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
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
    } catch (err: any) {
      setError(err.message)
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading performance data...</p>
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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Performance Analysis</h1>
          <p className="text-gray-600">
            Revenue trends, efficiency metrics, and agent/source performance
          </p>
        </div>

        <DashboardFilters
          statusFilter={statusFilter}
          classFilter={classFilter}
          onStatusFilterChange={setStatusFilter}
          onClassFilterChange={setClassFilter}
        />

        {/* Revenue Over Time */}
        <RevenueTimeChart data={data} />

        {/* Revenue Efficiency */}
        <RevenueEfficiencyChart data={data} />

        {/* Top Performers */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <TopAgentsChart data={data} />
          <TopSourcesChart data={filteredData.by_source || data.by_source} />
        </div>
      </div>
    </DashboardLayout>
  )
}

