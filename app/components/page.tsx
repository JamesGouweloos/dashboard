'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import DashboardLayout from '@/components/DashboardLayout'
import DashboardFilters from '@/components/DashboardFilters'
import RevenueCategorization from '@/components/RevenueCategorization'
import { DashboardData } from '@/lib/dataFilters'
import { useDataRefresh } from '@/lib/useDataRefresh'
import { useRevenueCategorization } from '@/lib/useRevenueCategorization'
import TopExtrasChart from '@/components/TopExtrasChart'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, ComposedChart, TooltipProps } from 'recharts'
import { motion } from 'framer-motion'
import { DollarSign, TrendingUp, TrendingDown, Percent } from 'lucide-react'

const COLORS = ['#0ea5e9', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

type Category = 'Accommodation' | 'Park Fees & Levies' | 'Travel' | 'Activities' | 'Bar' | 'Shop'

const CATEGORIES: Category[] = ['Accommodation', 'Park Fees & Levies', 'Travel', 'Activities', 'Bar', 'Shop']

const shouldSkipItem = (item: string) => {
  const lowerItem = item.toLowerCase()
  return (
    lowerItem.includes('payment') ||
    lowerItem === 'payments' ||
    lowerItem.includes('status cancel date') ||
    lowerItem.includes('status confirm date') ||
    lowerItem.includes('status provisional date') ||
    lowerItem.includes('status quote date')
  )
}

const parseNumericValue = (value: unknown): number => {
  if (value === null || value === undefined || value === '') return 0
  const parsed = parseFloat(String(value).replace(/,/g, ''))
  return Number.isFinite(parsed) ? parsed : 0
}

export default function ComponentsPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('All')
  const [classFilter, setClassFilter] = useState<string>('All')
  const [selectedCategories, setSelectedCategories] = useState<Category[]>([...CATEGORIES])
  const [expandedCategoryDetails, setExpandedCategoryDetails] = useState<Category | null>(null)
  const [selectedYears, setSelectedYears] = useState<number[]>([])
  const [monthlyCategoryTrendYears, setMonthlyCategoryTrendYears] = useState<number[]>([])
  const [monthlyCategoryTrendCategories, setMonthlyCategoryTrendCategories] = useState<Category[]>([...CATEGORIES])
  const [monthlyComponentTrendYears, setMonthlyComponentTrendYears] = useState<number[]>([])
  const [topExtrasYears, setTopExtrasYears] = useState<number[]>([])
  const refreshKey = useDataRefresh()
  const { config, loading: configLoading, calculateCategoryBreakdown } = useRevenueCategorization()

  useEffect(() => {
    fetchData()
  }, [refreshKey])

  const fetchData = async () => {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 second timeout
      
      const response = await fetch('/api/data', { 
        cache: 'no-store',
        signal: controller.signal
      })
      
      clearTimeout(timeoutId)
      
      if (!response.ok) {
        throw new Error(`Failed to fetch data: ${response.status} ${response.statusText}`)
      }
      
      const jsonData = await response.json()
      setData(jsonData)
      setLoading(false)
    } catch (err) {
      if (err instanceof Error) {
        if (err.name === 'AbortError') {
          setError('Request timed out. Please try again.')
        } else {
        setError(err.message)
        }
      } else {
        setError('An unknown error occurred')
      }
      setLoading(false)
    }
  }

  const matchesFilters = useCallback((booking: any) => {
    if (statusFilter !== 'All') {
      const status = booking.Status || booking.status || booking['Booking Status']
      if (status !== statusFilter) {
        return false
      }
    }

    if (classFilter !== 'All') {
      const bookingClass =
        booking['Booking Class'] ||
        booking.booking_class ||
        booking.Booking_Class ||
        booking.bookingClass
      if (bookingClass !== classFilter) {
        return false
      }
    }

    return true
  }, [statusFilter, classFilter])

  // Get available years from monthly_bookings
  const availableYears = useMemo(() => {
    if (!data?.monthly_bookings) return []
    const years = Object.keys(data.monthly_bookings)
      .map(y => parseInt(y))
      .filter(y => !isNaN(y))
      .sort((a, b) => a - b)
    return years
  }, [data])

  // Initialize monthly trend year filters to all available years
  useEffect(() => {
    if (availableYears.length > 0) {
      if (monthlyCategoryTrendYears.length === 0) {
        setMonthlyCategoryTrendYears([...availableYears])
      }
      if (monthlyComponentTrendYears.length === 0) {
        setMonthlyComponentTrendYears([...availableYears])
      }
      if (topExtrasYears.length === 0) {
        setTopExtrasYears([...availableYears])
      }
    }
  }, [availableYears, monthlyCategoryTrendYears.length, monthlyComponentTrendYears.length, topExtrasYears.length])

  // Initialize selectedYears to all years if empty
  useEffect(() => {
    if (data && selectedYears.length === 0 && availableYears.length > 0) {
      setSelectedYears([...availableYears])
    }
  }, [data, availableYears, selectedYears.length])

  const filteredBookingData = useMemo(() => {
    if (!data?.monthly_bookings) {
      return {
        bookings: [] as any[],
        monthly: {} as Record<string, Record<string, any[]>>
      }
    }

    const yearsArray = selectedYears.length > 0 ? selectedYears : availableYears
    const yearsSet = new Set(yearsArray)
    const monthly: Record<string, Record<string, any[]>> = {}
    const bookings: any[] = []

    Object.entries(data.monthly_bookings).forEach(([year, yearData]) => {
      const yearNum = parseInt(year)
      if (Number.isNaN(yearNum) || !yearsSet.has(yearNum)) {
        return
      }

      const monthsData = yearData && typeof yearData === 'object' ? (yearData as Record<string, any>) : {}

      Object.entries(monthsData).forEach(([month, monthBookings]) => {
        const bookingsArray = Array.isArray(monthBookings) ? monthBookings : []
        const filtered = bookingsArray.filter(matchesFilters)

        if (!monthly[year]) {
          monthly[year] = {}
        }

        monthly[year][month] = filtered

        if (filtered.length > 0) {
          bookings.push(...filtered)
        }
      })
    })

    return { bookings, monthly }
  }, [data?.monthly_bookings, selectedYears, availableYears, matchesFilters])

  const filteredBookings = filteredBookingData.bookings
  const filteredMonthlyBookings = filteredBookingData.monthly

  const itemMappings = useMemo(() => {
    if (!config) return [] as Array<{ item: string; category: Category; fields: string[] }>

    return Object.entries(config.itemToCategory).reduce((acc, [item, category]) => {
      if (!category) {
        return acc
      }

      const typedCategory = category as Category
      if (!CATEGORIES.includes(typedCategory) || shouldSkipItem(item)) {
        return acc
      }

      const fieldVariants = Array.from(new Set([item, item.toLowerCase(), item.toUpperCase()]))
      acc.push({ item, category: typedCategory, fields: fieldVariants })
      return acc
    }, [] as Array<{ item: string; category: Category; fields: string[] }>)
  }, [config])

  // Calculate category breakdowns from monthly bookings - MUST be before any conditional returns
  const categoryBreakdowns = useMemo(() => {
    if (!config) return null

    try {
      const totalRaw = calculateCategoryBreakdown(filteredBookings)
      const total = CATEGORIES.reduce((acc, category) => {
        acc[category] = totalRaw[category] || 0
        return acc
      }, {} as Record<Category, number>)

      const yearly: Record<string, Record<Category, number>> = {}
      const monthly: Record<string, Record<string, Record<Category, number>>> = {}

      Object.entries(filteredMonthlyBookings).forEach(([year, months]) => {
        const yearTotals: Record<Category, number> = {
          Accommodation: 0,
          'Park Fees & Levies': 0,
          Travel: 0,
          Activities: 0,
          Bar: 0,
          Shop: 0
        }

        yearly[year] = yearTotals
        monthly[year] = {}

        Object.entries(months).forEach(([month, bookings]) => {
          const monthTotalsRaw = calculateCategoryBreakdown(bookings)
          const monthTotals = CATEGORIES.reduce((acc, category) => {
            acc[category] = monthTotalsRaw[category] || 0
            return acc
          }, {} as Record<Category, number>)

          monthly[year][month] = monthTotals

          CATEGORIES.forEach(category => {
            yearTotals[category] += monthTotals[category] || 0
          })
        })
      })

      return {
        total,
        yearly,
        monthly
      }
    } catch (error) {
      console.error('Error calculating category breakdowns:', error)
      return null
    }
  }, [config, filteredBookings, filteredMonthlyBookings, calculateCategoryBreakdown])

  // Calculate category-based breakdowns - MUST be before conditional returns
  const categoryChartData = useMemo(() => {
    if (!categoryBreakdowns || !config) return []
    
    const filtered = selectedCategories.length === 0 
      ? CATEGORIES 
      : selectedCategories
    
    return filtered.map((category, idx) => ({
      name: category,
      value: categoryBreakdowns.total[category] || 0,
      color: COLORS[idx % COLORS.length],
      type: config.categoryToType[category]
    }))
  }, [categoryBreakdowns, config, selectedCategories])

  // Calculate category totals by type - MUST be before conditional returns
  const categoryByType = useMemo(() => {
    if (!categoryBreakdowns || !config) return { Income: 0, Disbursements: 0 }
    
    let incomeTotal = 0
    let disbursementsTotal = 0
    
    Object.entries(categoryBreakdowns.total).forEach(([category, value]) => {
      const type = config.categoryToType[category as Category]
      if (type === 'Income') {
        incomeTotal += value || 0
      } else {
        disbursementsTotal += value || 0
      }
    })
    
    return { Income: incomeTotal, Disbursements: disbursementsTotal }
  }, [categoryBreakdowns, config])

  // Calculate item-level contributions by category - MUST be before conditional returns
  const itemContributionsByCategory = useMemo<Record<Category, Record<string, number>>>(() => {
    if (!config) return {
      Accommodation: {},
      'Park Fees & Levies': {},
      Travel: {},
      Activities: {},
      Bar: {},
      Shop: {}
    }

    try {
      const itemTotals: Record<Category, Record<string, number>> = {
        Accommodation: {},
        'Park Fees & Levies': {},
        Travel: {},
        Activities: {},
        Bar: {},
        Shop: {}
      }

      if (itemMappings.length === 0 || filteredBookings.length === 0) {
        return itemTotals
      }

      filteredBookings.forEach(booking => {
        const processedFields = new Set<string>()

        itemMappings.forEach(({ item, category, fields }) => {
          for (const fieldName of fields) {
            if (processedFields.has(fieldName)) {
              continue
            }

            const rawValue = booking[fieldName]
            if (rawValue === undefined || rawValue === null || rawValue === '') {
              continue
            }

            const value = parseNumericValue(rawValue)
            if (value === 0) {
              continue
            }

            processedFields.add(fieldName)

            if (!itemTotals[category][item]) {
              itemTotals[category][item] = 0
            }

            if (item === '10% Discount' || item.toLowerCase().includes('discount')) {
              itemTotals[category][item] -= value
            } else {
              itemTotals[category][item] += value
            }

            break
          }
        })
      })

      return itemTotals
    } catch (error) {
      console.error('Error calculating item contributions:', error)
      return {
        Accommodation: {},
        'Park Fees & Levies': {},
        Travel: {},
        Activities: {},
        Bar: {},
        Shop: {}
      }
    }
  }, [config, itemMappings, filteredBookings])

  // Calculate component breakdowns from filtered booking data - MUST be before conditional returns
  const getComponentBreakdown = useMemo(() => {
    let totalAccommodation = 0
    let totalIncome = 0
    let totalDisbursements = 0
    let totalRevenue = 0
    let totalOutstanding = 0
    let totalBedNights = 0

    filteredBookings.forEach((booking: any) => {
      totalAccommodation += parseNumericValue(booking.Accommodation ?? booking.accommodation ?? booking.ACCOMMODATION)
      totalIncome += parseNumericValue(booking.Income ?? booking.income ?? booking.INCOME)
      totalDisbursements += parseNumericValue(booking.Disbursements ?? booking.disbursements ?? booking.DISBURSEMENTS)
      totalRevenue += parseNumericValue(
        booking['Revenue Total'] ??
          booking.revenue_total ??
          booking.Revenue_Total ??
          booking.revenueTotal ??
          booking.REVENUE_TOTAL
      )
      totalOutstanding += parseNumericValue(
        booking['Total amount outstanding'] ??
          booking.outstanding ??
          booking.Outstanding ??
          booking.total_amount_outstanding
      )

      const bedNightsValue = parseInt(
        String(
          booking['Bed nights'] ??
            booking.bed_nights ??
            booking.Bed_nights ??
            booking.bedNights ??
            0
        ),
        10
      )
      totalBedNights += Number.isFinite(bedNightsValue) ? bedNightsValue : 0
    })

    return {
      accommodation: totalAccommodation,
      income: totalIncome,
      disbursements: totalDisbursements,
      revenue: totalRevenue,
      outstanding: totalOutstanding,
      bedNights: totalBedNights
    }
  }, [filteredBookings])

  // Calculate monthly component trend - MUST be before conditional returns
  const getMonthlyComponentTrend = useMemo(() => {
    if (!data?.monthly_breakdown_combined && !data?.monthly_breakdown) return []
    const monthlyBreakdown = data.monthly_breakdown_combined || data.monthly_breakdown || {}
    const months: Array<{ month: string; income: number; disbursements: number; revenue: number }> = []
    const yearsToUse = monthlyComponentTrendYears.length > 0 ? monthlyComponentTrendYears : availableYears

    // Sort years numerically
    Object.keys(monthlyBreakdown)
      .map(y => parseInt(y))
      .filter(y => !isNaN(y) && yearsToUse.includes(y))
      .sort((a, b) => a - b)
      .forEach(yearNum => {
        const year = yearNum.toString()
        const yearData = monthlyBreakdown[year]
        // Sort months numerically, but keep original key format
        Object.keys(yearData)
          .map(m => ({ originalKey: m, numValue: parseFloat(m.toString().replace('.0', '')) }))
          .filter(m => !isNaN(m.numValue))
          .sort((a, b) => a.numValue - b.numValue)
          .forEach(({ originalKey, numValue }) => {
            const monthData = yearData[originalKey]
            if (!monthData) return // Skip if monthData is undefined
            
      let income = 0
      let disbursements = 0
      let revenue = 0

            if (data.monthly_breakdown_combined) {
              Object.values(monthData).forEach((classData: any) => {
                if (classData && typeof classData === 'object') {
          Object.values(classData).forEach((statusData: any) => {
                    if (statusData && typeof statusData === 'object') {
            income += statusData.income || 0
            disbursements += statusData.disbursements || 0
            revenue += statusData.revenue_total || 0
                    }
          })
                }
        })
      } else {
              Object.values(monthData).forEach((statusData: any) => {
                if (statusData && typeof statusData === 'object') {
          income += statusData.income || 0
          disbursements += statusData.disbursements || 0
          revenue += statusData.revenue_total || 0
                }
        })
      }

            months.push({
              month: `${year}-${numValue.toString().padStart(2, '0')}`,
        income,
        disbursements,
              revenue
            })
          })
      })

    // Sort chronologically by date (ascending)
    return months.sort((a, b) => {
      const dateA = new Date(a.month + '-01').getTime()
      const dateB = new Date(b.month + '-01').getTime()
      return dateA - dateB
    })
  }, [data, monthlyComponentTrendYears, availableYears])

  // Filter monthly category trends data - MUST be before conditional returns
  const filteredMonthlyCategoryData = useMemo(() => {
    if (!categoryBreakdowns?.monthly) return []
    const yearsToUse = monthlyCategoryTrendYears.length > 0 ? monthlyCategoryTrendYears : availableYears
    const categoriesToUse = monthlyCategoryTrendCategories.length > 0 ? monthlyCategoryTrendCategories : CATEGORIES
    
    // Collect all data points first
    const dataPoints: Array<{ month: string; [key: string]: any }> = []
    
    // Sort years numerically
    Object.keys(categoryBreakdowns.monthly)
      .map(y => parseInt(y))
      .filter(y => !isNaN(y) && yearsToUse.includes(y))
      .sort((a, b) => a - b)
      .forEach(yearNum => {
        const year = yearNum.toString()
        const months = categoryBreakdowns.monthly[year]
        // Sort months numerically, but keep original key format
        Object.keys(months)
          .map(m => ({ originalKey: m, numValue: parseFloat(m.toString().replace('.0', '')) }))
          .filter(m => !isNaN(m.numValue))
          .sort((a, b) => a.numValue - b.numValue)
          .forEach(({ originalKey, numValue }) => {
            const cats = months[originalKey]
            if (!cats || typeof cats !== 'object') return // Skip if cats is undefined or not an object
            
            const filteredCats: Record<string, number> = {}
            categoriesToUse.forEach(cat => {
              filteredCats[cat] = (cats as Record<Category, number>)[cat] || 0
            })
            dataPoints.push({
              month: `${year}-${numValue.toString().padStart(2, '0')}`,
              ...filteredCats
            })
    })
      })
    
    // Data is already in chronological order, but sort again to be safe
    return dataPoints.sort((a, b) => {
      const dateA = new Date(a.month + '-01').getTime()
      const dateB = new Date(b.month + '-01').getTime()
      return dateA - dateB
    })
  }, [categoryBreakdowns?.monthly, monthlyCategoryTrendYears, monthlyCategoryTrendCategories, availableYears])

  // Calculate dynamic Y-axis scale for monthly category trends - MUST be before conditional returns
  const monthlyCategoryYAxisDomain = useMemo(() => {
    if (filteredMonthlyCategoryData.length === 0) return [0, 1000]
    
    const categoriesToUse = monthlyCategoryTrendCategories.length > 0 ? monthlyCategoryTrendCategories : CATEGORIES
    let maxValue = 0
    
    filteredMonthlyCategoryData.forEach((point: any) => {
      categoriesToUse.forEach(cat => {
        const value = point[cat] || 0
        if (value > maxValue) {
          maxValue = value
        }
      })
    })
    
    // Add 10% padding to the top
    const paddedMax = maxValue * 1.1
    // Round up to nearest nice number
    const niceMax = Math.ceil(paddedMax / 10000) * 10000
    
    return [0, niceMax]
  }, [filteredMonthlyCategoryData, monthlyCategoryTrendCategories])

  // Calculate filtered top extras by year and category - MUST be before conditional returns
  const filteredTopExtras = useMemo(() => {
    if (!data?.monthly_bookings || !config) return {}

    const yearsArray = topExtrasYears.length > 0 ? topExtrasYears : availableYears
    const yearsSet = new Set(yearsArray)
    const categoriesToUse = selectedCategories.length > 0 ? selectedCategories : CATEGORIES
    const categoriesSet = new Set(categoriesToUse)

    const incomeItems = itemMappings.filter(({ category }) => {
      if (!categoriesSet.has(category)) return false
      const categoryType = config.categoryToType?.[category]
      return categoryType === 'Income'
    })

    if (incomeItems.length === 0) {
      return {}
    }

    const totals: Record<string, number> = {}

    Object.entries(data.monthly_bookings).forEach(([year, yearData]) => {
      const yearNum = parseInt(year)
      if (Number.isNaN(yearNum) || !yearsSet.has(yearNum)) {
        return
      }

      if (!yearData || typeof yearData !== 'object') {
        return
      }

      Object.values(yearData).forEach((monthBookings: any) => {
        if (!Array.isArray(monthBookings)) {
          return
        }

        monthBookings.forEach((booking: any) => {
          if (!matchesFilters(booking)) {
            return
          }

          incomeItems.forEach(({ item, fields }) => {
            for (const fieldName of fields) {
              const rawValue = booking[fieldName]
              if (rawValue === undefined || rawValue === null || rawValue === '') {
                continue
              }

              const value = parseNumericValue(rawValue)
              if (value > 0) {
                totals[item] = (totals[item] || 0) + value
                break
              }
            }
          })
        })
      })
    })

    return Object.fromEntries(
      Object.entries(totals)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
    )
  }, [data?.monthly_bookings, config, itemMappings, topExtrasYears, selectedCategories, availableYears, matchesFilters])

  // Early returns after all hooks
  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading component analysis...</p>
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
            {error && <p className="text-sm text-gray-500">{error}</p>}
          </div>
        </div>
      </DashboardLayout>
    )
  }

  const getYearlyComponentTrend = () => {
    const yearlyBreakdown = data.yearly_breakdown_combined || data.yearly_breakdown || {}
    const years = Object.keys(yearlyBreakdown).sort()

    return years.map(year => {
      const yearData = yearlyBreakdown[year]
        let income = 0
        let disbursements = 0
        let revenue = 0

      if (data.yearly_breakdown_combined) {
        Object.values(yearData).forEach((classData: any) => {
            Object.values(classData).forEach((statusData: any) => {
              income += statusData.income || 0
              disbursements += statusData.disbursements || 0
              revenue += statusData.revenue_total || 0
            })
          })
        } else {
        Object.values(yearData).forEach((statusData: any) => {
            income += statusData.income || 0
            disbursements += statusData.disbursements || 0
            revenue += statusData.revenue_total || 0
          })
        }

      return {
        year,
          income,
          disbursements,
        revenue,
        netIncome: revenue - disbursements,
        disbursementRatio: revenue > 0 ? ((disbursements / revenue) * 100) : 0
      }
        })
  }

  const components = getComponentBreakdown
  const yearlyTrend = getYearlyComponentTrend()
  const monthlyTrend = getMonthlyComponentTrend

  const componentChartData = [
    { name: 'Income', value: components.income, color: COLORS[1] },
    { name: 'Disbursements', value: components.disbursements, color: COLORS[2] },
  ]

  const totalComponents = components.income + components.disbursements
  const netProfit = components.revenue - components.disbursements
  const profitMargin = components.revenue > 0 ? ((netProfit / components.revenue) * 100) : 0
  const disbursementRatio = components.revenue > 0 ? ((components.disbursements / components.revenue) * 100) : 0

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Component Analysis</h1>
          <p className="text-gray-600">
              Breakdown of revenue components: Income and Disbursements by category
          </p>
          </div>
          <RevenueCategorization />
        </div>

        <DashboardFilters
          statusFilter={statusFilter}
          classFilter={classFilter}
          onStatusFilterChange={setStatusFilter}
          onClassFilterChange={setClassFilter}
        />

        {/* Category Filter */}
        {config && !configLoading && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-gray-700">Filter by Category:</span>
              <button
                onClick={() => setSelectedCategories(selectedCategories.length === CATEGORIES.length ? [] : [...CATEGORIES])}
                className="text-xs text-primary-600 hover:text-primary-700"
              >
                {selectedCategories.length === CATEGORIES.length ? 'Clear All' : 'Select All'}
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map(category => {
                const isSelected = selectedCategories.includes(category)
                const categoryType = config.categoryToType[category]
                return (
                  <button
                    key={category}
                    onClick={() => {
                      if (selectedCategories.includes(category)) {
                        setSelectedCategories(selectedCategories.filter(c => c !== category))
                      } else {
                        setSelectedCategories([...selectedCategories, category])
                      }
                    }}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      isSelected
                        ? categoryType === 'Income'
                          ? 'bg-green-100 text-green-700 border-2 border-green-300'
                          : 'bg-orange-100 text-orange-700 border-2 border-orange-300'
                        : 'bg-gray-100 text-gray-600 border-2 border-transparent'
                    }`}
                  >
                    {category}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Revenue</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  ${components.revenue.toLocaleString()}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-primary-600" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Net Income</p>
                <p className={`text-2xl font-bold mt-1 ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  ${netProfit.toLocaleString()}
                </p>
              </div>
              <TrendingUp className={`h-8 w-8 ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`} />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Profit Margin</p>
                <p className={`text-2xl font-bold mt-1 ${profitMargin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {profitMargin.toFixed(1)}%
                </p>
              </div>
              <Percent className={`h-8 w-8 ${profitMargin >= 0 ? 'text-green-600' : 'text-red-600'}`} />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Disbursement Ratio</p>
                <p className="text-2xl font-bold text-orange-600 mt-1">
                  {disbursementRatio.toFixed(1)}%
                </p>
              </div>
              <TrendingDown className="h-8 w-8 text-orange-600" />
            </div>
          </motion.div>
        </div>

        {/* Revenue by Category */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
          >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Revenue by Category</h2>
            {/* Year Filter */}
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
                        isSelected
                          ? 'bg-primary-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
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
          </div>
          {categoryChartData && categoryChartData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={450}>
              <PieChart>
                <Pie
                    data={categoryChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                    outerRadius={140}
                  fill="#8884d8"
                  dataKey="value"
                >
                    {categoryChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => `$${value.toLocaleString()}`} />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-4 space-y-2">
                  {categoryChartData.map((item, index) => {
                    const category = item.name as Category
                    const isExpanded = expandedCategoryDetails === category
                    const itemContributions = itemContributionsByCategory[category] || {}
                    const contributionItems = Object.entries(itemContributions)
                      .filter(([_, value]) => Math.abs(value) > 0.01) // Filter out near-zero values
                      .sort(([_, a], [__, b]) => Math.abs(b) - Math.abs(a)) // Sort by absolute value descending
                    
                    return (
                      <div key={index} className="border border-gray-200 rounded-lg p-3">
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center space-x-2 flex-1">
                    <div className="w-4 h-4 rounded" style={{ backgroundColor: item.color }} />
                            <span className="text-gray-600 font-medium">{item.name}</span>
                            <span className={`text-xs px-1.5 py-0.5 rounded ${
                              item.type === 'Income' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                            }`}>
                              {item.type}
                            </span>
                  </div>
                          <div className="flex items-center space-x-3">
                  <span className="font-semibold text-gray-900">${item.value.toLocaleString()}</span>
                            {contributionItems.length > 0 && (
                              <button
                                onClick={() => setExpandedCategoryDetails(isExpanded ? null : category)}
                                className="text-xs text-primary-600 hover:text-primary-700 font-medium"
                              >
                                {isExpanded ? 'Hide Details' : 'Show Details'}
                              </button>
                            )}
                </div>
            </div>
                        
                        {isExpanded && contributionItems.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-gray-200">
                            <p className="text-xs font-semibold text-gray-700 mb-2">Component Contributions:</p>
                            <div className="space-y-1 max-h-48 overflow-y-auto">
                              {contributionItems.map(([componentName, componentValue], idx) => {
                                const percentage = item.value > 0 ? ((Math.abs(componentValue) / item.value) * 100).toFixed(1) : '0'
                                return (
                                  <div key={idx} className="flex items-center justify-between text-xs bg-gray-50 p-2 rounded">
                                    <span className="text-gray-600 flex-1">{componentName}:</span>
                                    <span className={`font-medium ml-2 ${
                                      componentValue < 0 ? 'text-red-600' : 'text-gray-900'
                                    }`}>
                                      ${Math.abs(componentValue).toLocaleString()} ({percentage}%)
                                    </span>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-300 text-gray-500">
                <p>Loading category breakdown...</p>
              </div>
            )}
          </motion.div>
          

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
          >
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Category Breakdown by Year</h2>
            {categoryBreakdowns && config ? (
            <ResponsiveContainer width="100%" height={300}>
                <BarChart data={Object.entries(categoryBreakdowns.yearly).map(([year, cats]) => ({
                  year,
                  ...cats
                })).sort((a, b) => a.year.localeCompare(b.year))}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="year" tick={{ fill: '#6B7280', fontSize: 12 }} />
                  <YAxis tick={{ fill: '#6B7280', fontSize: 12 }} tickFormatter={(value) => `$${(value/1000).toFixed(0)}k`} />
                <Tooltip formatter={(value: number) => `$${value.toLocaleString()}`} />
                <Legend />
                  {(selectedCategories.length === 0 ? CATEGORIES : selectedCategories).map((cat, idx) => (
                    <Bar key={cat} dataKey={cat} fill={COLORS[idx % COLORS.length]} name={cat} />
                  ))}
                </BarChart>
            </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-300 text-gray-500">
                <p>Loading category data...</p>
        </div>
            )}
          </motion.div>

        {/* Monthly Category Trend */}
        {categoryBreakdowns && config && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
        >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Monthly Category Trends</h2>
            </div>
            
            {/* Year Filter Controls */}
            <div className="mb-4 pb-4 border-b border-gray-200">
              <div className="flex items-center space-x-3 mb-3">
                <label className="text-sm font-medium text-gray-700">Years:</label>
                <div className="flex flex-wrap gap-2">
                  {availableYears.map(year => {
                    const isSelected = monthlyCategoryTrendYears.includes(year)
                    return (
                      <button
                        key={year}
                        onClick={() => {
                          if (isSelected) {
                            setMonthlyCategoryTrendYears(monthlyCategoryTrendYears.filter(y => y !== year))
                          } else {
                            setMonthlyCategoryTrendYears([...monthlyCategoryTrendYears, year].sort((a, b) => a - b))
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
                  {monthlyCategoryTrendYears.length > 0 && (
                    <button
                      onClick={() => setMonthlyCategoryTrendYears([...availableYears])}
                      className="px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                    >
                      Select All
                    </button>
                  )}
                </div>
              </div>
              
              {/* Category Selection Controls */}
              <div className="flex items-center space-x-3">
                <label className="text-sm font-medium text-gray-700">Categories:</label>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map(category => {
                    const isSelected = monthlyCategoryTrendCategories.includes(category)
                    return (
                      <button
                        key={category}
                        onClick={() => {
                          if (isSelected) {
                            setMonthlyCategoryTrendCategories(monthlyCategoryTrendCategories.filter(c => c !== category))
                          } else {
                            setMonthlyCategoryTrendCategories([...monthlyCategoryTrendCategories, category])
                          }
                        }}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                          isSelected ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {category}
                      </button>
                    )
                  })}
                  {monthlyCategoryTrendCategories.length > 0 && (
                    <button
                      onClick={() => setMonthlyCategoryTrendCategories([...CATEGORIES])}
                      className="px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                    >
                      Select All
                    </button>
                  )}
                </div>
              </div>
            </div>
            
          <ResponsiveContainer width="100%" height={400}>
              <ComposedChart 
                data={filteredMonthlyCategoryData}
                margin={{ top: 5, right: 30, left: 20, bottom: 100 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="month" 
                  angle={-45}
                  textAnchor="end"
                  height={100}
                  tick={{ fill: '#6B7280', fontSize: 11 }}
                />
                <YAxis 
                  domain={monthlyCategoryYAxisDomain}
                  tick={{ fill: '#6B7280', fontSize: 12 }} 
                  tickFormatter={(value) => `$${(value/1000).toFixed(0)}k`} 
                />
                <Tooltip formatter={(value: number) => `$${value.toLocaleString()}`} />
                <Legend />
                {(monthlyCategoryTrendCategories.length === 0 ? CATEGORIES : monthlyCategoryTrendCategories).map((cat, idx) => (
                  <Line 
                    key={cat} 
                    type="monotone" 
                    dataKey={cat} 
                    stroke={COLORS[idx % COLORS.length]} 
                    strokeWidth={2} 
                    name={cat} 
                  />
                ))}
              </ComposedChart>
            </ResponsiveContainer>
          </motion.div>
        )}

        {/* Monthly Income/Disbursements Trend */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Monthly Component Trends</h2>
          </div>
          
          {/* Year Filter Controls */}
          <div className="mb-4 pb-4 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <label className="text-sm font-medium text-gray-700">Years:</label>
              <div className="flex flex-wrap gap-2">
                {availableYears.map(year => {
                  const isSelected = monthlyComponentTrendYears.includes(year)
                  return (
                    <button
                      key={year}
                      onClick={() => {
                        if (isSelected) {
                          setMonthlyComponentTrendYears(monthlyComponentTrendYears.filter(y => y !== year))
                        } else {
                          setMonthlyComponentTrendYears([...monthlyComponentTrendYears, year].sort((a, b) => a - b))
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
                {monthlyComponentTrendYears.length > 0 && (
                  <button
                    onClick={() => setMonthlyComponentTrendYears([...availableYears])}
                    className="px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                  >
                    Select All
                  </button>
                )}
              </div>
            </div>
          </div>
          
          <ResponsiveContainer width="100%" height={400}>
            <ComposedChart data={monthlyTrend} margin={{ top: 5, right: 30, left: 20, bottom: 100 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="month" 
                angle={-45}
                textAnchor="end"
                height={100}
                tick={{ fill: '#6B7280', fontSize: 11 }}
              />
              <YAxis yAxisId="left" tick={{ fill: '#6B7280', fontSize: 12 }} tickFormatter={(value) => `$${(value/1000).toFixed(0)}k`} />
              <Tooltip formatter={(value: number) => `$${value.toLocaleString()}`} />
              <Legend />
              <Line yAxisId="left" type="monotone" dataKey="income" stroke={COLORS[1]} strokeWidth={2} name="Income" />
              <Line yAxisId="left" type="monotone" dataKey="disbursements" stroke={COLORS[2]} strokeWidth={2} name="Disbursements" />
            </ComposedChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Top Revenue Extras */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-2">
              <h2 className="text-xl font-semibold text-gray-900">Top Revenue Extras</h2>
            </div>
          </div>
          
          {/* Year and Category Filter Controls */}
          <div className="mb-4 pb-4 border-b border-gray-200">
            <div className="flex items-center space-x-3 mb-3">
              <label className="text-sm font-medium text-gray-700">Years:</label>
              <div className="flex flex-wrap gap-2">
                {availableYears.map(year => {
                  const isSelected = topExtrasYears.includes(year)
                  return (
                    <button
                      key={year}
                      onClick={() => {
                        if (isSelected) {
                          setTopExtrasYears(topExtrasYears.filter(y => y !== year))
                        } else {
                          setTopExtrasYears([...topExtrasYears, year].sort((a, b) => a - b))
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
                {topExtrasYears.length > 0 && (
                  <button
                    onClick={() => setTopExtrasYears([...availableYears])}
                    className="px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                  >
                    Select All
                  </button>
                )}
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <label className="text-sm font-medium text-gray-700">Categories:</label>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map(category => {
                  const isSelected = selectedCategories.includes(category)
                  return (
                    <button
                      key={category}
                      onClick={() => {
                        if (isSelected) {
                          setSelectedCategories(selectedCategories.filter(c => c !== category))
                        } else {
                          setSelectedCategories([...selectedCategories, category])
                        }
                      }}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        isSelected ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {category}
                    </button>
                  )
                })}
                {selectedCategories.length > 0 && (
                  <button
                    onClick={() => setSelectedCategories([...CATEGORIES])}
                    className="px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                  >
                    Select All
                  </button>
                )}
              </div>
            </div>
          </div>
          
          <TopExtrasChart data={filteredTopExtras} />
        </motion.div>

        {/* Category Breakdown Table */}
        {categoryBreakdowns && config && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
        >
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Category Breakdown Summary</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Category</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Type</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Amount</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">% of Revenue</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">% of Type Total</th>
                </tr>
              </thead>
              <tbody>
                  {(selectedCategories.length === 0 ? CATEGORIES : selectedCategories).map((category) => {
                    const value = categoryBreakdowns.total[category] || 0
                    const type = config.categoryToType[category]
                    const totalByType = type === 'Income' ? categoryByType.Income : categoryByType.Disbursements
                    return (
                      <tr key={category} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4 text-sm text-gray-900">{category}</td>
                        <td className="py-3 px-4 text-sm">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            type === 'Income' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                          }`}>
                            {type}
                          </span>
                        </td>
                  <td className="py-3 px-4 text-sm text-right font-medium text-gray-900">
                          ${value.toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-sm text-right text-gray-600">
                          {components.revenue > 0 ? ((value / components.revenue) * 100).toFixed(1) : 0}%
                  </td>
                  <td className="py-3 px-4 text-sm text-right text-gray-600">
                          {totalByType > 0 ? ((value / totalByType) * 100).toFixed(1) : 0}%
                  </td>
                </tr>
                    )
                  })}
                  <tr className="border-t-2 border-gray-300 font-semibold">
                    <td className="py-3 px-4 text-sm text-gray-900">Total Income</td>
                    <td className="py-3 px-4 text-sm">
                      <span className="px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-700">Income</span>
                  </td>
                    <td className="py-3 px-4 text-sm text-right font-bold text-green-600">
                      ${categoryByType.Income.toLocaleString()}
                  </td>
                    <td className="py-3 px-4 text-sm text-right font-bold text-gray-900">
                      {components.revenue > 0 ? ((categoryByType.Income / components.revenue) * 100).toFixed(1) : 0}%
                  </td>
                    <td className="py-3 px-4 text-sm text-right text-gray-600">-</td>
                  </tr>
                  <tr className="border-t border-gray-300 font-semibold">
                    <td className="py-3 px-4 text-sm text-gray-900">Total Disbursements</td>
                    <td className="py-3 px-4 text-sm">
                      <span className="px-2 py-1 rounded text-xs font-medium bg-orange-100 text-orange-700">Disbursements</span>
                    </td>
                    <td className="py-3 px-4 text-sm text-right font-bold text-orange-600">
                      ${categoryByType.Disbursements.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-sm text-right font-bold text-gray-900">
                      {components.revenue > 0 ? ((categoryByType.Disbursements / components.revenue) * 100).toFixed(1) : 0}%
                    </td>
                    <td className="py-3 px-4 text-sm text-right text-gray-600">-</td>
                </tr>
                <tr className="border-t-2 border-gray-300 font-semibold">
                  <td className="py-3 px-4 text-sm text-gray-900">Net Income</td>
                    <td className="py-3 px-4 text-sm">-</td>
                  <td className={`py-3 px-4 text-sm text-right font-bold ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    ${netProfit.toLocaleString()}
                  </td>
                  <td className={`py-3 px-4 text-sm text-right font-bold ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {profitMargin.toFixed(1)}%
                  </td>
                  <td className="py-3 px-4 text-sm text-right text-gray-600">-</td>
                </tr>
                <tr className="border-t-2 border-gray-300 font-semibold">
                  <td className="py-3 px-4 text-sm text-gray-900">Total Revenue</td>
                    <td className="py-3 px-4 text-sm">-</td>
                  <td className="py-3 px-4 text-sm text-right font-bold text-primary-600">
                    ${components.revenue.toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-sm text-right font-bold text-gray-900">100%</td>
                  <td className="py-3 px-4 text-sm text-right text-gray-600">-</td>
                </tr>
              </tbody>
            </table>
          </div>
        </motion.div>
        )}
      </div>
    </DashboardLayout>
  )
}

