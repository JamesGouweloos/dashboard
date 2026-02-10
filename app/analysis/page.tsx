'use client'

import { useEffect, useState, useMemo } from 'react'
import DashboardLayout from '@/components/DashboardLayout'
import DashboardFilters from '@/components/DashboardFilters'
import SummaryCards from '@/components/SummaryCards'
import BreakdownTable from '@/components/BreakdownTable'
import { useDataRefresh } from '@/lib/useDataRefresh'
import { filterDashboardData, DashboardData } from '@/lib/dataFilters'

export default function AnalysisPage() {
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
      const response = await fetch('/api/data', { cache: 'no-store' })
      if (!response.ok) throw new Error('Failed to fetch data')
      const jsonData = await response.json()
      setData(jsonData)
      setLoading(false)
    } catch (err: any) {
      setError(err.message)
      setLoading(false)
    }
  }

  const filteredData = useMemo(() => {
    if (!data) return null
    return filterDashboardData(data, statusFilter, classFilter)
  }, [data, statusFilter, classFilter])

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading analysis data...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <p className="text-red-600 mb-4">Error: {error}</p>
            <p className="text-gray-600">Please run: python process_booking_data.py</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (!data || !filteredData) return null

  return (
    <DashboardLayout>
      <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Detailed Analysis</h1>
          <p className="text-gray-600">
          Yearly and monthly breakdown with booking details and filtering options
        </p>
        </div>

        <DashboardFilters
          statusFilter={statusFilter}
          classFilter={classFilter}
          onStatusFilterChange={setStatusFilter}
          onClassFilterChange={setClassFilter}
        />

        <SummaryCards data={filteredData.summary} />

        <BreakdownTable data={filteredData} />
      </div>
    </DashboardLayout>
  )
}

