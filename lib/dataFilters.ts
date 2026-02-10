/**
 * Utility functions for filtering dashboard data
 */

export interface SummaryData {
  total_bookings: number
  total_revenue: number
  total_payments: number
  total_outstanding: number
  total_bed_nights: number
  total_pax: number
  total_income: number
  total_disbursements: number
  income_generating: number
  non_income_generating: number
  report_generated: string
}

export interface DashboardData {
  summary: SummaryData
  by_status: any
  by_booking_class: any
  [key: string]: any
}

export function filterDashboardData(
  data: DashboardData,
  statusFilter: string,
  classFilter: string,
  selectedYears: number[] = []
): DashboardData {
  if (!data) return data

  const filteredData = { ...data }

  // Always calculate statistics from raw booking data to ensure consistency
  // This ensures "All" and filtered views use the same calculation method
  const filteredBookings = getAllBookings(data, statusFilter, classFilter, selectedYears)
  filteredData.summary = calculateSummaryFromBookings(filteredBookings, data.summary)

  // Filter revenue_trends by selected years if years are specified
  if (selectedYears.length > 0 && data.revenue_trends) {
    const filteredRevenueTrends: any = {}
    Object.entries(data.revenue_trends).forEach(([key, value]) => {
      const [year] = key.split('-')
      const yearNum = parseInt(year)
      if (!isNaN(yearNum) && selectedYears.includes(yearNum)) {
        filteredRevenueTrends[key] = value
      }
    })
    filteredData.revenue_trends = filteredRevenueTrends
  }

  // Filter by_status data
  if (statusFilter !== 'All') {
    const statusData = data.by_status?.[statusFilter]
    if (statusData) {
      filteredData.by_status = {
        [statusFilter]: statusData
      }
    }
  }

  // Filter by_booking_class data
  if (classFilter !== 'All') {
    const classData = data.by_booking_class?.[classFilter]
    if (classData) {
      filteredData.by_booking_class = {
        [classFilter]: classData
      }
    }
  }

  // Filter revenue_trends based on status and/or class filters
  // Reconstruct from monthly_breakdown data which has status and class info
  if ((statusFilter !== 'All' || classFilter !== 'All') && data.monthly_breakdown) {
    const filteredRevenueTrends: any = {}
    
    Object.keys(data.monthly_breakdown || {}).forEach(year => {
      const yearData = data.monthly_breakdown[year]
      Object.keys(yearData || {}).forEach(month => {
        const monthData = yearData[month]
        
        // Check if we should include this month based on filters
        let shouldInclude = false
        let monthRevenue = 0
        let monthBedNights = 0
        let monthBookings = 0
        
        if (statusFilter !== 'All' && classFilter !== 'All') {
          // Both filters: use monthly_breakdown_combined
          if (data.monthly_breakdown_combined?.[year]?.[month]?.[classFilter]?.[statusFilter]) {
            const stats = data.monthly_breakdown_combined[year][month][classFilter][statusFilter]
            monthRevenue = stats.revenue_total || 0
            monthBedNights = stats.bed_nights || 0
            monthBookings = stats.count || 0
            shouldInclude = true
          }
        } else if (classFilter !== 'All') {
          // Class filter only: use monthly_breakdown_by_class
          if (data.monthly_breakdown_by_class?.[year]?.[month]?.[classFilter]) {
            const stats = data.monthly_breakdown_by_class[year][month][classFilter]
            monthRevenue = stats.revenue_total || 0
            monthBedNights = stats.bed_nights || 0
            monthBookings = (monthRevenue > 0 || monthBedNights > 0) ? 1 : 0 // Approximate
            shouldInclude = true
          }
        } else if (statusFilter !== 'All') {
          // Status filter only: use monthly_breakdown
          if (monthData[statusFilter]) {
            const stats = monthData[statusFilter]
            monthRevenue = stats.revenue_total || 0
            monthBedNights = stats.bed_nights || 0
            monthBookings = (monthRevenue > 0 || monthBedNights > 0) ? 1 : 0 // Approximate
            shouldInclude = true
          }
        }
        
        if (shouldInclude) {
          const key = `${year}-${parseInt(month).toString().padStart(2, '0')}`
          if (!filteredRevenueTrends[key]) {
            filteredRevenueTrends[key] = { revenue: 0, bed_nights: 0, bookings: 0 }
          }
          filteredRevenueTrends[key].revenue += monthRevenue
          filteredRevenueTrends[key].bed_nights += monthBedNights
          filteredRevenueTrends[key].bookings += monthBookings
        }
      })
    })
    
    filteredData.revenue_trends = filteredRevenueTrends
  }

  return filteredData
}

/**
 * Calculate summary statistics from filtered booking data
 */
export function calculateSummaryFromBookings(
  bookings: any[],
  originalSummary: SummaryData
): SummaryData {
  if (!bookings || bookings.length === 0) {
    return {
      ...originalSummary,
      total_bookings: 0,
      total_revenue: 0,
      total_bed_nights: 0,
      total_pax: 0,
      total_income: 0,
      total_disbursements: 0,
      total_outstanding: 0,
    }
  }

  let totalBookings = 0
  let totalRevenue = 0
  let totalBedNights = 0
  let totalPax = 0
  let totalIncome = 0
  let totalDisbursements = 0
  let totalOutstanding = 0

  bookings.forEach((booking: any) => {
    totalBookings++
    
    const revenue = parseFloat(booking['Revenue Total'] || booking.revenue_total || booking.Revenue_Total || 0)
    const bedNights = parseInt(booking['Bed nights'] || booking.bed_nights || booking.Bed_nights || 0)
    const pax = parseInt(booking.PAX || booking.pax || 0)
    const income = parseFloat(booking.Income || booking.income || 0)
    const disbursements = parseFloat(booking.Disbursements || booking.disbursements || 0)
    const outstanding = parseFloat(booking['Total amount outstanding'] || booking.outstanding || booking.Outstanding || 0)

    totalRevenue += revenue
    totalBedNights += bedNights
    totalPax += pax
    totalIncome += income
    totalDisbursements += disbursements
    totalOutstanding += outstanding
  })

  return {
    ...originalSummary,
    total_bookings: totalBookings,
    total_revenue: totalRevenue,
    total_bed_nights: totalBedNights,
    total_pax: totalPax,
    total_income: totalIncome,
    total_disbursements: totalDisbursements,
    total_outstanding: totalOutstanding,
  }
}

/**
 * Get all bookings from monthly_bookings data, optionally filtered
 */
export function getAllBookings(
  data: DashboardData,
  statusFilter: string = 'All',
  classFilter: string = 'All',
  selectedYears: number[] = []
): any[] {
  if (!data?.monthly_bookings) return []

  const allBookings: any[] = []

  Object.entries(data.monthly_bookings).forEach(([year, yearData]: [string, any]) => {
    const yearNum = parseInt(year)
    
    // Apply year filter if years are specified
    if (selectedYears.length > 0 && !selectedYears.includes(yearNum)) {
      return
    }

    if (yearData && typeof yearData === 'object') {
      Object.values(yearData).forEach((monthBookings: any) => {
        if (Array.isArray(monthBookings)) {
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

            allBookings.push(booking)
          })
        }
      })
    }
  })

  return allBookings
}

export function getFilteredTopSources(
  sources: any,
  statusFilter: string,
  classFilter: string,
  bookingData: any
): any {
  if (!sources || (!statusFilter || statusFilter === 'All') && (!classFilter || classFilter === 'All')) {
    return sources
  }

  // If filters are active, we need to show filtered sources
  // This will be calculated on the backend in future
  return sources
}

