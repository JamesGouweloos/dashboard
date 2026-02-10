'use client'

import { useEffect, useState, useMemo } from 'react'
import DashboardLayout from '@/components/DashboardLayout'
import DashboardFilters from '@/components/DashboardFilters'
import SummaryCards from '@/components/SummaryCards'
import SourcesMultiMetric from '@/components/SourcesVisualizations/SourcesMultiMetric'
import SourcesCardGrid from '@/components/SourcesVisualizations/SourcesCardGrid'
import { filterDashboardData, DashboardData } from '@/lib/dataFilters'
import { useDataRefresh } from '@/lib/useDataRefresh'
import { useAgencyClassification } from '@/lib/useAgencyClassification'
import { BarChart3, Calendar, Filter, X } from 'lucide-react'

type VisualizationType = 'multimetric' | 'cards'

const visualizationOptions: { value: VisualizationType; label: string; icon: any }[] = [
  { value: 'multimetric', label: 'Multi-Metric', icon: BarChart3 },
  { value: 'cards', label: 'Card Grid', icon: Calendar },
]

export default function SourcesPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('All')
  const [classFilter, setClassFilter] = useState<string>('All')
  const [selectedYears, setSelectedYears] = useState<number[]>([])
  const [selectedSources, setSelectedSources] = useState<string[]>([])
  const [selectedViz, setSelectedViz] = useState<VisualizationType>('multimetric')
  const refreshKey = useDataRefresh()
  const { config: agencyConfig } = useAgencyClassification()

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

  // Calculate available years and sources
  const { availableYears, availableSources, filteredSourcesData } = useMemo(() => {
    if (!data) return { availableYears: [], availableSources: [], filteredSourcesData: {} }

    // Get years from monthly_bookings or yearly breakdown
    const years = new Set<number>()
    if (data.monthly_bookings) {
      Object.keys(data.monthly_bookings).forEach(yearStr => {
        const year = parseInt(yearStr, 10)
        if (!isNaN(year)) years.add(year)
      })
    }
    if (data.yearly_breakdown) {
      Object.keys(data.yearly_breakdown).forEach(yearStr => {
        const year = parseInt(yearStr, 10)
        if (!isNaN(year)) years.add(year)
      })
    }

    // Calculate source data with Agency/Direct breakdown
    const sourceBreakdown: any = {}
    
    // Helper function to get agency type using agencyConfig
    const getAgentType = (agent: string): 'Agent' | 'Direct' => {
      if (!agencyConfig || !agencyConfig.agentToType) {
        // Default to 'Agent' if no config (matches other components)
        return 'Agent'
      }
      // Use config mapping, defaulting to 'Agent' if not found (matches other components)
      return agencyConfig.agentToType[agent] || 'Agent'
    }
    
    // Process monthly_bookings to get agent info per source
    if (data.monthly_bookings) {
      Object.entries(data.monthly_bookings).forEach(([yearStr, yearData]: [string, any]) => {
        const year = parseInt(yearStr, 10)
        // Apply year filter if years are selected
        if (selectedYears.length > 0 && !selectedYears.includes(year)) return
        
        Object.values(yearData).forEach((monthBookings: any) => {
          if (!Array.isArray(monthBookings)) return
          
          monthBookings.forEach((booking: any) => {
            // Apply status filter
            if (statusFilter !== 'All') {
              const status = booking.Status || booking.status || booking['Booking Status']
              if (status !== statusFilter) return
            }

            // Apply class filter
            if (classFilter !== 'All') {
              const bookingClass = booking['Booking Class'] || booking.booking_class || booking.Booking_Class
              if (bookingClass !== classFilter) return
            }

            const source = booking.source || booking.Source || 'Unknown'
            const agent = booking.agent || booking.Agent || ''
            
            // Determine if this is Agency or Direct booking
            let agentType: 'Agent' | 'Direct'
            let isAgency: boolean
            
            // If agent is empty or unknown, treat as Direct
            if (!agent || agent.trim() === '' || agent.toLowerCase() === 'unknown') {
              // This is a Direct booking (no agent)
              agentType = 'Direct'
              isAgency = false
            } else {
              // Use agencyConfig to determine if this agent is Agency or Direct
              agentType = getAgentType(agent)
              isAgency = agentType === 'Agent'
            }
            
            // Apply source filter if sources are selected
            if (selectedSources.length > 0 && !selectedSources.includes(source)) return
            
            if (!sourceBreakdown[source]) {
              sourceBreakdown[source] = {
                count: 0,
                revenue: 0,
                bed_nights: 0,
                agency: { count: 0, revenue: 0, bed_nights: 0 },
                direct: { count: 0, revenue: 0, bed_nights: 0 }
              }
            }
            
            const revenue = parseFloat(booking.revenue_total || booking['Revenue Total'] || booking.revenueTotal || 0) || 0
            const bedNights = parseInt(booking.bed_nights || booking['Bed nights'] || booking.bedNights || 0) || 0
            
            sourceBreakdown[source].count++
            sourceBreakdown[source].revenue += revenue
            sourceBreakdown[source].bed_nights += bedNights
            
            if (isAgency) {
              sourceBreakdown[source].agency.count++
              sourceBreakdown[source].agency.revenue += revenue
              sourceBreakdown[source].agency.bed_nights += bedNights
            } else {
              sourceBreakdown[source].direct.count++
              sourceBreakdown[source].direct.revenue += revenue
              sourceBreakdown[source].direct.bed_nights += bedNights
            }
          })
        })
      })
    }

    // Note: We do NOT fall back to by_source because it doesn't have year information
    // All source data must come from monthly_bookings to respect year filters
    // If monthly_bookings doesn't exist, we'll return empty data rather than using incorrect aggregates

    // Get all unique sources for filter options from monthly_bookings
    // This ensures we have the same sources that are actually being displayed
    const allSources = new Set<string>()
    if (data.monthly_bookings) {
      Object.values(data.monthly_bookings).forEach((yearData: any) => {
        if (yearData && typeof yearData === 'object') {
          Object.values(yearData).forEach((monthBookings: any) => {
            if (Array.isArray(monthBookings)) {
              monthBookings.forEach((booking: any) => {
                const source = booking.source || booking.Source || 'Unknown'
                if (source && source !== 'Unknown') {
                  allSources.add(source)
                }
              })
        }
      })
    }
      })
    }
    // Fallback to by_source only if monthly_bookings doesn't exist
    if (allSources.size === 0 && data.by_source) {
      Object.keys(data.by_source).forEach(source => allSources.add(source))
    }

    return {
      availableYears: Array.from(years).sort((a, b) => a - b),
      availableSources: Array.from(allSources).sort(),
      filteredSourcesData: sourceBreakdown
    }
  }, [data, selectedYears, selectedSources, statusFilter, classFilter, agencyConfig])

  // Apply status and class filters using the existing filter function
  const filteredData = filterDashboardData(data || {} as DashboardData, statusFilter, classFilter)
  
  // Merge filtered sources with Agency/Direct breakdown
  const sourcesData = useMemo(() => {
    // Always use filteredSourcesData from monthly_bookings when available
    // This ensures year filters are properly respected
    // Never use by_source as it doesn't have year breakdowns
    return filteredSourcesData || {}
  }, [filteredSourcesData])

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

  const toggleSource = (source: string) => {
    setSelectedSources(prev => 
      prev.includes(source) 
        ? prev.filter(s => s !== source)
        : [...prev, source]
    )
  }

  const clearYearFilters = () => setSelectedYears([])
  const clearSourceFilters = () => setSelectedSources([])

  const renderVisualization = () => {
    switch (selectedViz) {
      case 'multimetric':
        return <SourcesMultiMetric data={sourcesData} agencyDirectData={filteredSourcesData} />
      case 'cards':
        return <SourcesCardGrid data={sourcesData} agencyDirectData={filteredSourcesData} />
      default:
        return <SourcesMultiMetric data={sourcesData} agencyDirectData={filteredSourcesData} />
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

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Sources Analysis</h1>
          <p className="text-gray-600">
            Booking sources performance with Agency vs Direct breakdown
          </p>
        </div>

        {/* Status and Class Filters */}
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

        {/* Source Filter */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Filter className="h-5 w-5 text-primary-600" />
              <h3 className="text-lg font-semibold text-gray-900">Source Filters</h3>
            </div>
            <div className="flex items-center space-x-2">
              {selectedSources.length < availableSources.length && (
                  <button
                  onClick={() => setSelectedSources([...availableSources])}
                  className="text-xs text-primary-600 hover:text-primary-700 font-medium"
                  >
                  Select All
                  </button>
                )}
                {selectedSources.length > 0 && (
                  <button
                    onClick={clearSourceFilters}
                  className="text-xs text-gray-600 hover:text-gray-700 font-medium"
                  >
                  Clear ({selectedSources.length})
                  </button>
                )}
              </div>
          </div>
          <div className="grid grid-cols-4 gap-2">
                {availableSources.map(source => (
              <label key={source} className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded border border-gray-200 hover:border-primary-300 transition-colors">
                    <input
                      type="checkbox"
                      checked={selectedSources.includes(source)}
                      onChange={() => toggleSource(source)}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                <span className="text-sm text-gray-700 flex-1 truncate" title={source}>{source}</span>
                  </label>
                ))}
              </div>
              {selectedSources.length === 0 && (
            <p className="text-xs text-gray-500 mt-2">All sources shown. Select sources to filter.</p>
              )}
        </div>

        {/* Visualization Selector */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-700">Visualization Type</h3>
            <span className="text-xs text-gray-500">Compare different views</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {visualizationOptions.map((option) => {
              const Icon = option.icon
              return (
                <button
                  key={option.value}
                  onClick={() => setSelectedViz(option.value)}
                  className={`
                    flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all
                    ${selectedViz === option.value
                      ? 'border-primary-600 bg-primary-50 text-primary-700'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                    }
                  `}
                >
                  <Icon className={`h-5 w-5 mb-1 ${selectedViz === option.value ? 'text-primary-600' : 'text-gray-400'}`} />
                  <span className="text-xs font-medium text-center">{option.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Year Filter - Above Visualization */}
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

        {/* Main Visualization - Full Width */}
        <div className="w-full">
          {renderVisualization()}
        </div>
      </div>
    </DashboardLayout>
  )
}
