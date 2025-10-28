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
  classFilter: string
): DashboardData {
  if (!data) return data

  const filteredData = { ...data }

  // If both filters are active, we need to calculate intersection
  if (statusFilter !== 'All' && classFilter !== 'All') {
    // Look for combined breakdown data
    const combinedData = data.yearly_breakdown_combined
    if (combinedData) {
      // Calculate totals from combined breakdown
      let totalBookings = 0
      let totalRevenue = 0
      let totalBedNights = 0
      let totalPax = 0
      let totalIncome = 0
      let totalDisbursements = 0
      let totalOutstanding = 0

      Object.keys(combinedData).forEach(yearKey => {
        const yearData = combinedData[yearKey]
        if (yearData[classFilter] && yearData[classFilter][statusFilter]) {
          const stats = yearData[classFilter][statusFilter]
          totalBookings += stats.count || 0
          totalRevenue += stats.revenue_total || 0
          totalBedNights += stats.bed_nights || 0
          totalPax += stats.pax || 0
          totalIncome += stats.income || 0
          totalDisbursements += stats.disbursements || 0
          totalOutstanding += stats.outstanding || 0
        }
      })

      filteredData.summary = {
        ...data.summary,
        total_bookings: totalBookings || data.summary.total_bookings,
        total_revenue: totalRevenue,
        total_bed_nights: totalBedNights,
        total_pax: totalPax || data.summary.total_pax,
        total_income: totalIncome,
        total_disbursements: totalDisbursements,
        total_outstanding: totalOutstanding,
      }
    }
  } else if (classFilter !== 'All') {
    // Filter by class only
    const bookingClassData = data.by_booking_class?.[classFilter]
    if (bookingClassData) {
      filteredData.summary = {
        ...data.summary,
        total_bookings: bookingClassData.count,
        total_revenue: bookingClassData.revenue,
        total_bed_nights: bookingClassData.bed_nights,
        total_pax: bookingClassData.pax,
        total_income: bookingClassData.income,
        total_disbursements: bookingClassData.disbursements,
        total_outstanding: bookingClassData.outstanding,
      }
    }
  } else if (statusFilter !== 'All') {
    // Filter by status only
    const statusData = data.by_status?.[statusFilter]
    if (statusData) {
      filteredData.summary = {
        ...data.summary,
        total_bookings: statusData.count,
        total_revenue: statusData.revenue,
        total_bed_nights: statusData.bed_nights,
        total_pax: statusData.pax,
        total_income: statusData.income,
        total_disbursements: statusData.disbursements,
        total_outstanding: statusData.outstanding,
      }
    }
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

  return filteredData
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

