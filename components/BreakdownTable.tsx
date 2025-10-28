'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Calendar, ChevronDown, ChevronUp } from 'lucide-react'

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

export default function BreakdownTable({ data }: { data: BreakdownData }) {
  const [selectedYear, setSelectedYear] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<string>('All')
  const [bookingClassFilter, setBookingClassFilter] = useState<string>('All')
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set())
  const [expandedBookings, setExpandedBookings] = useState<Set<string>>(new Set())

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

  const years = Object.keys(yearlyBreakdown).sort()

  const availableStatuses = new Set<string>()
  Object.values(yearlyBreakdown).forEach((yearData: any) => {
    Object.keys(yearData).forEach(status => availableStatuses.add(status))
  })
  const statusOptions = ['All', ...Array.from(availableStatuses)]
  
  const bookingClassOptions = ['All', 'Income Generating', 'Non-Income Generating']
  
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

  const getMonthlyBookings = (year: string, month: string) => {
    if (!data.monthly_bookings || !data.monthly_bookings[year] || !data.monthly_bookings[year][month]) {
      return []
    }
    
    let bookings = data.monthly_bookings[year][month]
    
    // Apply filters
    if (statusFilter !== 'All') {
      bookings = bookings.filter(b => b.status === statusFilter)
    }
    if (bookingClassFilter !== 'All') {
      bookings = bookings.filter(b => b.booking_class === bookingClassFilter)
    }
    
    return bookings
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

        {/* Year Totals */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Metric</th>
                {statuses.map(status => (
                  <th key={status} className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                    {status}
                  </th>
                ))}
                {statuses.length > 1 && (
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-700 bg-primary-50">
                    Total
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              <tr>
                <td className="px-4 py-2 text-sm font-medium text-gray-700">Bed Nights</td>
                {statuses.map(status => (
                  <td key={status} className="px-4 py-2 text-sm text-right text-gray-900">
                    {yearData[status].bed_nights}
                  </td>
                ))}
                {statuses.length > 1 && (
                  <td className="px-4 py-2 text-sm font-semibold text-right bg-primary-50">
                    {totals.bed_nights}
                  </td>
                )}
              </tr>
              <tr>
                <td className="px-4 py-2 text-sm font-medium text-gray-700">Accommodation</td>
                {statuses.map(status => (
                  <td key={status} className="px-4 py-2 text-sm text-right text-gray-900">
                    {formatCurrency(yearData[status].accommodation)}
                  </td>
                ))}
                {statuses.length > 1 && (
                  <td className="px-4 py-2 text-sm font-semibold text-right bg-primary-50">
                    {formatCurrency(totals.accommodation)}
                  </td>
                )}
              </tr>
              <tr>
                <td className="px-4 py-2 text-sm font-medium text-gray-700">Income</td>
                {statuses.map(status => (
                  <td key={status} className="px-4 py-2 text-sm text-right text-green-700">
                    {formatCurrency(yearData[status].income)}
                  </td>
                ))}
                {statuses.length > 1 && (
                  <td className="px-4 py-2 text-sm font-semibold text-right text-green-700 bg-primary-50">
                    {formatCurrency(totals.income)}
                  </td>
                )}
              </tr>
              <tr>
                <td className="px-4 py-2 text-sm font-medium text-gray-700">Disbursements</td>
                {statuses.map(status => (
                  <td key={status} className="px-4 py-2 text-sm text-right text-orange-700">
                    {formatCurrency(yearData[status].disbursements)}
                  </td>
                ))}
                {statuses.length > 1 && (
                  <td className="px-4 py-2 text-sm font-semibold text-right text-orange-700 bg-primary-50">
                    {formatCurrency(totals.disbursements)}
                  </td>
                )}
              </tr>
              <tr>
                <td className="px-4 py-2 text-sm font-medium text-gray-700">Revenue Total</td>
                {statuses.map(status => (
                  <td key={status} className="px-4 py-2 text-sm text-right text-blue-700 font-medium">
                    {formatCurrency(yearData[status].revenue_total)}
                  </td>
                ))}
                {statuses.length > 1 && (
                  <td className="px-4 py-2 text-sm font-bold text-right text-blue-700 bg-primary-50">
                    {formatCurrency(totals.revenue_total)}
                  </td>
                )}
              </tr>
              <tr>
                <td className="px-4 py-2 text-sm font-medium text-gray-700">Outstanding</td>
                {statuses.map(status => (
                  <td key={status} className="px-4 py-2 text-sm text-right text-red-700">
                    {formatCurrency(yearData[status].outstanding)}
                  </td>
                ))}
                {statuses.length > 1 && (
                  <td className="px-4 py-2 text-sm font-semibold text-right text-red-700 bg-primary-50">
                    {formatCurrency(totals.outstanding)}
                  </td>
                )}
              </tr>
            </tbody>
          </table>
        </div>

        {/* Monthly Details */}
        {selectedYear === year && monthlyBreakdown[year] && (
          <div className="border-t border-gray-200 bg-gray-50 p-4">
            <h4 className="text-md font-semibold text-gray-800 mb-3">Monthly Breakdown - {year}</h4>
            <div className="space-y-2">
              {Object.keys(monthlyBreakdown[year])
                .sort((a, b) => {
                  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
                  return months.indexOf(a) - months.indexOf(b)
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
                        <span className="font-medium text-gray-900">{month}</span>
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
                                <th className="px-2 py-1 text-left">Status</th>
                                <th className="px-2 py-1 text-right">Bed Nights</th>
                                <th className="px-2 py-1 text-right">Accomm.</th>
                                <th className="px-2 py-1 text-right">Income</th>
                                <th className="px-2 py-1 text-right">Disbursements</th>
                                <th className="px-2 py-1 text-right">Revenue</th>
                                <th className="px-2 py-1 text-right">Outstanding</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                              {monthStatuses.map(status => (
                                <tr key={status}>
                                  <td className="px-2 py-1 font-medium">{status}</td>
                                  <td className="px-2 py-1 text-right">{monthData[status].bed_nights}</td>
                                  <td className="px-2 py-1 text-right">{formatCurrency(monthData[status].accommodation)}</td>
                                  <td className="px-2 py-1 text-right text-green-700">{formatCurrency(monthData[status].income)}</td>
                                  <td className="px-2 py-1 text-right text-orange-700">{formatCurrency(monthData[status].disbursements)}</td>
                                  <td className="px-2 py-1 text-right text-blue-700 font-medium">{formatCurrency(monthData[status].revenue_total)}</td>
                                  <td className="px-2 py-1 text-right text-red-700">{formatCurrency(monthData[status].outstanding)}</td>
                                </tr>
                              ))}
                              {monthStatuses.length > 1 && (
                                <tr className="bg-primary-50 font-semibold">
                                  <td className="px-2 py-1">Total</td>
                                  <td className="px-2 py-1 text-right">{monthTotals.bed_nights}</td>
                                  <td className="px-2 py-1 text-right">{formatCurrency(monthTotals.accommodation)}</td>
                                  <td className="px-2 py-1 text-right text-green-700">{formatCurrency(monthTotals.income)}</td>
                                  <td className="px-2 py-1 text-right text-orange-700">{formatCurrency(monthTotals.disbursements)}</td>
                                  <td className="px-2 py-1 text-right text-blue-700">{formatCurrency(monthTotals.revenue_total)}</td>
                                  <td className="px-2 py-1 text-right text-red-700">{formatCurrency(monthTotals.outstanding)}</td>
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
                        
                        if (bookings.length === 0) return null
                        
                        return (
                          <div className="mt-3 border-t border-gray-200 pt-3">
                            <button
                              onClick={() => toggleBookings(year, month)}
                              className="w-full flex items-center justify-between text-sm text-gray-600 hover:text-gray-900"
                            >
                              <span className="font-medium">
                                {bookings.length} booking{bookings.length !== 1 ? 's' : ''}
                                {showBookings ? ' (click to hide)' : ' (click to show details)'}
                              </span>
                              {showBookings ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            </button>
                            
                            {showBookings && (
                              <div className="mt-3 overflow-x-auto">
                                <table className="w-full text-xs">
                                  <thead className="bg-gray-100">
                                    <tr>
                                      <th className="px-2 py-1 text-left font-medium text-gray-700">Ref #</th>
                                      <th className="px-2 py-1 text-left font-medium text-gray-700">Name</th>
                                      <th className="px-2 py-1 text-left font-medium text-gray-700">Status</th>
                                      <th className="px-2 py-1 text-left font-medium text-gray-700">Class</th>
                                      <th className="px-2 py-1 text-right font-medium text-gray-700">Bed Nights</th>
                                      <th className="px-2 py-1 text-right font-medium text-gray-700">Pax</th>
                                      <th className="px-2 py-1 text-right font-medium text-gray-700">Income</th>
                                      <th className="px-2 py-1 text-right font-medium text-gray-700">Revenue</th>
                                      <th className="px-2 py-1 text-right font-medium text-gray-700">Agent</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-200">
                                    {bookings.map((booking, idx) => (
                                      <tr key={idx} className={booking.booking_class === 'Income Generating' ? 'bg-green-50' : 'bg-orange-50'}>
                                        <td className="px-2 py-1">{booking.reservation_number}</td>
                                        <td className="px-2 py-1">{booking.name.length > 30 ? booking.name.substring(0, 30) + '...' : booking.name}</td>
                                        <td className="px-2 py-1">{booking.status}</td>
                                        <td className="px-2 py-1">{booking.booking_class}</td>
                                        <td className="px-2 py-1 text-right">{booking.bed_nights}</td>
                                        <td className="px-2 py-1 text-right">{booking.pax}</td>
                                        <td className="px-2 py-1 text-right text-green-700">{formatCurrency(booking.income)}</td>
                                        <td className="px-2 py-1 text-right text-blue-700">{formatCurrency(booking.revenue_total)}</td>
                                        <td className="px-2 py-1">{booking.agent.length > 20 ? booking.agent.substring(0, 20) + '...' : booking.agent}</td>
                                      </tr>
                                    ))}
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
      </div>

      {/* Booking Class Summary */}
      {data.by_booking_class && Object.keys(data.by_booking_class).length > 0 && (
        <div className="mb-6 p-4 bg-gradient-to-r from-primary-50 to-blue-50 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Overall Booking Class Summary</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-white">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold text-gray-700">Booking Class</th>
                  <th className="px-3 py-2 text-right font-semibold text-gray-700">Count</th>
                  <th className="px-3 py-2 text-right font-semibold text-gray-700">Revenue</th>
                  <th className="px-3 py-2 text-right font-semibold text-gray-700">Bed Nights</th>
                  <th className="px-3 py-2 text-right font-semibold text-gray-700">Income</th>
                  <th className="px-3 py-2 text-right font-semibold text-gray-700">Disbursements</th>
                  <th className="px-3 py-2 text-right font-semibold text-gray-700">Outstanding</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {Object.entries(data.by_booking_class)
                  .filter(([bookingClass]) => 
                    bookingClassFilter === 'All' || bookingClass === bookingClassFilter
                  )
                  .map(([bookingClass, metrics]) => (
                    <tr 
                      key={bookingClass} 
                      className={bookingClass === 'Income Generating' ? 'bg-green-50' : 'bg-orange-50'}
                    >
                      <td className="px-3 py-2 font-medium">{bookingClass}</td>
                      <td className="px-3 py-2 text-right">{metrics.count}</td>
                      <td className="px-3 py-2 text-right text-blue-700 font-medium">
                        {formatCurrency(metrics.revenue)}
                      </td>
                      <td className="px-3 py-2 text-right">{metrics.bed_nights}</td>
                      <td className="px-3 py-2 text-right text-green-700">
                        {formatCurrency(metrics.income)}
                      </td>
                      <td className="px-3 py-2 text-right text-orange-700">
                        {formatCurrency(metrics.disbursements)}
                      </td>
                      <td className="px-3 py-2 text-right text-red-700">
                        {formatCurrency(metrics.outstanding)}
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

