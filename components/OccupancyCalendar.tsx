'use client'

import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react'

interface DailyOccupancy {
  date: string
  total: number
  confirmed: number
  provisional: number
}

interface OccupancyCalendarProps {
  data: DailyOccupancy[]
}

type Country = 'Global' | 'South Africa' | 'Zambia' | 'Zimbabwe' | 'Namibia' | 'Botswana'

const TOTAL_ROOMS = 9
const MIN_AVAILABLE_THRESHOLD = 4

// Key cultural and public holidays by country
const getHolidays = (year: number, selectedCountries: Country[]) => {
  const holidays: { [key: string]: { name: string; type: 'public' | 'cultural'; countries: Country[] } } = {}
  
  // Global holidays
  if (selectedCountries.includes('Global')) {
    holidays[`${year}-01-01`] = { name: "New Year's Day", type: 'public', countries: ['Global'] }
    holidays[`${year}-12-25`] = { name: "Christmas Day", type: 'public', countries: ['Global'] }
  }
  
  // Zimbabwe holidays
  if (selectedCountries.includes('Zimbabwe')) {
    holidays[`${year}-04-18`] = { name: "Independence Day", type: 'public', countries: ['Zimbabwe'] }
    holidays[`${year}-05-01`] = { name: "Workers' Day", type: 'public', countries: ['Zimbabwe'] }
    holidays[`${year}-05-25`] = { name: "Africa Day", type: 'public', countries: ['Zimbabwe'] }
    holidays[`${year}-08-11`] = { name: "Heroes' Day", type: 'public', countries: ['Zimbabwe'] }
    holidays[`${year}-08-12`] = { name: "Defence Forces Day", type: 'public', countries: ['Zimbabwe'] }
    holidays[`${year}-12-22`] = { name: "Unity Day", type: 'public', countries: ['Zimbabwe'] }
    holidays[`${year}-12-26`] = { name: "Boxing Day", type: 'public', countries: ['Zimbabwe'] }
  }
  
  // South Africa holidays
  if (selectedCountries.includes('South Africa')) {
    holidays[`${year}-03-21`] = { name: "Human Rights Day", type: 'public', countries: ['South Africa'] }
    holidays[`${year}-04-27`] = { name: "Freedom Day", type: 'public', countries: ['South Africa'] }
    holidays[`${year}-05-01`] = { name: "Workers' Day", type: 'public', countries: ['South Africa'] }
    holidays[`${year}-06-16`] = { name: "Youth Day", type: 'public', countries: ['South Africa'] }
    holidays[`${year}-08-09`] = { name: "Women's Day", type: 'public', countries: ['South Africa'] }
    holidays[`${year}-09-24`] = { name: "Heritage Day", type: 'public', countries: ['South Africa'] }
    holidays[`${year}-12-16`] = { name: "Day of Reconciliation", type: 'public', countries: ['South Africa'] }
    holidays[`${year}-12-26`] = { name: "Day of Goodwill", type: 'public', countries: ['South Africa'] }
  }
  
  // Zambia holidays
  if (selectedCountries.includes('Zambia')) {
    holidays[`${year}-03-12`] = { name: "Youth Day", type: 'public', countries: ['Zambia'] }
    holidays[`${year}-05-01`] = { name: "Labour Day", type: 'public', countries: ['Zambia'] }
    holidays[`${year}-05-25`] = { name: "Africa Day", type: 'public', countries: ['Zambia'] }
    holidays[`${year}-07-06`] = { name: "Heroes' Day", type: 'public', countries: ['Zambia'] }
    holidays[`${year}-07-07`] = { name: "Unity Day", type: 'public', countries: ['Zambia'] }
    holidays[`${year}-10-24`] = { name: "Independence Day", type: 'public', countries: ['Zambia'] }
    holidays[`${year}-12-26`] = { name: "Boxing Day", type: 'public', countries: ['Zambia'] }
  }
  
  // Namibia holidays
  if (selectedCountries.includes('Namibia')) {
    holidays[`${year}-03-21`] = { name: "Independence Day", type: 'public', countries: ['Namibia'] }
    holidays[`${year}-05-01`] = { name: "Workers' Day", type: 'public', countries: ['Namibia'] }
    holidays[`${year}-05-04`] = { name: "Cassinga Day", type: 'public', countries: ['Namibia'] }
    holidays[`${year}-05-25`] = { name: "Africa Day", type: 'public', countries: ['Namibia'] }
    holidays[`${year}-08-26`] = { name: "Heroes' Day", type: 'public', countries: ['Namibia'] }
    holidays[`${year}-12-10`] = { name: "Human Rights Day", type: 'public', countries: ['Namibia'] }
    holidays[`${year}-12-26`] = { name: "Boxing Day", type: 'public', countries: ['Namibia'] }
  }
  
  // Botswana holidays
  if (selectedCountries.includes('Botswana')) {
    holidays[`${year}-05-01`] = { name: "Labour Day", type: 'public', countries: ['Botswana'] }
    holidays[`${year}-07-01`] = { name: "Sir Seretse Khama Day", type: 'public', countries: ['Botswana'] }
    holidays[`${year}-07-15`] = { name: "President's Day", type: 'public', countries: ['Botswana'] }
    holidays[`${year}-07-16`] = { name: "President's Day", type: 'public', countries: ['Botswana'] }
    holidays[`${year}-09-30`] = { name: "Independence Day", type: 'public', countries: ['Botswana'] }
    holidays[`${year}-12-26`] = { name: "Boxing Day", type: 'public', countries: ['Botswana'] }
  }
  
  // Cultural holidays (Global - observed in multiple countries)
  if (selectedCountries.some(c => c !== 'Global')) {
    // Eid al-Fitr (end of Ramadan) - approximate dates
    if (year === 2025) {
      holidays[`${year}-03-30`] = { name: "Eid al-Fitr", type: 'cultural', countries: ['Global'] }
    } else if (year === 2026) {
      holidays[`${year}-03-20`] = { name: "Eid al-Fitr", type: 'cultural', countries: ['Global'] }
    } else if (year === 2027) {
      holidays[`${year}-03-09`] = { name: "Eid al-Fitr", type: 'cultural', countries: ['Global'] }
    }
    
    // Eid al-Adha - approximate dates
    if (year === 2025) {
      holidays[`${year}-06-06`] = { name: "Eid al-Adha", type: 'cultural', countries: ['Global'] }
    } else if (year === 2026) {
      holidays[`${year}-05-27`] = { name: "Eid al-Adha", type: 'cultural', countries: ['Global'] }
    } else if (year === 2027) {
      holidays[`${year}-05-16`] = { name: "Eid al-Adha", type: 'cultural', countries: ['Global'] }
    }
    
    // Diwali - approximate dates
    if (year === 2025) {
      holidays[`${year}-10-20`] = { name: "Diwali", type: 'cultural', countries: ['Global'] }
    } else if (year === 2026) {
      holidays[`${year}-11-08`] = { name: "Diwali", type: 'cultural', countries: ['Global'] }
    } else if (year === 2027) {
      holidays[`${year}-10-29`] = { name: "Diwali", type: 'cultural', countries: ['Global'] }
    }
  }
  
  return holidays
}

export default function OccupancyCalendar({ data }: OccupancyCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedCountries, setSelectedCountries] = useState<Country[]>(['Global', 'Zimbabwe', 'South Africa', 'Zambia', 'Namibia', 'Botswana'])

  // Create a map of occupancy data by date
  const occupancyMap = useMemo(() => {
    const map = new Map<string, DailyOccupancy>()
    data.forEach(day => {
      map.set(day.date, day)
    })
    return map
  }, [data])

  // Get gap periods
  const gapPeriods = useMemo(() => {
    const gaps = new Set<string>()
    data.forEach(day => {
      const available = TOTAL_ROOMS - day.total
      if (available > MIN_AVAILABLE_THRESHOLD) {
        gaps.add(day.date)
      }
    })
    return gaps
  }, [data])

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  // Get holidays for current year and selected countries
  const holidays = getHolidays(year, selectedCountries)

  const toggleCountry = (country: Country) => {
    setSelectedCountries(prev => 
      prev.includes(country)
        ? prev.filter(c => c !== country)
        : [...prev, country].sort()
    )
  }

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()
    
    const days: Array<{
      date: Date | null
      occupancy: DailyOccupancy | null
      isGap: boolean
      holiday: { name: string; type: 'public' | 'cultural'; countries: Country[] } | null
    }> = []

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push({ date: null, occupancy: null, isGap: false, holiday: null })
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day)
      // Format date string directly to avoid timezone issues with toISOString()
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      const occupancy = occupancyMap.get(dateStr) || null
      const isGap = gapPeriods.has(dateStr)
      const holiday = holidays[dateStr] || null

      days.push({
        date,
        occupancy,
        isGap,
        holiday
      })
    }

    return days
  }, [year, month, occupancyMap, gapPeriods, holidays])

  const getOccupancyColor = (occupancy: DailyOccupancy | null) => {
    if (!occupancy) return 'bg-gray-100'
    
    const available = TOTAL_ROOMS - occupancy.total
    const occupancyRate = occupancy.total / TOTAL_ROOMS
    
    if (available > MIN_AVAILABLE_THRESHOLD) {
      // Gap period - red/orange gradient
      return 'bg-gradient-to-br from-red-100 to-orange-100 border-2 border-red-300'
    } else if (occupancyRate >= 0.9) {
      // High occupancy (90%+) - dark green
      return 'bg-green-600 text-white'
    } else if (occupancyRate >= 0.7) {
      // Medium-high (70-90%) - light green
      return 'bg-green-400 text-white'
    } else if (occupancyRate >= 0.5) {
      // Medium (50-70%) - yellow
      return 'bg-yellow-300'
    } else {
      // Low (0-50%) - light yellow
      return 'bg-yellow-100'
    }
  }

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev)
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1)
      } else {
        newDate.setMonth(prev.getMonth() + 1)
      }
      return newDate
    })
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl shadow-sm border border-gray-200 p-3"
    >
      <div className="mb-2">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-1.5">
            <CalendarIcon className="h-4 w-4 text-primary-600" />
            <h3 className="text-base font-semibold text-gray-800">Occupancy Calendar</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigateMonth('prev')}
              className="p-1 rounded border border-gray-300 hover:bg-gray-50 transition-colors"
            >
              <ChevronLeft className="h-3 w-3" />
            </button>
            <span className="text-xs font-semibold text-gray-900 min-w-[100px] text-center">
              {monthNames[month]} {year}
            </span>
            <button
              onClick={() => navigateMonth('next')}
              className="p-1 rounded border border-gray-300 hover:bg-gray-50 transition-colors"
            >
              <ChevronRight className="h-3 w-3" />
            </button>
          </div>
        </div>
        
        {/* Country Filter */}
        <div className="mb-2">
          <label className="text-[10px] font-medium text-gray-700 mb-1 block">Show Holidays:</label>
          <div className="flex flex-wrap gap-1">
            {(['Global', 'South Africa', 'Zambia', 'Zimbabwe', 'Namibia', 'Botswana'] as Country[]).map(country => (
              <button
                key={country}
                onClick={() => toggleCountry(country)}
                className={`px-1.5 py-0.5 text-[10px] rounded border transition-colors ${
                  selectedCountries.includes(country)
                    ? 'bg-primary-600 text-white border-primary-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                {country}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="mb-2 p-1.5 bg-gray-50 rounded">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5 text-[10px]">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded border border-red-300 bg-gradient-to-br from-red-100 to-orange-100"></div>
            <span>Gap</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded bg-green-600"></div>
            <span>High</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded bg-yellow-300"></div>
            <span>Medium</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded border-2 border-purple-600"></div>
            <span>Holiday</span>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-0.5">
        {/* Day headers */}
        {dayNames.map(day => (
          <div key={day} className="py-0.5 text-center text-[10px] font-semibold text-gray-600">
            {day}
          </div>
        ))}

        {/* Calendar days */}
        {calendarDays.map((day, index) => {
          if (!day.date) {
            return <div key={index} className="h-[32px]"></div>
          }

          // Format date string directly to avoid timezone issues
          const dayYear = day.date.getFullYear()
          const dayMonth = day.date.getMonth() + 1
          const dayDay = day.date.getDate()
          const dateStr = `${dayYear}-${String(dayMonth).padStart(2, '0')}-${String(dayDay).padStart(2, '0')}`
          const dayNum = day.date.getDate()
          const today = new Date()
          const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
          const isToday = dateStr === todayStr

          return (
            <div
              key={index}
              className={`
                h-[32px] w-full rounded border transition-all flex items-center justify-center
                ${getOccupancyColor(day.occupancy)}
                ${isToday ? 'ring-0.5 ring-blue-500' : ''}
                ${day.holiday ? 'border-2 border-purple-600' : day.isGap ? 'border-red-300' : 'border-transparent'}
                ${day.occupancy ? 'cursor-pointer hover:shadow-sm' : 'opacity-50'}
              `}
              title={
                day.holiday
                  ? `${day.holiday.name} (${day.holiday.countries.join(', ')}) - Occupancy: ${day.occupancy?.total || 0}/${TOTAL_ROOMS}`
                  : day.occupancy
                  ? `Occupancy: ${day.occupancy.total}/${TOTAL_ROOMS} (Available: ${TOTAL_ROOMS - day.occupancy.total})`
                  : 'No data'
              }
            >
              <div className="flex flex-col items-center justify-center h-full w-full p-0.5">
                <span className={`text-[9px] font-semibold leading-none ${
                  day.occupancy && (day.occupancy.total / TOTAL_ROOMS) >= 0.7 ? 'text-white' : 'text-gray-900'
                }`}>
                  {dayNum}
                </span>
                {day.occupancy && (
                  <span className={`text-[7px] leading-none ${
                    day.occupancy.total / TOTAL_ROOMS >= 0.7 ? 'text-white' : 'text-gray-700'
                  }`}>
                    {day.occupancy.total}/{TOTAL_ROOMS}
                  </span>
                )}
                {day.holiday && (
                  <span className="text-[7px] leading-none">🎉</span>
                )}
                {day.isGap && !day.holiday && (
                  <span className="text-[6px] text-red-600 font-bold leading-none">G</span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Holiday/Event Info */}
      {Object.keys(holidays).some(date => {
        const [hYear, hMonth] = date.split('-').map(Number)
        return hYear === year && hMonth - 1 === month
      }) && (
        <div className="mt-2 p-1.5 bg-purple-50 border border-purple-200 rounded">
          <h4 className="text-[10px] font-semibold text-purple-900 mb-1">Events This Month:</h4>
          <div className="space-y-0.5">
            {Object.entries(holidays)
              .filter(([date]) => {
                const [hYear, hMonth] = date.split('-').map(Number)
                return hYear === year && hMonth - 1 === month
              })
              .map(([date, holiday]) => (
                <div key={date} className="text-[10px] text-purple-800">
                  <span className="font-medium">
                    {new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}:
                  </span>{' '}
                  {holiday.name} ({holiday.countries.join(', ')})
                </div>
              ))}
          </div>
        </div>
      )}
    </motion.div>
  )
}

