'use client'

import { useEffect, useState, useMemo } from 'react'
import DashboardLayout from '@/components/DashboardLayout'
import AuthGuard from '@/components/AuthGuard'
import DashboardFilters from '@/components/DashboardFilters'
import SummaryCards from '@/components/SummaryCards'
import RevenueChart from '@/components/RevenueChart'
import TargetVsActualChart from '@/components/TargetVsActualChart'
import RevenueEfficiencyChart from '@/components/RevenueEfficiencyChart'
import { filterDashboardData, DashboardData, SummaryData } from '@/lib/dataFilters'
import { useDataRefresh } from '@/lib/useDataRefresh'

export default function Home() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('All')
  const [classFilter, setClassFilter] = useState<string>('All')
  const [selectedYears, setSelectedYears] = useState<number[]>([])
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
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('An unknown error occurred')
      }
      setLoading(false)
    }
  }

  // Get available years from monthly_bookings - MUST be before conditional returns
  const availableYears = useMemo(() => {
    if (!data?.monthly_bookings) return []
    const years = Object.keys(data.monthly_bookings)
      .map(y => parseInt(y))
      .filter(y => !isNaN(y))
      .sort((a, b) => a - b)
    return years
  }, [data])

  // Initialize selectedYears to all years if empty - MUST be before conditional returns
  useEffect(() => {
    if (data && selectedYears.length === 0 && availableYears.length > 0) {
      setSelectedYears([...availableYears])
    }
  }, [data, availableYears, selectedYears.length])

  // Calculate filtered data - MUST be before conditional returns
  const filteredData = useMemo(() => {
    if (!data) return null
    return filterDashboardData(data, statusFilter, classFilter, selectedYears)
  }, [data, statusFilter, classFilter, selectedYears])

  if (loading) {
    return (
      <AuthGuard>
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading dashboard data...</p>
          </div>
        </div>
      </DashboardLayout>
      </AuthGuard>
    )
  }

  if (error) {
    return (
      <AuthGuard>
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <p className="text-red-600 mb-4">Error: {error}</p>
            <p className="text-gray-600">Please run: python process_booking_data.py</p>
          </div>
        </div>
      </DashboardLayout>
      </AuthGuard>
    )
  }

  if (!data || !filteredData) {
    return (
      <AuthGuard>
        <DashboardLayout>
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
              <p className="text-gray-600">No data available</p>
            </div>
          </div>
        </DashboardLayout>
      </AuthGuard>
    )
  }

  const toggleYear = (year: number) => {
    setSelectedYears(prev => 
      prev.includes(year) 
        ? prev.filter(y => y !== year)
        : [...prev, year].sort((a, b) => a - b)
    )
  }

  const selectAllYears = () => {
    setSelectedYears([...availableYears])
  }

  const clearYearFilters = () => {
    setSelectedYears([])
  }

  return (
    <AuthGuard>
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard Overview</h1>
          <p className="text-gray-600">
            Key metrics and visualizations for booking performance
          </p>
        </div>

        <DashboardFilters
          statusFilter={statusFilter}
          classFilter={classFilter}
          onStatusFilterChange={setStatusFilter}
          onClassFilterChange={setClassFilter}
        />

        {/* Year Filter */}
        {availableYears.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-gray-700">Filter by Year:</span>
                {selectedYears.length > 0 && (
                  <span className="text-xs text-gray-500">
                    ({selectedYears.length} of {availableYears.length} selected)
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-2">
                {selectedYears.length < availableYears.length && (
                  <button
                    onClick={selectAllYears}
                    className="text-xs text-primary-600 hover:text-primary-700 font-medium"
                  >
                    Select All
                  </button>
                )}
                {selectedYears.length > 0 && (
                  <button
                    onClick={clearYearFilters}
                    className="text-xs text-gray-600 hover:text-gray-700 font-medium"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {availableYears.map(year => {
                const isSelected = selectedYears.includes(year)
                return (
                  <button
                    key={year}
                    onClick={() => toggleYear(year)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      isSelected
                        ? 'bg-primary-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {year}
                  </button>
                )
              })}
            </div>
            {selectedYears.length === 0 && (
              <p className="text-xs text-gray-500 mt-2">
                All years shown. Click years to filter.
              </p>
            )}
          </div>
        )}

        <SummaryCards data={filteredData.summary} />
        
        <RevenueChart data={filteredData.revenue_trends || data.revenue_trends} />
        
        <TargetVsActualChart data={{ revenue_trends: filteredData.revenue_trends || data.revenue_trends }} />
        
        <RevenueEfficiencyChart 
          revenueTrends={filteredData.revenue_trends || data.revenue_trends}
        />
      </div>
    </DashboardLayout>
    </AuthGuard>
  )
}
