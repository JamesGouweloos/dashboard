'use client'

import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Calendar, ChevronDown, ChevronUp, ArrowUpDown, Download } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, TooltipProps } from 'recharts'

interface BreakdownData {
  yearly_breakdown?: {
    [year: string]: {
      [status: string]: {
        bed_nights: number
        accommodation: number
        income: number
        disbursements: number
        revenue_total: number
        outstanding: number
      }
    }
  }
  monthly_breakdown?: {
    [year: string]: {
      [month: string]: {
        [status: string]: {
          bed_nights: number
          accommodation: number
          income: number
          disbursements: number
          revenue_total: number
          outstanding: number
        }
      }
    }
  }
  yearly_breakdown_by_class?: {
    [year: string]: {
      [bookingClass: string]: {
        bed_nights: number
        accommodation: number
        income: number
        disbursements: number
        revenue_total: number
        outstanding: number
      }
    }
  }
  monthly_breakdown_by_class?: {
    [year: string]: {
      [month: string]: {
        [bookingClass: string]: {
          bed_nights: number
          accommodation: number
          income: number
          disbursements: number
          revenue_total: number
          outstanding: number
        }
      }
    }
  }
  yearly_breakdown_combined?: {
    [year: string]: {
      [bookingClass: string]: {
        [status: string]: {
          bed_nights: number
          accommodation: number
          income: number
          disbursements: number
          revenue_total: number
          outstanding: number
        }
      }
    }
  }
  monthly_breakdown_combined?: {
    [year: string]: {
      [month: string]: {
        [bookingClass: string]: {
          [status: string]: {
            bed_nights: number
            accommodation: number
            income: number
            disbursements: number
            revenue_total: number
            outstanding: number
          }
        }
      }
    }
  }
  by_booking_class?: {
    [bookingClass: string]: {
      count: number
      revenue: number
      bed_nights: number
      pax: number
      income: number
      disbursements: number
      outstanding: number
    }
  }
  monthly_bookings?: {
    [year: string]: {
      [month: string]: Array<{
        reservation_number: string
        name: string
        status: string
        booking_class: string
        arrival_date: string
        departure_date: string
        bed_nights: number
        pax: number
        accommodation: number
        income: number
        disbursements: number
        revenue_total: number
        outstanding: number
        agent: string
        source: string
      }>
    }
  }
}

type SortField = 'ref' | 'arrivalDate' | 'outstanding' | null
type SortOrder = 'asc' | 'desc'

// Column labels aligned with export CSV (Ref #, Name, Status, Class, Arrival, Departure, Bed Nights, Pax, Accommodation, Income, Revenue, Amount Outstanding, Agent, Source)
const AGGREGATE_COLUMNS = [
  { key: 'bed_nights', label: 'Bed Nights', format: 'number' as const },
  { key: 'accommodation', label: 'Accommodation', format: 'currency' as const },
  { key: 'income', label: 'Income', format: 'currency' as const },
  { key: 'disbursements', label: 'Disbursements', format: 'currency' as const },
  { key: 'revenue_total', label: 'Revenue Total', format: 'currency' as const },
  { key: 'outstanding', label: 'Amount Outstanding', format: 'currency' as const },
]
const NUM_ALIGN = 'text-right tabular-nums'

export default function BreakdownTable({ data }: { data: BreakdownData }) {
  const [selectedYear, setSelectedYear] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<string>('All')
  const [bookingClassFilter, setBookingClassFilter] = useState<string>('All')
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set())
  const [expandedBookings, setExpandedBookings] = useState<Set<string>>(new Set())
  const [hiddenYears, setHiddenYears] = useState<Set<string>>(new Set())
  const [sortField, setSortField] = useState<SortField>(null)
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc')
  const [selectedMonthForTooltip, setSelectedMonthForTooltip] = useState<{ year: string; month: string } | null>(null)

  // Determine which data to use based on filters
  const useClassBased = bookingClassFilter !== 'All'
  const useStatusFilter = statusFilter !== 'All'
  const useCombined = useClassBased && useStatusFilter
  
  let yearlyBreakdown: any, monthlyBreakdown: any
  
  if (useCombined && data.yearly_breakdown_combined && data.monthly_breakdown_combined) {
    // Use combined data that has both class and status
    yearlyBreakdown = {}
    Object.keys(data.yearly_breakdown_combined || {}).forEach(year => {
      const yearData = data.yearly_breakdown_combined![year] as any
      if (yearData[bookingClassFilter] && yearData[bookingClassFilter][statusFilter]) {
        yearlyBreakdown[year] = { [statusFilter]: yearData[bookingClassFilter][statusFilter] }
      }
    })
    
    monthlyBreakdown = {}
    Object.keys(data.monthly_breakdown_combined || {}).forEach(year => {
      monthlyBreakdown[year] = {}
      Object.keys(data.monthly_breakdown_combined![year] || {}).forEach(month => {
        const monthData = data.monthly_breakdown_combined![year][month] as any
        if (monthData[bookingClassFilter] && monthData[bookingClassFilter][statusFilter]) {
          monthlyBreakdown[year][month] = { [statusFilter]: monthData[bookingClassFilter][statusFilter] }
        }
      })
    })
  } else if (useClassBased) {
    // Use class-based breakdown
    yearlyBreakdown = data.yearly_breakdown_by_class || {}
    monthlyBreakdown = data.monthly_breakdown_by_class || {}
  } else {
    // Use status-based breakdown
    yearlyBreakdown = data.yearly_breakdown || {}
    monthlyBreakdown = data.monthly_breakdown || {}
  }

  const allYears = Object.keys(yearlyBreakdown).sort()
  
  // Filter years based on hiddenYears state
  const years = allYears.filter(year => !hiddenYears.has(year))

  const availableStatuses = new Set<string>()
  Object.values(yearlyBreakdown).forEach((yearData: any) => {
    Object.keys(yearData).forEach(status => availableStatuses.add(status))
  })
  const statusOptions = ['All', ...Array.from(availableStatuses)]
  
  const bookingClassOptions = ['All', 'Income Generating', 'Non-Income Generating']
  
  // Calculate Overall Booking Class Summary from yearly breakdown data
  const overallBookingClassSummary = useMemo(() => {
    if (!data.yearly_breakdown_by_class) return {}
    
    const summary: Record<string, {
      count: number
      revenue: number
      bed_nights: number
      income: number
      disbursements: number
      outstanding: number
    }> = {}
    
    // Aggregate across all years and all statuses for each booking class
    Object.keys(data.yearly_breakdown_by_class).forEach(year => {
      const yearData = data.yearly_breakdown_by_class![year]
      Object.keys(yearData).forEach(bookingClass => {
        if (!summary[bookingClass]) {
          summary[bookingClass] = {
            count: 0,
            revenue: 0,
            bed_nights: 0,
            income: 0,
            disbursements: 0,
            outstanding: 0
          }
        }
        
        const classData = yearData[bookingClass]
        summary[bookingClass].bed_nights += classData.bed_nights || 0
        summary[bookingClass].income += classData.income || 0
        summary[bookingClass].disbursements += classData.disbursements || 0
        summary[bookingClass].revenue += classData.revenue_total || 0
        summary[bookingClass].outstanding += classData.outstanding || 0
      })
    })
    
    // Calculate count from monthly_bookings if available
    if (data.monthly_bookings) {
      Object.keys(data.monthly_bookings).forEach(year => {
        const yearBookings = data.monthly_bookings![year]
        Object.keys(yearBookings).forEach(month => {
          const monthBookings = yearBookings[month]
          monthBookings.forEach((booking: any) => {
            const bookingClass = booking['Booking Class'] || booking.booking_class || booking.Booking_Class || 'Unknown'
            if (summary[bookingClass]) {
              summary[bookingClass].count++
            }
          })
        })
      })
    }
    
    return summary
  }, [data.yearly_breakdown_by_class, data.monthly_bookings])
  
  // Get filtered year data based on current filters
  const getFilteredYearData = (year: string) => {
    const yearData = yearlyBreakdown[year]
    if (!yearData) return null
    
    // If combined data is already filtered above, just return it
    if (useCombined) {
      return yearData
    }
    
    // Apply class filter if active
    if (useClassBased && bookingClassFilter !== 'All') {
      if (yearData[bookingClassFilter]) {
        return { [bookingClassFilter]: yearData[bookingClassFilter] }
      }
      return null
    }
    
    // Apply status filter if active
    if (useStatusFilter && statusFilter !== 'All') {
      if (yearData[statusFilter]) {
        return { [statusFilter]: yearData[statusFilter] }
      }
      return null
    }
    
    // Return all data if no filters
    return yearData
  }
  
  // Get filtered month data based on current filters
  const getFilteredMonthData = (year: string, month: string) => {
    if (!monthlyBreakdown[year] || !monthlyBreakdown[year][month]) return null
    const monthData = monthlyBreakdown[year][month]
    
    // If combined data is already filtered above, just return it
    if (useCombined) {
      return monthData
    }
    
    // Apply class filter if active
    if (useClassBased && bookingClassFilter !== 'All') {
      if (monthData[bookingClassFilter]) {
        return { [bookingClassFilter]: monthData[bookingClassFilter] }
      }
      return null
    }
    
    // Apply status filter if active
    if (useStatusFilter && statusFilter !== 'All') {
      if (monthData[statusFilter]) {
        return { [statusFilter]: monthData[statusFilter] }
      }
      return null
    }
    
    // Return all data if no filters
    return monthData
  }

  const toggleMonth = (month: string) => {
    const newExpanded = new Set(expandedMonths)
    if (newExpanded.has(month)) {
      newExpanded.delete(month)
    } else {
      newExpanded.add(month)
    }
    setExpandedMonths(newExpanded)
  }

  const toggleBookings = (year: string, month: string) => {
    const key = `${year}-${month}`
    const newExpanded = new Set(expandedBookings)
    if (newExpanded.has(key)) {
      newExpanded.delete(key)
    } else {
      newExpanded.add(key)
    }
    setExpandedBookings(newExpanded)
  }

  const getMonthlyBookings = (year: string, month: string | number) => {
    // Normalize month to integer string to match storage format
    let monthKey: string
    if (typeof month === 'number') {
      monthKey = String(Math.floor(month))
    } else {
      // Handle string months, including "4.0" format
      monthKey = String(parseInt(month.toString().replace('.0', '')) || 0)
    }
    
    if (!data.monthly_bookings || !data.monthly_bookings[year] || !data.monthly_bookings[year][monthKey]) {
      return []
    }
    
    let bookings = data.monthly_bookings[year][monthKey]
    
    // Apply filters - handle both snake_case and original column names
    if (statusFilter !== 'All') {
      bookings = bookings.filter((b: any) => {
        const bookingStatus = b.Status || b.status || ''
        return bookingStatus === statusFilter
      })
    }
    if (bookingClassFilter !== 'All') {
      bookings = bookings.filter((b: any) => {
        const bookingClass = b['Booking Class'] || b.booking_class || b.Booking_Class || ''
        return bookingClass === bookingClassFilter
      })
    }
    
    // Apply sorting
    if (sortField) {
      bookings = [...bookings].sort((a: any, b: any) => {
        let aValue: any
        let bValue: any
        
        if (sortField === 'ref') {
          aValue = a['Reservation #'] || a.reservation_number || a.Reservation_Number || ''
          bValue = b['Reservation #'] || b.reservation_number || b.Reservation_Number || ''
          // Sort as strings
          return sortOrder === 'asc' 
            ? aValue.localeCompare(bValue, undefined, { numeric: true, sensitivity: 'base' })
            : bValue.localeCompare(aValue, undefined, { numeric: true, sensitivity: 'base' })
        } else if (sortField === 'arrivalDate') {
          aValue = a['Arrival date'] || a.arrival_date || a.Arrival_date || ''
          bValue = b['Arrival date'] || b.arrival_date || b.Arrival_date || ''
          const aDate = aValue ? new Date(aValue).getTime() : 0
          const bDate = bValue ? new Date(bValue).getTime() : 0
          return sortOrder === 'asc' ? aDate - bDate : bDate - aDate
        } else if (sortField === 'outstanding') {
          aValue = a['Total amount outstanding'] || a.outstanding || a.Outstanding || 0
          bValue = b['Total amount outstanding'] || b.outstanding || b.Outstanding || 0
          return sortOrder === 'asc' ? aValue - bValue : bValue - aValue
        }
        
        return 0
      })
    }
    
    return bookings
  }
  
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // Toggle sort order if clicking the same field
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      // Set new sort field with ascending order
      setSortField(field)
      setSortOrder('asc')
    }
  }
  
  const exportToCSV = (bookings: any[], filename: string) => {
    if (bookings.length === 0) return
    
    // Format date helper function (same as in table)
    const formatDateForExport = (dateStr: string) => {
      if (!dateStr) return ''
      try {
        const date = new Date(dateStr)
        if (isNaN(date.getTime())) return dateStr
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
      } catch {
        return dateStr
      }
    }
    
    // CSV headers matching the table columns
    const headers = [
      'Ref #',
      'Name',
      'Status',
      'Class',
      'Arrival Date',
      'Departure Date',
      'Bed Nights',
      'Pax',
      'Accommodation',
      'Income',
      'Revenue',
      'Amount Outstanding',
      'Agent',
      'Source'
    ]
    
    // Create CSV rows with formatted data matching the table display
    const rows = bookings.map(booking => {
      // Extract values (same logic as table rendering)
      const reservationNumber = booking['Reservation #'] || booking.reservation_number || booking.Reservation_Number || ''
      const name = booking['Reservation name'] || booking.name || booking.Reservation_name || ''
      const status = booking.Status || booking.status || ''
      const bookingClass = booking['Booking Class'] || booking.booking_class || booking.Booking_Class || ''
      const arrivalDate = booking['Arrival date'] || booking.arrival_date || booking.Arrival_date || ''
      const departureDate = booking['Departure date'] || booking.departure_date || booking.Departure_date || ''
      const bedNights = booking['Bed nights'] || booking.bed_nights || booking.Bed_nights || 0
      const pax = booking.PAX || booking.pax || 0
      const accommodation = booking.Accommodation || booking.accommodation || booking.ACCOMMODATION || 0
      const income = booking.Income || booking.income || 0
      const revenueTotal = booking['Revenue Total'] || booking.revenue_total || booking.Revenue_Total || 0
      const outstanding = booking['Total amount outstanding'] || booking.outstanding || booking.Outstanding || 0
      const agent = booking.Agent || booking.agent || ''
      const source = booking.Source || booking.source || ''
      
      // Format values to match table display
      return [
        reservationNumber,
        name, // Full name in export (not truncated)
        status,
        bookingClass,
        formatDateForExport(arrivalDate),
        formatDateForExport(departureDate),
        bedNights.toString(),
        pax.toString(),
        formatCurrency(accommodation),
        formatCurrency(income),
        formatCurrency(revenueTotal),
        formatCurrency(outstanding),
        agent,
        source
      ]
    })
    
    // Escape CSV values
    const escapeCSV = (value: any): string => {
      const str = String(value ?? '')
      // Escape quotes and wrap in quotes if contains comma, quote, or newline
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`
      }
      return str
    }
    
    // Combine header and rows
    const csvContent = [
      headers.map(escapeCSV).join(','),
      ...rows.map(row => row.map(escapeCSV).join(','))
    ].join('\n')
    
    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', filename)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }
  
  const exportBookingsByMonth = (year: string, month: string) => {
    const bookings = getMonthlyBookings(year, month)
    const monthName = formatMonth(month)
    const filename = `bookings_${year}_${monthName.replace(' ', '_')}.csv`
    exportToCSV(bookings, filename)
  }
  
  const exportBookingsByYear = (year: string) => {
    if (!data.monthly_bookings || !data.monthly_bookings[year]) {
      return
    }
    
    const allBookings: any[] = []
    Object.keys(data.monthly_bookings[year])
      .sort((a, b) => {
        const monthA = parseFloat(a.toString().replace('.0', ''))
        const monthB = parseFloat(b.toString().replace('.0', ''))
        return monthA - monthB
      })
      .forEach(month => {
        const bookings = getMonthlyBookings(year, month)
        allBookings.push(...bookings)
      })
    
    const filename = `bookings_${year}.csv`
    exportToCSV(allBookings, filename)
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value)
  }

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('en-US').format(value)
  }

  const formatMonth = (month: string | number) => {
    const monthNum = typeof month === 'string' ? parseFloat(month.toString().replace('.0', '')) : month
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                        'July', 'August', 'September', 'October', 'November', 'December']
    return monthNames[monthNum - 1] || month.toString()
  }

  // Helper function to get monthly booking chart data
  const getMonthlyBookingChartData = (year: string) => {
    const statusColors: Record<string, string> = {
      'Confirmed': '#22c55e',
      'Provisional': '#f59e0b',
      'Quote': '#3b82f6',
      'Cancelled': '#ef4444',
      'Unknown': '#9ca3af'
    }

    if (!data.monthly_bookings || !data.monthly_bookings[year]) {
      return { chartData: [], statusColors }
    }

    const monthlyData = data.monthly_bookings[year]
    
    // Get all month keys and sort them numerically, but keep original key format
    const monthKeys = Object.keys(monthlyData)
      .map(m => ({
        originalKey: m,
        numValue: parseFloat(m.toString().replace('.0', ''))
      }))
      .filter(m => !isNaN(m.numValue))
      .sort((a, b) => a.numValue - b.numValue)

    // First pass: collect all statuses that appear in the data
    const allStatuses = new Set<string>()
    monthKeys.forEach(({ originalKey }) => {
      const bookings = monthlyData[originalKey] || []
      if (Array.isArray(bookings)) {
        bookings.forEach((booking: any) => {
          const status = booking.Status || 
                        booking.status || 
                        booking['Booking Status'] || 
                        booking.booking_status ||
                        booking.Booking_Status ||
                        'Unknown'
          allStatuses.add(status)
        })
      }
    })

    const chartData = monthKeys.map(({ originalKey, numValue }) => {
      let bookings = monthlyData[originalKey] || []
      
      // Ensure bookings is an array
      if (!Array.isArray(bookings)) {
        bookings = []
      }
      
      // Apply filters
      let filteredBookings = bookings
      if (statusFilter !== 'All') {
        filteredBookings = filteredBookings.filter((b: any) => {
          const status = b.Status || b.status || b['Booking Status'] || ''
          return status === statusFilter
        })
      }
      if (bookingClassFilter !== 'All') {
        filteredBookings = filteredBookings.filter((b: any) => {
          const bookingClass = b['Booking Class'] || b.booking_class || b.Booking_Class || ''
          return bookingClass === bookingClassFilter
        })
      }

      // Group by status for stacking
      const statusGroups: Record<string, { bookings: any[], revenue: number }> = {}
      filteredBookings.forEach((booking: any) => {
        // Try multiple possible status field names
        const status = booking.Status || 
                      booking.status || 
                      booking['Booking Status'] || 
                      booking.booking_status ||
                      booking.Booking_Status ||
                      'Unknown'
        
        // Try multiple possible revenue field names
        const revenue = parseFloat(
          booking['Revenue Total'] || 
          booking.revenue_total || 
          booking.Revenue_Total || 
          booking.revenueTotal ||
          booking.revenue ||
          booking.Revenue ||
          0
        )
        
        if (!statusGroups[status]) {
          statusGroups[status] = { bookings: [], revenue: 0 }
        }
        statusGroups[status].bookings.push(booking)
        statusGroups[status].revenue += revenue
      })

      const result: any = {
        month: formatMonth(numValue),
        monthNum: numValue
      }

      // Add each status that appears in the data (use 0 if status doesn't exist in this month)
      // This ensures consistent stacking across all months
      allStatuses.forEach((status) => {
        result[status] = statusGroups[status]?.revenue || 0
      })

      // Store booking details for tooltip
      result._bookings = filteredBookings
      result._statusGroups = statusGroups

      return result
    })

    return { chartData, statusColors }
  }

  // Simple hover tooltip showing revenue breakdown by status
  const SimpleHoverTooltip = ({ active, payload, label, year }: TooltipProps<any, any> & { year?: string }) => {
    if (!active || !payload || !payload.length) return null

    const data = payload[0].payload
    if (!data) return null

    // Don't show hover tooltip if this month is selected (detailed tooltip will show instead)
    const monthNum = data.monthNum
    const monthKey = monthNum ? monthNum.toString() : null
    const isSelected = selectedMonthForTooltip?.year === year && selectedMonthForTooltip?.month === monthKey
    if (isSelected) return null

    // Status color mapping
    const statusColors: Record<string, string> = {
      'Confirmed': '#22c55e',
      'Provisional': '#f59e0b',
      'Quote': '#3b82f6',
      'Cancelled': '#ef4444',
      'Unknown': '#9ca3af'
    }

    // Calculate total revenue from all statuses
    const statusGroups = data._statusGroups || {}
    let totalRevenue = 0
    const statusBreakdown: Array<{ status: string; revenue: number; color: string }> = []

    Object.entries(statusGroups).forEach(([status, group]: [string, any]) => {
      const revenue = group.revenue || 0
      totalRevenue += revenue
      if (revenue > 0) {
        statusBreakdown.push({
          status,
          revenue,
          color: statusColors[status] || '#9ca3af'
        })
      }
    })

    // Sort by revenue descending
    statusBreakdown.sort((a, b) => b.revenue - a.revenue)

    if (statusBreakdown.length === 0) return null

    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
        <p className="font-semibold text-gray-900 mb-2 text-sm">{label}</p>
        <p className="text-xs text-gray-600 mb-2">
          Total: <span className="font-semibold text-gray-900">{formatCurrency(totalRevenue)}</span>
        </p>
        <div className="space-y-1">
          {statusBreakdown.map(({ status, revenue, color }) => {
            const percentage = totalRevenue > 0 ? ((revenue / totalRevenue) * 100).toFixed(1) : '0'
            return (
              <div key={status} className="flex items-center justify-between text-xs">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded" style={{ backgroundColor: color }} />
                  <span className="text-gray-700">{status}</span>
                </div>
                <div className="text-right">
                  <span className="font-medium text-gray-900">{formatCurrency(revenue)}</span>
                  <span className="text-gray-500 ml-1">({percentage}%)</span>
                </div>
              </div>
            )
          })}
        </div>
        <p className="text-xs text-gray-500 mt-2 italic">Click bar to see booking details</p>
      </div>
    )
  }

  // Detailed tooltip component showing booking contributions (for selected months)
  const DetailedTooltip = ({ active, payload, label, year }: TooltipProps<any, any> & { year?: string }) => {
    const data = payload && payload[0] ? payload[0].payload : null
    if (!data) return null

    const bookings = data._bookings || []
    const monthNum = data.monthNum
    const monthKey = monthNum ? monthNum.toString() : null

    // Check if this month is selected
    const isSelected = selectedMonthForTooltip?.year === year && selectedMonthForTooltip?.month === monthKey
    const shouldShow = isSelected // Only show when selected

    if (!shouldShow || bookings.length === 0) return null

    // Sort bookings by revenue (descending)
    const sortedBookings = [...bookings].sort((a: any, b: any) => {
      const revenueA = parseFloat(a['Revenue Total'] || a.revenue_total || a.Revenue_Total || 0)
      const revenueB = parseFloat(b['Revenue Total'] || b.revenue_total || b.Revenue_Total || 0)
      return revenueB - revenueA
    })

    const totalRevenue = sortedBookings.reduce((sum: number, b: any) => {
      return sum + parseFloat(b['Revenue Total'] || b.revenue_total || b.Revenue_Total || 0)
    }, 0)

    return (
      <div 
        className="bg-white border-2 border-primary-500 rounded-lg shadow-xl p-4 max-w-md"
      >
        <div className="flex items-center justify-between mb-3">
          <p className="font-semibold text-gray-900">{label}</p>
          <button
            onClick={(e) => {
              e.stopPropagation()
              setSelectedMonthForTooltip(null)
            }}
            className="text-gray-400 hover:text-gray-600 text-sm font-bold"
            title="Close"
          >
            ×
          </button>
        </div>
        <p className="text-sm text-gray-600 mb-3">
          Total Revenue: <span className="font-semibold text-gray-900">{formatCurrency(totalRevenue)}</span>
        </p>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          <p className="text-xs font-semibold text-gray-700 mb-2">Booking Contributions:</p>
          {sortedBookings.map((booking: any, idx: number) => {
            const revenue = parseFloat(booking['Revenue Total'] || booking.revenue_total || booking.Revenue_Total || 0)
            const percentage = totalRevenue > 0 ? ((revenue / totalRevenue) * 100).toFixed(1) : '0'
            const name = booking['Reservation name'] || booking.name || booking.Reservation_name || 'Unknown'
            const status = booking.Status || booking.status || booking['Booking Status'] || 'Unknown'
            const ref = booking['Reservation #'] || booking.reservation_number || booking.Reservation_Number || ''
            
            return (
              <div key={idx} className="flex items-center justify-between text-xs bg-gray-50 p-2 rounded">
                <div className="flex-1 min-w-0">
                  <div className="text-gray-700 font-medium truncate">{name}</div>
                  <div className="text-gray-500 text-xs mt-0.5">{ref} • {status}</div>
                </div>
                <div className="ml-2 text-right">
                  <span className="font-medium text-gray-900">{formatCurrency(revenue)}</span>
                  <div className="text-gray-500 text-xs">({percentage}%)</div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  const renderYearSummary = (year: string, yearData: any) => {
    if (!yearData) return null

    const statuses = Object.keys(yearData)
    const totals = statuses.reduce((acc, status) => {
      const data = yearData[status]
      acc.bed_nights += data.bed_nights
      acc.accommodation += data.accommodation
      acc.income += data.income
      acc.disbursements += data.disbursements
      acc.revenue_total += data.revenue_total
      acc.outstanding += data.outstanding
      return acc
    }, { bed_nights: 0, accommodation: 0, income: 0, disbursements: 0, revenue_total: 0, outstanding: 0 })

    return (
      <div key={year} className="border border-gray-200 rounded-lg overflow-hidden mb-4">
        <div className="bg-gradient-to-r from-primary-50 to-blue-50 p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">{year} Summary</h3>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => exportBookingsByYear(year)}
                className="flex items-center space-x-1 px-3 py-1.5 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                <Download className="h-4 w-4" />
                <span>Export Year</span>
              </button>
            <button
              onClick={() => setSelectedYear(selectedYear === year ? '' : year)}
              className="text-primary-600 hover:text-primary-700 flex items-center space-x-1"
            >
              {selectedYear === year ? (
                <>
                  <span className="text-sm">Hide Details</span>
                  <ChevronUp className="h-4 w-4" />
                </>
              ) : (
                <>
                  <span className="text-sm">Show Details</span>
                  <ChevronDown className="h-4 w-4" />
                </>
              )}
            </button>
            </div>
          </div>
        </div>

        {/* Year Totals - columns match export / monthly rolled-up */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Metric</th>
                {statuses.map(status => (
                  <th key={status} className={`px-4 py-2 text-xs font-medium text-gray-500 uppercase ${NUM_ALIGN}`}>
                    {status}
                  </th>
                ))}
                {statuses.length > 1 && (
                  <th className={`px-4 py-2 text-xs font-medium text-gray-700 bg-primary-50 ${NUM_ALIGN}`}>
                    Total
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {AGGREGATE_COLUMNS.map(({ key, label, format }) => {
                const isRevenue = key === 'revenue_total'
                const isOutstanding = key === 'outstanding'
                const isIncome = key === 'income'
                const isDisbursements = key === 'disbursements'
                const rowClass = isRevenue ? 'text-blue-700 font-medium' : isOutstanding ? 'text-red-700' : isIncome ? 'text-green-700' : isDisbursements ? 'text-orange-700' : 'text-gray-900'
                const totalClass = isRevenue ? 'font-bold' : 'font-semibold'
                return (
                  <tr key={key}>
                    <td className="px-4 py-2 text-sm font-medium text-gray-700">{label}</td>
                    {statuses.map(status => (
                      <td key={status} className={`px-4 py-2 text-sm ${NUM_ALIGN} ${rowClass}`}>
                        {format === 'currency' ? formatCurrency((yearData[status] as any)[key]) : formatNumber((yearData[status] as any)[key])}
                      </td>
                    ))}
                    {statuses.length > 1 && (
                      <td className={`px-4 py-2 text-sm ${NUM_ALIGN} bg-primary-50 ${rowClass} ${totalClass}`}>
                        {format === 'currency' ? formatCurrency((totals as any)[key]) : formatNumber((totals as any)[key])}
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Monthly Booking Contribution Chart */}
        {data.monthly_bookings && data.monthly_bookings[year] && (() => {
          const { chartData, statusColors } = getMonthlyBookingChartData(year)
          
          // Get all unique statuses across all months
          const uniqueStatuses = Array.from(new Set(
            chartData.flatMap((d: any) => Object.keys(d).filter(k => !k.startsWith('_') && k !== 'month' && k !== 'monthNum'))
          ))

          // Only show chart if there's data and at least one status
          if (chartData.length === 0 || uniqueStatuses.length === 0) return null

          return (
            <div className="border-t border-gray-200 bg-white p-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-md font-semibold text-gray-800">Monthly Booking Contributions - {year}</h4>
                {selectedMonthForTooltip?.year === year && (
                  <button
                    onClick={() => setSelectedMonthForTooltip(null)}
                    className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded border border-gray-300"
                  >
                    Clear Selection
                  </button>
                )}
              </div>
              <div className="relative">
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart
                    data={chartData}
                    margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="month" 
                      angle={-45}
                      textAnchor="end"
                      height={80}
                      tick={{ fill: '#6B7280', fontSize: 12 }}
                    />
                    <YAxis 
                      tick={{ fill: '#6B7280', fontSize: 12 }} 
                      tickFormatter={(value) => `$${(value/1000).toFixed(0)}k`}
                      domain={[0, 'auto']}
                    />
                    <Tooltip 
                      content={<SimpleHoverTooltip year={year} />}
                      cursor={{ fill: 'rgba(0, 0, 0, 0.05)' }}
                    />
                    <Legend />
                    {uniqueStatuses.map((status) => (
                      <Bar 
                        key={status} 
                        dataKey={status} 
                        stackId="a" 
                        fill={statusColors[status] || '#9ca3af'}
                        name={status}
                        onClick={(data: any, index: number, e: any) => {
                          // For stacked bars, we need to get the full entry from chartData using the index
                          const entry = chartData[index]
                          if (!entry || !entry.monthNum) return
                          
                          const monthKey = entry.monthNum.toString()
                          if (year && monthKey) {
                            const isSelected = selectedMonthForTooltip?.year === year && selectedMonthForTooltip?.month === monthKey
                            if (isSelected) {
                              setSelectedMonthForTooltip(null)
                            } else {
                              setSelectedMonthForTooltip({ year, month: monthKey })
                            }
                          }
                          e?.stopPropagation()
                        }}
                        style={{ cursor: 'pointer' }}
                      >
                        {chartData.map((entry: any, index: number) => {
                          const monthKey = entry.monthNum?.toString()
                          const isSelected = selectedMonthForTooltip?.year === year && selectedMonthForTooltip?.month === monthKey
                          return (
                            <Cell 
                              key={`cell-${status}-${index}`}
                              fill={isSelected ? '#fbbf24' : statusColors[status] || '#9ca3af'}
                              stroke={isSelected ? '#f59e0b' : undefined}
                              strokeWidth={isSelected ? 2 : 0}
                            />
                          )
                        })}
                      </Bar>
                    ))}
                  </BarChart>
                </ResponsiveContainer>
                {/* Render persistent detailed tooltip when month is selected */}
                {selectedMonthForTooltip?.year === year && (() => {
                  const selectedData = chartData.find((d: any) => d.monthNum?.toString() === selectedMonthForTooltip.month)
                  if (!selectedData) return null
                  return (
                    <div className="absolute top-4 right-4 z-10">
                      <DetailedTooltip 
                        active={true}
                        payload={[{ payload: selectedData }]}
                        label={selectedData.month}
                        year={year}
                      />
                    </div>
                  )
                })()}
              </div>
            </div>
          )
        })()}

        {/* Monthly Details */}
        {selectedYear === year && monthlyBreakdown[year] && (
          <div className="border-t border-gray-200 bg-gray-50 p-4">
            <h4 className="text-md font-semibold text-gray-800 mb-3">Monthly Breakdown - {year}</h4>
            <div className="space-y-2">
              {Object.keys(monthlyBreakdown[year])
                .sort((a, b) => {
                  // Sort months numerically (handle both "1" and "1.0" formats)
                  const monthA = parseFloat(a.toString().replace('.0', ''))
                  const monthB = parseFloat(b.toString().replace('.0', ''))
                  return monthA - monthB
                })
                .map(month => {
                  const monthData = getFilteredMonthData(year, month)
                  if (!monthData) return null

                  const isExpanded = expandedMonths.has(`${year}-${month}`)
                  const monthStatuses = Object.keys(monthData)
                  const monthTotals = monthStatuses.reduce((acc, status) => {
                    const data = monthData[status]
                    acc.bed_nights += data.bed_nights
                    acc.accommodation += data.accommodation
                    acc.income += data.income
                    acc.disbursements += data.disbursements
                    acc.revenue_total += data.revenue_total
                    acc.outstanding += data.outstanding
                    return acc
                  }, { bed_nights: 0, accommodation: 0, income: 0, disbursements: 0, revenue_total: 0, outstanding: 0 })

                  return (
                    <div key={month} className="bg-white border border-gray-200 rounded">
                      <button
                        onClick={() => toggleMonth(`${year}-${month}`)}
                        className="w-full px-4 py-2 flex items-center justify-between text-left hover:bg-gray-50"
                      >
                        <span className="font-medium text-gray-900">{formatMonth(month)}</span>
                        <span className="flex items-center space-x-2">
                          <span className="text-sm text-gray-600">
                            Revenue: {formatCurrency(monthTotals.revenue_total)} | 
                            Bed Nights: {monthTotals.bed_nights}
                          </span>
                          {isExpanded ? <ChevronUp className="h-4 w-4 text-gray-600" /> : <ChevronDown className="h-4 w-4 text-gray-600" />}
                        </span>
                      </button>
                      {isExpanded && (
                        <div className="px-4 py-3 border-t border-gray-200 bg-gray-50 overflow-x-auto">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="bg-gray-100">
                                <th className="px-3 py-2 text-left font-medium text-gray-700">Status</th>
                                {AGGREGATE_COLUMNS.map(({ label }) => (
                                  <th key={label} className={`px-3 py-2 font-medium text-gray-700 ${NUM_ALIGN}`}>
                                    {label}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                              {monthStatuses.map(status => (
                                <tr key={status}>
                                  <td className="px-3 py-2 font-medium text-gray-900">{status}</td>
                                  {AGGREGATE_COLUMNS.map(({ key, format }) => {
                                    const val = (monthData[status] as any)[key]
                                    const isRevenue = key === 'revenue_total'
                                    const isOutstanding = key === 'outstanding'
                                    const isIncome = key === 'income'
                                    const isDisbursements = key === 'disbursements'
                                    const cellClass = isRevenue ? 'text-blue-700 font-medium' : isOutstanding ? 'text-red-700' : isIncome ? 'text-green-700' : isDisbursements ? 'text-orange-700' : 'text-gray-900'
                                    return (
                                      <td key={key} className={`px-3 py-2 ${NUM_ALIGN} ${cellClass}`}>
                                        {format === 'currency' ? formatCurrency(val) : formatNumber(val)}
                                      </td>
                                    )
                                  })}
                                </tr>
                              ))}
                              {monthStatuses.length > 1 && (
                                <tr className="bg-primary-50 font-semibold">
                                  <td className="px-3 py-2 font-medium text-gray-900">Total</td>
                                  {AGGREGATE_COLUMNS.map(({ key, format }) => {
                                    const val = (monthTotals as any)[key]
                                    const isRevenue = key === 'revenue_total'
                                    const isOutstanding = key === 'outstanding'
                                    const isIncome = key === 'income'
                                    const isDisbursements = key === 'disbursements'
                                    const cellClass = isRevenue ? 'text-blue-700' : isOutstanding ? 'text-red-700' : isIncome ? 'text-green-700' : isDisbursements ? 'text-orange-700' : 'text-gray-900'
                                    return (
                                      <td key={key} className={`px-3 py-2 ${NUM_ALIGN} ${cellClass}`}>
                                        {format === 'currency' ? formatCurrency(val) : formatNumber(val)}
                                      </td>
                                    )
                                  })}
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      )}
                      
                      {/* Booking Details */}
                      {isExpanded && (() => {
                        const bookings = getMonthlyBookings(year, month)
                        const showBookings = expandedBookings.has(`${year}-${month}`)
                        
                        // Check if monthly_bookings data exists for this month
                        // Normalize month key to match storage format
                        const monthKey = typeof month === 'number' 
                          ? String(Math.floor(month))
                          : String(parseInt(month.toString().replace('.0', '')) || 0)
                        const hasMonthlyBookingsData = data.monthly_bookings && 
                                                       data.monthly_bookings[year] && 
                                                       data.monthly_bookings[year][monthKey] !== undefined
                        
                        // Only show section if we have monthly_bookings data
                        // This ensures the booking details option appears when data exists
                        if (!hasMonthlyBookingsData) return null
                        
                        return (
                          <div className="mt-3 border-t border-gray-200 pt-3">
                            <div className="flex items-center justify-between mb-2">
                            <button
                              onClick={() => toggleBookings(year, month)}
                                className="flex items-center justify-between text-sm text-gray-600 hover:text-gray-900"
                            >
                              <span className="font-medium">
                                {bookings.length} booking{bookings.length !== 1 ? 's' : ''}
                                {showBookings ? ' (click to hide)' : ' (click to show details)'}
                              </span>
                                {showBookings ? <ChevronUp className="h-4 w-4 ml-2" /> : <ChevronDown className="h-4 w-4 ml-2" />}
                            </button>
                              {showBookings && (
                                <div className="flex items-center space-x-2">
                                  <button
                                    onClick={() => exportBookingsByMonth(year, month)}
                                    className="flex items-center space-x-1 px-3 py-1.5 text-xs bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                                  >
                                    <Download className="h-3 w-3" />
                                    <span>Export Month</span>
                                  </button>
                                </div>
                              )}
                            </div>
                            
                            {showBookings && (
                              <div className="mt-3 overflow-x-auto">
                                <table className="w-full text-xs">
                                  <thead className="bg-gray-100">
                                    <tr>
                                      <th 
                                        className="px-2 py-1 text-left font-medium text-gray-700 cursor-pointer hover:bg-gray-200 transition-colors"
                                        onClick={() => handleSort('ref')}
                                      >
                                        <div className="flex items-center space-x-1">
                                          <span>Ref #</span>
                                          {sortField === 'ref' && (
                                            <ArrowUpDown className={`h-3 w-3 ${sortOrder === 'asc' ? 'rotate-180' : ''}`} />
                                          )}
                                        </div>
                                      </th>
                                      <th className="px-2 py-1 text-left font-medium text-gray-700">Name</th>
                                      <th className="px-2 py-1 text-left font-medium text-gray-700">Status</th>
                                      <th className="px-2 py-1 text-left font-medium text-gray-700">Class</th>
                                      <th 
                                        className="px-2 py-1 text-left font-medium text-gray-700 cursor-pointer hover:bg-gray-200 transition-colors"
                                        onClick={() => handleSort('arrivalDate')}
                                      >
                                        <div className="flex items-center space-x-1">
                                          <span>Arrival Date</span>
                                          {sortField === 'arrivalDate' && (
                                            <ArrowUpDown className={`h-3 w-3 ${sortOrder === 'asc' ? 'rotate-180' : ''}`} />
                                          )}
                                        </div>
                                      </th>
                                      <th className="px-2 py-1 text-left font-medium text-gray-700">Departure Date</th>
                                      <th className={`px-2 py-1 font-medium text-gray-700 ${NUM_ALIGN}`}>Bed Nights</th>
                                      <th className={`px-2 py-1 font-medium text-gray-700 ${NUM_ALIGN}`}>Pax</th>
                                      <th className={`px-2 py-1 font-medium text-gray-700 ${NUM_ALIGN}`}>Accommodation</th>
                                      <th className={`px-2 py-1 font-medium text-gray-700 ${NUM_ALIGN}`}>Income</th>
                                      <th className={`px-2 py-1 font-medium text-gray-700 ${NUM_ALIGN}`}>Revenue Total</th>
                                      <th 
                                        className={`px-2 py-1 font-medium text-gray-700 cursor-pointer hover:bg-gray-200 transition-colors ${NUM_ALIGN}`}
                                        onClick={() => handleSort('outstanding')}
                                      >
                                        <div className="flex items-center justify-end space-x-1">
                                          <span>Amount Outstanding</span>
                                          {sortField === 'outstanding' && (
                                            <ArrowUpDown className={`h-3 w-3 ${sortOrder === 'asc' ? 'rotate-180' : ''}`} />
                                          )}
                                        </div>
                                      </th>
                                      <th className="px-2 py-1 text-left font-medium text-gray-700">Agent</th>
                                      <th className="px-2 py-1 text-left font-medium text-gray-700">Source</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-200">
                                    {bookings.map((booking: any, idx) => {
                                      // Handle both original column names and formatted names
                                      const reservationNumber = booking['Reservation #'] || booking.reservation_number || booking.Reservation_Number || ''
                                      const name = booking['Reservation name'] || booking.name || booking.Reservation_name || ''
                                      const status = booking.Status || booking.status || ''
                                      const bookingClass = booking['Booking Class'] || booking.booking_class || booking.Booking_Class || ''
                                      const arrivalDate = booking['Arrival date'] || booking.arrival_date || booking.Arrival_date || ''
                                      const departureDate = booking['Departure date'] || booking.departure_date || booking.Departure_date || ''
                                      const bedNights = booking['Bed nights'] || booking.bed_nights || booking.Bed_nights || 0
                                      const pax = booking.PAX || booking.pax || 0
                                      const accommodation = booking.Accommodation || booking.accommodation || booking.ACCOMMODATION || 0
                                      const income = booking.Income || booking.income || 0
                                      const revenueTotal = booking['Revenue Total'] || booking.revenue_total || booking.Revenue_Total || 0
                                      const outstanding = booking['Total amount outstanding'] || booking.outstanding || booking.Outstanding || 0
                                      const agent = booking.Agent || booking.agent || ''
                                      const source = booking.Source || booking.source || ''
                                      
                                      // Format dates if they exist
                                      const formatDate = (dateStr: string) => {
                                        if (!dateStr) return ''
                                        try {
                                          const date = new Date(dateStr)
                                          if (isNaN(date.getTime())) return dateStr
                                          return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
                                        } catch {
                                          return dateStr
                                        }
                                      }
                                      
                                      return (
                                        <tr key={idx} className={bookingClass === 'Income Generating' ? 'bg-green-50' : 'bg-orange-50'}>
                                          <td className="px-2 py-1">{reservationNumber}</td>
                                          <td className="px-2 py-1">{name.length > 30 ? name.substring(0, 30) + '...' : name}</td>
                                          <td className="px-2 py-1">{status}</td>
                                          <td className="px-2 py-1">{bookingClass}</td>
                                          <td className="px-2 py-1">{formatDate(arrivalDate)}</td>
                                          <td className="px-2 py-1">{formatDate(departureDate)}</td>
                                          <td className={`px-2 py-1 ${NUM_ALIGN}`}>{bedNights}</td>
                                          <td className={`px-2 py-1 ${NUM_ALIGN}`}>{pax}</td>
                                          <td className={`px-2 py-1 ${NUM_ALIGN}`}>{formatCurrency(accommodation)}</td>
                                          <td className={`px-2 py-1 ${NUM_ALIGN} text-green-700`}>{formatCurrency(income)}</td>
                                          <td className={`px-2 py-1 ${NUM_ALIGN} text-blue-700`}>{formatCurrency(revenueTotal)}</td>
                                          <td className={`px-2 py-1 ${NUM_ALIGN} text-red-700`}>{formatCurrency(outstanding)}</td>
                                          <td className="px-2 py-1">{agent.length > 20 ? agent.substring(0, 20) + '...' : agent}</td>
                                          <td className="px-2 py-1">{source.length > 20 ? source.substring(0, 20) + '...' : source}</td>
                                        </tr>
                                      )
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        )
                      })()}
                    </div>
                  )
                })}
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
      className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <Calendar className="h-5 w-5 text-primary-600" />
          <h2 className="text-xl font-semibold text-gray-900">Yearly & Monthly Breakdown</h2>
        </div>

        {/* Filters */}
        <div className="flex flex-col space-y-4">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">Status:</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              {statusOptions.map(status => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">Class:</label>
            <select
              value={bookingClassFilter}
              onChange={(e) => setBookingClassFilter(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              {bookingClassOptions.map(option => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
            </div>
          </div>
          
          {/* Year Filter */}
          <div className="flex items-start space-x-3">
            <label className="text-sm font-medium text-gray-700 pt-2">Show Years:</label>
            <div className="flex flex-wrap gap-2">
              {allYears.map(year => {
                const isHidden = hiddenYears.has(year)
                return (
                  <label
                    key={year}
                    className="flex items-center space-x-2 px-3 py-2 bg-white border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={!isHidden}
                      onChange={() => {
                        const newHidden = new Set(hiddenYears)
                        if (isHidden) {
                          newHidden.delete(year)
                        } else {
                          newHidden.add(year)
                        }
                        setHiddenYears(newHidden)
                      }}
                      className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                    />
                    <span className="text-sm text-gray-700">{year}</span>
                  </label>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Booking Class Summary - columns aligned with year/month tables and export */}
      {overallBookingClassSummary && Object.keys(overallBookingClassSummary).length > 0 && (
        <div className="mb-6 p-4 bg-gradient-to-r from-primary-50 to-blue-50 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Overall Booking Class Summary</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-white">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold text-gray-700">Booking Class</th>
                  <th className={`px-3 py-2 font-semibold text-gray-700 ${NUM_ALIGN}`}>Count</th>
                  <th className={`px-3 py-2 font-semibold text-gray-700 ${NUM_ALIGN}`}>Bed Nights</th>
                  <th className={`px-3 py-2 font-semibold text-gray-700 ${NUM_ALIGN}`}>Revenue Total</th>
                  <th className={`px-3 py-2 font-semibold text-gray-700 ${NUM_ALIGN}`}>Income</th>
                  <th className={`px-3 py-2 font-semibold text-gray-700 ${NUM_ALIGN}`}>Disbursements</th>
                  <th className={`px-3 py-2 font-semibold text-gray-700 ${NUM_ALIGN}`}>Amount Outstanding</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {Object.entries(overallBookingClassSummary)
                  .filter(([bookingClass]) => 
                    bookingClassFilter === 'All' || bookingClass === bookingClassFilter
                  )
                  .map(([bookingClass, metrics]) => (
                    <tr 
                      key={bookingClass} 
                      className={bookingClass === 'Income Generating' ? 'bg-green-50' : 'bg-orange-50'}
                    >
                      <td className="px-3 py-2 font-medium text-gray-900">{bookingClass}</td>
                      <td className={`px-3 py-2 ${NUM_ALIGN} text-gray-900`}>{metrics.count}</td>
                      <td className={`px-3 py-2 ${NUM_ALIGN} text-gray-900`}>{metrics.bed_nights}</td>
                      <td className={`px-3 py-2 ${NUM_ALIGN} text-blue-700 font-medium`}>
                        {formatCurrency(metrics.revenue)}
                      </td>
                      <td className={`px-3 py-2 ${NUM_ALIGN} text-green-700`}>
                        {formatCurrency(metrics.income || 0)}
                      </td>
                      <td className={`px-3 py-2 ${NUM_ALIGN} text-orange-700`}>
                        {formatCurrency(metrics.disbursements || 0)}
                      </td>
                      <td className={`px-3 py-2 ${NUM_ALIGN} text-red-700`}>
                        {formatCurrency(metrics.outstanding || 0)}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {years.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No data available
        </div>
      ) : (
        <div className="space-y-4">
          {years.map(year => {
            const filteredYearData = getFilteredYearData(year)
            return renderYearSummary(year, filteredYearData)
          })}
        </div>
      )}
    </motion.div>
  )
}

