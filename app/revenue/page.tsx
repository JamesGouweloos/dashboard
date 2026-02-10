'use client'

import { useEffect, useState, useMemo } from 'react'
import DashboardLayout from '@/components/DashboardLayout'
import DashboardFilters from '@/components/DashboardFilters'
import SummaryCards from '@/components/SummaryCards'
import AgencyRankingList from '@/components/AgencyRankingList'
import AgencyClassification from '@/components/AgencyClassification'
import AgencyPerformanceClassification from '@/components/AgencyPerformanceClassification'
import DirectVsAgencyBedNightsChart from '@/components/DirectVsAgencyBedNightsChart'
import { filterDashboardData, DashboardData } from '@/lib/dataFilters'
import { useDataRefresh } from '@/lib/useDataRefresh'
import { useAgencyClassification } from '@/lib/useAgencyClassification'

export default function AgencyAnalysisPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('All')
  const [classFilter, setClassFilter] = useState<string>('All')
  const [selectedYears, setSelectedYears] = useState<number[]>([])
  const [metric, setMetric] = useState<'revenue' | 'bed_nights'>('revenue')
  const [viewMode, setViewMode] = useState<'Agent' | 'Direct'>('Agent')
  const refreshKey = useDataRefresh()
  const { config: agencyConfig, refetch: refetchAgencyConfig } = useAgencyClassification()

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

  // Get all unique agencies from the data - MUST be before conditional returns
  const allAgencies = useMemo(() => {
    if (!data?.monthly_bookings) return []
    const agencies = new Set<string>()
    Object.values(data.monthly_bookings).forEach((yearData: any) => {
      if (yearData && typeof yearData === 'object') {
        Object.values(yearData).forEach((monthBookings: any) => {
          if (Array.isArray(monthBookings)) {
            monthBookings.forEach((booking: any) => {
              const agent = booking.Agent || booking.agent || 'Unknown'
              if (agent && agent !== 'Unknown') {
                agencies.add(agent)
              }
            })
          }
        })
      }
    })
    return Array.from(agencies).sort()
  }, [data])

  // Initialize selectedYears to all years if empty - MUST be before conditional returns
  useEffect(() => {
    if (data && selectedYears.length === 0 && availableYears.length > 0) {
      setSelectedYears([...availableYears])
    }
  }, [data, availableYears, selectedYears.length])

  // Early returns after all hooks
  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading agency data...</p>
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Agency Analysis</h1>
            <p className="text-gray-600">
              Performance rankings and metrics for booking agencies
            </p>
          </div>
          <AgencyClassification 
            allAgencies={allAgencies} 
            onConfigChange={refetchAgencyConfig}
          />
        </div>

        <DashboardFilters
          statusFilter={statusFilter}
          classFilter={classFilter}
          onStatusFilterChange={setStatusFilter}
          onClassFilterChange={setClassFilter}
        />

        {/* Summary Cards */}
        {filteredData && (
          <SummaryCards data={filteredData.summary} />
        )}

        {/* Year and Metric Controls */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex flex-wrap items-center gap-6">
            {/* Year Selector - Multiple Selection */}
            <div className="flex items-center space-x-3">
              <span className="text-sm font-medium text-gray-700">Years:</span>
              <div className="flex flex-wrap gap-2">
                {availableYears.map(year => {
                  const isSelected = selectedYears.includes(year)
                  return (
                    <button
                      key={year}
                      onClick={() => {
                        if (isSelected) {
                          setSelectedYears(selectedYears.filter(y => y !== year))
                        } else {
                          setSelectedYears([...selectedYears, year].sort((a, b) => a - b))
                        }
                      }}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        isSelected ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {year}
                    </button>
                  )
                })}
                {selectedYears.length > 0 && (
                  <button
                    onClick={() => setSelectedYears([...availableYears])}
                    className="px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                  >
                    Select All
                  </button>
                )}
              </div>
            </div>

            {/* Metric Toggle */}
            <div className="flex items-center space-x-3">
              <span className="text-sm font-medium text-gray-700">Metric:</span>
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setMetric('revenue')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    metric === 'revenue'
                      ? 'bg-white text-primary-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Revenue
                </button>
                <button
                  onClick={() => setMetric('bed_nights')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    metric === 'bed_nights'
                      ? 'bg-white text-primary-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Bed Nights
                </button>
              </div>
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center space-x-3">
              <span className="text-sm font-medium text-gray-700">View:</span>
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('Agent')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    viewMode === 'Agent'
                      ? 'bg-white text-primary-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Agent
                </button>
                <button
                  onClick={() => setViewMode('Direct')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    viewMode === 'Direct'
                      ? 'bg-white text-primary-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Direct
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Direct vs Agency Bed Nights Visualization */}
        <DirectVsAgencyBedNightsChart
          data={filteredData || data}
          selectedYears={selectedYears}
          availableYears={availableYears}
          agencyConfig={agencyConfig}
          statusFilter={statusFilter}
          classFilter={classFilter}
          metric={metric}
        />

        {/* Agency Performance Classification */}
        <AgencyPerformanceClassification
          data={filteredData || data}
          selectedYears={selectedYears}
          availableYears={availableYears}
          agencyConfig={agencyConfig}
          viewMode={viewMode}
          statusFilter={statusFilter}
          classFilter={classFilter}
        />

        {/* Agency Ranking List */}
        <AgencyRankingList 
          data={filteredData || data} 
          selectedYears={selectedYears}
          availableYears={availableYears}
          metric={metric}
          viewMode={viewMode}
          agencyConfig={agencyConfig}
          statusFilter={statusFilter}
          classFilter={classFilter}
        />
      </div>
    </DashboardLayout>
  )
}
