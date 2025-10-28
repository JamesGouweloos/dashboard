'use client'

import { Filter } from 'lucide-react'

interface DashboardFiltersProps {
  statusFilter: string
  classFilter: string
  onStatusFilterChange: (value: string) => void
  onClassFilterChange: (value: string) => void
}

export default function DashboardFilters({
  statusFilter,
  classFilter,
  onStatusFilterChange,
  onClassFilterChange
}: DashboardFiltersProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Filter className="h-5 w-5 text-primary-600" />
          <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
        </div>

        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">Status:</label>
            <select
              value={statusFilter}
              onChange={(e) => onStatusFilterChange(e.target.value)}
              className="px-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="All">All</option>
              <option value="Confirmed">Confirmed</option>
              <option value="Provisional">Provisional</option>
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">Class:</label>
            <select
              value={classFilter}
              onChange={(e) => onClassFilterChange(e.target.value)}
              className="px-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="All">All</option>
              <option value="Income Generating">Income Generating</option>
              <option value="Non-Income Generating">Non-Income Generating</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  )
}

