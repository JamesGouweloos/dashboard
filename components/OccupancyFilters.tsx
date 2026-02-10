'use client'

interface OccupancyFiltersProps {
  availableYears: number[]
  availableMonths: number[]
  selectedYears: number[]
  selectedMonths: number[]
  onYearToggle: (year: number) => void
  onMonthToggle: (month: number) => void
  onClearAll: () => void
}

export default function OccupancyFilters({
  availableYears,
  availableMonths,
  selectedYears,
  selectedMonths,
  onYearToggle,
  onMonthToggle,
  onClearAll
}: OccupancyFiltersProps) {
  const monthNames: { [key: number]: string } = {
    3: 'Mar',
    4: 'Apr',
    5: 'May',
    6: 'Jun',
    7: 'Jul',
    8: 'Aug',
    9: 'Sep',
    10: 'Oct',
    11: 'Nov'
  }

  const hasFilters = selectedYears.length < availableYears.length || selectedMonths.length < availableMonths.length

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Years Section */}
        <div>
          <div className="text-sm font-medium text-gray-700 mb-3">Years</div>
          <div className="flex flex-wrap gap-2">
            {availableYears.map(year => (
              <button
                key={year}
                onClick={() => onYearToggle(year)}
                className={`px-3 py-1.5 text-sm rounded border transition-colors ${
                  selectedYears.includes(year)
                    ? 'bg-primary-600 text-white border-primary-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                {year}
              </button>
            ))}
          </div>
        </div>

        {/* Months Section */}
        <div>
          <div className="text-sm font-medium text-gray-700 mb-3">Months</div>
          <div className="flex flex-wrap gap-2">
            {availableMonths.map(month => (
              <button
                key={month}
                onClick={() => onMonthToggle(month)}
                className={`px-3 py-1.5 text-sm rounded border transition-colors ${
                  selectedMonths.includes(month)
                    ? 'bg-primary-50 text-primary-700 border-primary-200'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                {monthNames[month] || `Month ${month}`}
              </button>
            ))}
          </div>
        </div>
      </div>

      {hasFilters && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <button
            onClick={onClearAll}
            className="px-4 py-2 text-sm rounded border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Clear All Filters
          </button>
        </div>
      )}
    </div>
  )
}

