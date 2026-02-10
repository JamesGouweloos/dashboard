'use client'

import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { TrendingDown, TrendingUp, Sparkles, AlertCircle } from 'lucide-react'

interface AgencyPerformanceClassificationProps {
  data: any
  selectedYears: number[]
  availableYears: number[]
  agencyConfig: { agentToType: Record<string, 'Agent' | 'Direct'> } | null
  viewMode: 'Agent' | 'Direct'
  statusFilter: string
  classFilter: string
}

interface AgencyPerformance {
  agent: string
  yearlyBedNights: Record<number, number>
  totalBedNights: number
  averageBedNights: number
  hasEverConverted: boolean
  classification: 'Top Agencies' | 'Drop-off' | 'New' | 'Opportunities' | 'Unclassified'
}

export default function AgencyPerformanceClassification({
  data,
  selectedYears,
  availableYears,
  agencyConfig,
  viewMode,
  statusFilter,
  classFilter
}: AgencyPerformanceClassificationProps) {
  const [dropOffYear, setDropOffYear] = useState<number>(2025)
  const [metric, setMetric] = useState<'revenue' | 'bed_nights'>('bed_nights')
  const [excludedYears, setExcludedYears] = useState<number[]>([])
  
  const classifiedAgencies = useMemo(() => {
    if (!data?.monthly_bookings) return {
      topAgencies: [],
      dropOff: [],
      newAgencies: [],
      opportunities: []
    }

    const agencies: Record<string, AgencyPerformance> = {}
    const currentYear = dropOffYear

    // Helper function to get agency type (defaults to 'Agent')
    const getAgentType = (agent: string): 'Agent' | 'Direct' => {
      if (!agencyConfig || !agencyConfig.agentToType) return 'Agent'
      return agencyConfig.agentToType[agent] || 'Agent'
    }

    // Process all years to get yearly values for each agency
    Object.entries(data.monthly_bookings).forEach(([yearStr, yearData]: [string, any]) => {
      const year = parseInt(yearStr)
      if (isNaN(year)) return

      // Skip excluded years
      if (excludedYears.includes(year)) return

      if (yearData && typeof yearData === 'object') {
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

            const agent = booking.Agent || booking.agent || 'Unknown'
            if (agent === 'Unknown') return

            // Filter by view mode (Agent or Direct)
            const agentType = getAgentType(agent)
            if (agentType !== viewMode) return

            if (!agencies[agent]) {
              agencies[agent] = {
                agent,
                yearlyBedNights: {},
                totalBedNights: 0,
                averageBedNights: 0,
                hasEverConverted: false,
                classification: 'Unclassified'
              }
            }

            // Calculate value based on metric
            let value = 0
            if (metric === 'revenue') {
              value = parseFloat(booking['Revenue Total'] || booking.revenue_total || 0) || 0
            } else {
              value = parseFloat(booking['Bed nights'] || booking.bed_nights || 0) || 0
            }

            if (value > 0) {
              agencies[agent].hasEverConverted = true
            }

            if (!agencies[agent].yearlyBedNights[year]) {
              agencies[agent].yearlyBedNights[year] = 0
            }
            agencies[agent].yearlyBedNights[year] += value
            agencies[agent].totalBedNights += value
          })
        })
      }
    })

    // Calculate averages and classify
    const topAgencies: AgencyPerformance[] = []
    const dropOff: AgencyPerformance[] = []
    const newAgencies: AgencyPerformance[] = []
    const opportunities: AgencyPerformance[] = []

    Object.values(agencies).forEach(agency => {
      // Calculate historical average (excluding drop-off year)
      const historicalYears = Object.keys(agency.yearlyBedNights)
        .map(y => parseInt(y))
        .filter(y => y < currentYear && !isNaN(y) && !excludedYears.includes(y))
      
      const historicalBedNights = historicalYears.reduce((sum, year) => {
        return sum + (agency.yearlyBedNights[year] || 0)
      }, 0)
      
      const historicalAverage = historicalYears.length > 0 
        ? historicalBedNights / historicalYears.length 
        : 0

      const currentYearValue = agency.yearlyBedNights[currentYear] || 0
      const achievedCurrentYear = currentYearValue >= 15

      // Count years with 15+ (including drop-off year, excluding excluded years)
      const yearsWith15Plus = Object.entries(agency.yearlyBedNights)
        .filter(([year, value]) => {
          const yearNum = parseInt(year)
          return !isNaN(yearNum) && !excludedYears.includes(yearNum) && (value as number) >= 15
        })
        .map(([year]) => parseInt(year))
      
      const hasCurrentYearIn15Plus = yearsWith15Plus.includes(currentYear)
      const totalYears15Plus = yearsWith15Plus.length

      // Classification logic (order matters - check most specific first)
      if (!agency.hasEverConverted) {
        // 1. New agencies: Never successfully converted
        agency.classification = 'New'
        newAgencies.push(agency)
      } else if (hasCurrentYearIn15Plus && totalYears15Plus >= 3) {
        // 2. Top Agencies: Consistently achieved 15+ for minimum 3 years including drop-off year
        agency.classification = 'Top Agencies'
        topAgencies.push(agency)
      } else if (historicalAverage >= 15 && !achievedCurrentYear) {
        // 3. Drop-off: Historically averaged 15+, but failed in drop-off year
        agency.classification = 'Drop-off'
        dropOff.push(agency)
      } else if (historicalAverage < 15 && !achievedCurrentYear) {
        // 4. Opportunities: Never averaged 15+, and also failed in drop-off year
        agency.classification = 'Opportunities'
        opportunities.push(agency)
      }
    })

    // Sort each category by total bed nights (descending)
    const sortByBedNights = (a: AgencyPerformance, b: AgencyPerformance) => 
      b.totalBedNights - a.totalBedNights

    return {
      topAgencies: topAgencies.sort(sortByBedNights),
      dropOff: dropOff.sort(sortByBedNights),
      newAgencies: newAgencies.sort(sortByBedNights),
      opportunities: opportunities.sort(sortByBedNights)
    }
  }, [data, selectedYears, availableYears, agencyConfig, viewMode, statusFilter, classFilter, dropOffYear, metric, excludedYears])

  const formatValue = (value: number) => {
    if (metric === 'revenue') {
      return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    }
    return value.toLocaleString('en-US')
  }

  const renderCategory = (
    title: string,
    agencies: AgencyPerformance[],
    icon: React.ReactNode,
    color: string,
    bgColor: string
  ) => {
    if (agencies.length === 0) return null

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
      >
        <div className="flex items-center space-x-3 mb-4">
          <div className={`p-2 rounded-lg ${bgColor}`}>
            {icon}
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            <p className="text-sm text-gray-500">{agencies.length} {agencies.length === 1 ? 'agency' : 'agencies'}</p>
          </div>
        </div>

        <div className="space-y-2 max-h-[300px] overflow-y-auto">
          {agencies.map(agency => {
            const currentYearValue = agency.yearlyBedNights[dropOffYear] || 0
            const historicalYears = Object.keys(agency.yearlyBedNights)
              .map(y => parseInt(y))
              .filter(y => y < dropOffYear && !isNaN(y) && !excludedYears.includes(y))
            const historicalBedNights = historicalYears.reduce((sum, year) => {
              return sum + (agency.yearlyBedNights[year] || 0)
            }, 0)
            const historicalAverage = historicalYears.length > 0 
              ? historicalBedNights / historicalYears.length 
              : 0

            return (
              <div key={agency.agent} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <div className="font-medium text-gray-900">{agency.agent}</div>
                  <div className="text-sm text-gray-600">
                    {currentYearValue > 0 ? (
                      <>{dropOffYear}: {formatValue(currentYearValue)}</>
                    ) : (
                      <>{dropOffYear}: No {metric === 'revenue' ? 'revenue' : 'bed nights'}</>
                    )}
                    {historicalYears.length > 0 && (
                      <> • Historical avg: {formatValue(historicalAverage)}</>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-gray-900">
                    {formatValue(agency.totalBedNights)}
                  </div>
                  <div className="text-xs text-gray-500">Total</div>
                </div>
              </div>
            )
          })}
        </div>
      </motion.div>
    )
  }

  const totalAgencies = classifiedAgencies.topAgencies.length + 
    classifiedAgencies.dropOff.length + 
    classifiedAgencies.newAgencies.length + 
    classifiedAgencies.opportunities.length

  if (totalAgencies === 0) {
    return null
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Agency Performance Classification</h2>
        <p className="text-gray-600">
          Agencies classified by performance metrics and historical trends
        </p>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex flex-wrap items-center gap-6">
          {/* Drop-off Year Selector */}
          <div className="flex items-center space-x-3">
            <span className="text-sm font-medium text-gray-700">Drop-off Year:</span>
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setDropOffYear(2025)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  dropOffYear === 2025
                    ? 'bg-white text-primary-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                2025
              </button>
              <button
                onClick={() => setDropOffYear(2026)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  dropOffYear === 2026
                    ? 'bg-white text-primary-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                2026
              </button>
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

          {/* Exclude Years */}
          <div className="flex items-center space-x-3">
            <span className="text-sm font-medium text-gray-700">Exclude Years:</span>
            <div className="flex flex-wrap gap-2">
              {availableYears.sort((a, b) => a - b).map(year => {
                const isExcluded = excludedYears.includes(year)
                return (
                  <button
                    key={year}
                    onClick={() => {
                      if (isExcluded) {
                        setExcludedYears(excludedYears.filter(y => y !== year))
                      } else {
                        setExcludedYears([...excludedYears, year].sort((a, b) => a - b))
                      }
                    }}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      isExcluded ? 'bg-red-100 text-red-700 border border-red-300' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {year}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {renderCategory(
          'Top Agencies',
          classifiedAgencies.topAgencies,
          <TrendingUp className={`h-5 w-5 text-green-600`} />,
          'text-green-600',
          'bg-green-50'
        )}

        {renderCategory(
          'Drop-off Agencies',
          classifiedAgencies.dropOff,
          <TrendingDown className={`h-5 w-5 text-red-600`} />,
          'text-red-600',
          'bg-red-50'
        )}

        {renderCategory(
          'New Agencies',
          classifiedAgencies.newAgencies,
          <Sparkles className={`h-5 w-5 text-blue-600`} />,
          'text-blue-600',
          'bg-blue-50'
        )}

        {renderCategory(
          'Opportunities',
          classifiedAgencies.opportunities,
          <AlertCircle className={`h-5 w-5 text-yellow-600`} />,
          'text-yellow-600',
          'bg-yellow-50'
        )}
      </div>
    </div>
  )
}

