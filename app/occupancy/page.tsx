'use client'

import { useState, useEffect, useMemo } from 'react'
import DashboardLayout from '@/components/DashboardLayout'
import OccupancySummaryCards from '@/components/OccupancySummaryCards'
import OccupancyChart from '@/components/OccupancyChart'
import MonthlyOccupancyChart from '@/components/MonthlyOccupancyChart'
import OccupancyCalendar from '@/components/OccupancyCalendar'
import OccupancyFilters from '@/components/OccupancyFilters'
import GapAnalysisTable from '@/components/GapAnalysisTable'

interface OccupancyData {
  summary: {
    total_occupancy: number
    total_confirmed: number
    total_provisional: number
    average_daily_occupancy: number
    date_range: {
      start: string
      end: string
      total_days: number
    }
    peak_dates: Array<{
      date: string
      occupancy: number
      confirmed: number
      provisional: number
    }>
    properties: string[]
    accommodation_types: string[]
  }
  daily_totals: Array<{
    date: string
    total: number
    confirmed: number
    provisional: number
  }>
  monthly_by_property: {
    [property: string]: {
      [month: string]: {
        total: number
        confirmed: number
        provisional: number
        average_daily: number
      }
    }
  }
  monthly_by_accommodation: {
    [accommodation: string]: {
      [month: string]: {
        total: number
        confirmed: number
        provisional: number
        average_daily: number
      }
    }
  }
}

export default function OccupancyPage() {
  const [data, setData] = useState<OccupancyData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedYears, setSelectedYears] = useState<number[]>([])
  const [selectedMonths, setSelectedMonths] = useState<number[]>([])

  useEffect(() => {
    const fetchOccupancyData = async () => {
      try {
        const response = await fetch('/api/occupancy')
        if (!response.ok) {
          throw new Error('Failed to fetch occupancy data')
        }
        const jsonData = await response.json()
        setData(jsonData)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load occupancy data')
      } finally {
        setLoading(false)
      }
    }

    fetchOccupancyData()
  }, [])

  // Extract available years and months from data
  const { availableYears, availableMonths } = useMemo(() => {
    if (!data) return { availableYears: [], availableMonths: [] }
    
    const years = new Set<number>()
    const months = new Set<number>()
    
    // Get years and months from daily_totals
    data.daily_totals.forEach(day => {
      const date = new Date(day.date)
      years.add(date.getFullYear())
      months.add(date.getMonth() + 1) // JavaScript months are 0-indexed
    })
    
    const sortedYears = Array.from(years).sort()
    const sortedMonths = Array.from(months).sort().filter(m => ![1, 2, 12].includes(m)) // Exclude Dec, Jan, Feb
    
    return {
      availableYears: sortedYears,
      availableMonths: sortedMonths
    }
  }, [data])

  // Initialize selectedYears and selectedMonths when data loads
  useEffect(() => {
    if (data && selectedYears.length === 0 && availableYears.length > 0) {
      setSelectedYears(availableYears) // Select all years by default
    }
    if (data && selectedMonths.length === 0 && availableMonths.length > 0) {
      setSelectedMonths(availableMonths) // Select all months by default
    }
  }, [data, availableYears, availableMonths, selectedYears.length, selectedMonths.length])

  // Filter data based on selected years and months
  const filteredData = useMemo(() => {
    if (!data) return null

    // Use selected filters, or all available if none selected
    const yearsToUse = selectedYears.length > 0 ? selectedYears : availableYears
    const monthsToUse = selectedMonths.length > 0 ? selectedMonths : availableMonths

    let filteredDailyTotals = data.daily_totals.filter(day => {
      const date = new Date(day.date)
      const year = date.getFullYear()
      const month = date.getMonth() + 1
      
      return yearsToUse.includes(year) && monthsToUse.includes(month)
    })

    let filteredMonthlyByProperty: typeof data.monthly_by_property = {}
    let filteredMonthlyByAccommodation: typeof data.monthly_by_accommodation = {}

    // Filter monthly data
    Object.keys(data.monthly_by_property).forEach(property => {
      filteredMonthlyByProperty[property] = {}
      Object.keys(data.monthly_by_property[property]).forEach(monthKey => {
        const [year, month] = monthKey.split('-').map(Number)
        const monthNum = month
        
        if (yearsToUse.includes(year) && monthsToUse.includes(monthNum)) {
          filteredMonthlyByProperty[property][monthKey] = data.monthly_by_property[property][monthKey]
        }
      })
    })

    Object.keys(data.monthly_by_accommodation).forEach(accommodation => {
      filteredMonthlyByAccommodation[accommodation] = {}
      Object.keys(data.monthly_by_accommodation[accommodation]).forEach(monthKey => {
        const [year, month] = monthKey.split('-').map(Number)
        const monthNum = month
        
        if (yearsToUse.includes(year) && monthsToUse.includes(monthNum)) {
          filteredMonthlyByAccommodation[accommodation][monthKey] = data.monthly_by_accommodation[accommodation][monthKey]
        }
      })
    })

    // Recalculate summary
    const totalOccupancy = filteredDailyTotals.reduce((sum, day) => sum + day.total, 0)
    const totalConfirmed = filteredDailyTotals.reduce((sum, day) => sum + day.confirmed, 0)
    const totalProvisional = filteredDailyTotals.reduce((sum, day) => sum + day.provisional, 0)
    const avgDaily = filteredDailyTotals.length > 0 ? totalOccupancy / filteredDailyTotals.length : 0

    // Get peak dates from filtered data
    const peakDates = [...filteredDailyTotals]
      .sort((a, b) => b.total - a.total)
      .slice(0, 10)

    return {
      ...data,
      daily_totals: filteredDailyTotals,
      monthly_by_property: filteredMonthlyByProperty,
      monthly_by_accommodation: filteredMonthlyByAccommodation,
      summary: {
        ...data.summary,
        total_occupancy: totalOccupancy,
        total_confirmed: totalConfirmed,
        total_provisional: totalProvisional,
        average_daily_occupancy: avgDaily,
        peak_dates: peakDates
      }
    }
  }, [data, selectedYears, selectedMonths, availableYears, availableMonths])

  // Toggle functions for filters
  const toggleYear = (year: number) => {
    setSelectedYears(prev => 
      prev.includes(year) 
        ? prev.filter(y => y !== year)
        : [...prev, year].sort((a, b) => a - b)
    )
  }

  const toggleMonth = (month: number) => {
    setSelectedMonths(prev => 
      prev.includes(month) 
        ? prev.filter(m => m !== month)
        : [...prev, month].sort((a, b) => a - b)
    )
  }

  const clearAllFilters = () => {
    setSelectedYears(availableYears)
    setSelectedMonths(availableMonths)
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading occupancy data...</p>
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
            <p className="text-gray-600">Please run: python process_occupancy_report.py</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (!data || !filteredData) return null

  // Aggregate monthly data across all properties
  const allMonthlyData: { [month: string]: { total: number; confirmed: number; provisional: number; average_daily: number } } = {}
  Object.values(filteredData.monthly_by_property).forEach(propertyData => {
    Object.entries(propertyData).forEach(([month, values]) => {
      if (!allMonthlyData[month]) {
        allMonthlyData[month] = { total: 0, confirmed: 0, provisional: 0, average_daily: 0 }
      }
      allMonthlyData[month].total += values.total
      allMonthlyData[month].confirmed += values.confirmed
      allMonthlyData[month].provisional += values.provisional
    })
  })

  // Calculate average daily for each month
  Object.keys(allMonthlyData).forEach(month => {
    const daysInMonth = new Date(month.split('-')[0] + '-' + month.split('-')[1] + '-01').toLocaleDateString('en-US', { month: '2-digit' })
    const days = new Date(parseInt(month.split('-')[0]), parseInt(month.split('-')[1]), 0).getDate()
    allMonthlyData[month].average_daily = allMonthlyData[month].total / days
  })

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Occupancy Report</h1>
          <p className="text-gray-600">
            Occupancy trends and analysis from {new Date(data.summary.date_range.start).toLocaleDateString()} to {new Date(data.summary.date_range.end).toLocaleDateString()}
          </p>
        </div>

        <OccupancyFilters
          availableYears={availableYears}
          availableMonths={availableMonths}
          selectedYears={selectedYears}
          selectedMonths={selectedMonths}
          onYearToggle={toggleYear}
          onMonthToggle={toggleMonth}
          onClearAll={clearAllFilters}
        />

        <OccupancySummaryCards summary={filteredData.summary} />

        <OccupancyChart data={filteredData.daily_totals} />

        <MonthlyOccupancyChart data={allMonthlyData} />

        <OccupancyCalendar data={filteredData.daily_totals} />

        <GapAnalysisTable data={filteredData.daily_totals} />
      </div>
    </DashboardLayout>
  )
}

