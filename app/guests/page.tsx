'use client'

import { useEffect, useState, useMemo } from 'react'
import DashboardLayout from '@/components/DashboardLayout'
import { useDataRefresh } from '@/lib/useDataRefresh'
import { Users, Search, Download, Filter, UserPlus } from 'lucide-react'
import GuestCountryHeatmap from '@/components/GuestCountryHeatmap'
import CustomerProfilesByCountry from '@/components/CustomerProfilesByCountry'
import AddGuestModal from '@/components/AddGuestModal'

interface GuestData {
  Year: number | string
  Month: number | string
  'Guest No.': string
  'BOOKING NAME': string
  SURNAME: string
  'FIRST NAME': string
  TITLE: string
  'DATE OF ARRIVAL': string
  'DATE OF DEPARTURE': string
  'BED NIGHTS': number | string
  DOB: string
  'COUNTRY OF RESIDENCE': string
  'NATIONALITY AS PER PASSPORT': string
  'PASSPORT NUMBER': string
  'EMAIL ADDRESS': string
  id?: string
}

export default function GuestsPage() {
  const [data, setData] = useState<GuestData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedYears, setSelectedYears] = useState<number[]>([])
  const [selectedMonth, setSelectedMonth] = useState<string>('All')
  const [selectedCountry, setSelectedCountry] = useState<string>('All')
  const [selectedNationality, setSelectedNationality] = useState<string>('All')
  const [sortField, setSortField] = useState<keyof GuestData | null>(null)
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [showAddGuestModal, setShowAddGuestModal] = useState(false)
  const refreshKey = useDataRefresh()

  const fetchData = async () => {
    try {
      setLoading(true)
      // Build query parameters
      const params = new URLSearchParams()
      if (selectedYears.length > 0) {
        params.append('years', selectedYears.join(','))
      }
      if (selectedMonth !== 'All') {
        params.append('month', selectedMonth)
      }
      if (selectedCountry !== 'All') {
        params.append('country', selectedCountry)
      }
      if (selectedNationality !== 'All') {
        params.append('nationality', selectedNationality)
      }
      if (searchTerm) {
        params.append('search', searchTerm)
      }
      params.append('pageSize', '2500') // Load more for now, can implement pagination later
      
      const response = await fetch(`/api/guests?${params.toString()}`, { cache: 'no-store' })
      if (!response.ok) throw new Error('Failed to fetch guest data')
      const jsonData = await response.json()
      setData(jsonData.guests || jsonData || [])
      setLoading(false)
    } catch (err: any) {
      console.error('Error fetching guest data:', err)
      setError(err.message)
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [refreshKey, selectedYears, selectedMonth, selectedCountry, selectedNationality, searchTerm])

  // Extract unique values for filters
  const availableYears = useMemo(() => {
    const years = new Set<number>()
    data.forEach(guest => {
      const year = parseInt(String(guest.Year || ''))
      if (!isNaN(year)) years.add(year)
    })
    return Array.from(years).sort((a, b) => a - b)
  }, [data])

  // Initialize selectedYears to all years if empty
  useEffect(() => {
    if (data.length > 0 && selectedYears.length === 0 && availableYears.length > 0) {
      setSelectedYears([...availableYears])
    }
  }, [data, availableYears, selectedYears.length])

  const availableMonths = useMemo(() => {
    const months = new Set<string>()
    data.forEach(guest => {
      const month = String(guest.Month || '')
      if (month) months.add(month)
    })
    return Array.from(months).sort((a, b) => parseInt(a) - parseInt(b))
  }, [data])

  const availableCountries = useMemo(() => {
    const countries = new Set<string>()
    data.forEach(guest => {
      const country = guest['COUNTRY OF RESIDENCE'] || ''
      if (country) countries.add(country)
    })
    return Array.from(countries).sort()
  }, [data])

  const availableNationalities = useMemo(() => {
    const nationalities = new Set<string>()
    data.forEach(guest => {
      const nationality = guest['NATIONALITY AS PER PASSPORT'] || ''
      if (nationality) nationalities.add(nationality)
    })
    return Array.from(nationalities).sort()
  }, [data])

  // Filter and sort data
  const filteredAndSortedData = useMemo(() => {
    let filtered = [...data]

    // Apply search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      filtered = filtered.filter(guest => {
        return (
          (guest.SURNAME?.toLowerCase().includes(searchLower)) ||
          (guest['FIRST NAME']?.toLowerCase().includes(searchLower)) ||
          (guest['BOOKING NAME']?.toLowerCase().includes(searchLower)) ||
          (guest['EMAIL ADDRESS']?.toLowerCase().includes(searchLower)) ||
          (guest['PASSPORT NUMBER']?.toLowerCase().includes(searchLower)) ||
          (guest['COUNTRY OF RESIDENCE']?.toLowerCase().includes(searchLower)) ||
          (guest['NATIONALITY AS PER PASSPORT']?.toLowerCase().includes(searchLower))
        )
      })
    }

    // Apply year filter
    if (selectedYears.length > 0) {
      filtered = filtered.filter(guest => {
        const guestYear = parseInt(String(guest.Year || ''))
        return !isNaN(guestYear) && selectedYears.includes(guestYear)
      })
    }

    // Apply month filter
    if (selectedMonth !== 'All') {
      filtered = filtered.filter(guest => String(guest.Month) === selectedMonth)
    }

    // Apply country filter
    if (selectedCountry !== 'All') {
      filtered = filtered.filter(guest => guest['COUNTRY OF RESIDENCE'] === selectedCountry)
    }

    // Apply nationality filter
    if (selectedNationality !== 'All') {
      filtered = filtered.filter(guest => guest['NATIONALITY AS PER PASSPORT'] === selectedNationality)
    }

    // Apply sorting
    if (sortField) {
      filtered.sort((a, b) => {
        const aVal = a[sortField]
        const bVal = b[sortField]
        
        if (aVal === null || aVal === undefined) return 1
        if (bVal === null || bVal === undefined) return -1

        let comparison = 0
        if (typeof aVal === 'string' && typeof bVal === 'string') {
          comparison = aVal.localeCompare(bVal)
        } else if (typeof aVal === 'number' && typeof bVal === 'number') {
          comparison = aVal - bVal
        } else {
          comparison = String(aVal).localeCompare(String(bVal))
        }

        return sortOrder === 'asc' ? comparison : -comparison
      })
    }

    return filtered
  }, [data, searchTerm, selectedYears, selectedMonth, selectedCountry, selectedNationality, sortField, sortOrder])

  // Statistics
  const statistics = useMemo(() => {
    const totalGuests = filteredAndSortedData.length
    const totalBedNights = filteredAndSortedData.reduce((sum, guest) => {
      const bedNights = typeof guest['BED NIGHTS'] === 'number' 
        ? guest['BED NIGHTS'] 
        : parseFloat(String(guest['BED NIGHTS'] || 0)) || 0
      return sum + bedNights
    }, 0)
    const uniqueCountries = new Set(filteredAndSortedData.map(g => g['COUNTRY OF RESIDENCE']).filter(Boolean)).size
    const uniqueNationalities = new Set(filteredAndSortedData.map(g => g['NATIONALITY AS PER PASSPORT']).filter(Boolean)).size

    return {
      totalGuests,
      totalBedNights,
      uniqueCountries,
      uniqueNationalities,
      avgBedNights: totalGuests > 0 ? (totalBedNights / totalGuests).toFixed(1) : '0'
    }
  }, [filteredAndSortedData])

  const handleSort = (field: keyof GuestData) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('asc')
    }
  }

  const exportToCSV = () => {
    const headers = [
      'Year', 'Month', 'Guest No.', 'BOOKING NAME', 'SURNAME', 'FIRST NAME', 'TITLE',
      'DATE OF ARRIVAL', 'DATE OF DEPARTURE', 'BED NIGHTS', 'DOB',
      'COUNTRY OF RESIDENCE', 'NATIONALITY AS PER PASSPORT', 'PASSPORT NUMBER', 'EMAIL ADDRESS'
    ]

    const csvContent = [
      headers.join(','),
      ...filteredAndSortedData.map(guest => [
        guest.Year || '',
        guest.Month || '',
        guest['Guest No.'] || '',
        `"${(guest['BOOKING NAME'] || '').replace(/"/g, '""')}"`,
        `"${(guest.SURNAME || '').replace(/"/g, '""')}"`,
        `"${(guest['FIRST NAME'] || '').replace(/"/g, '""')}"`,
        `"${(guest.TITLE || '').replace(/"/g, '""')}"`,
        guest['DATE OF ARRIVAL'] || '',
        guest['DATE OF DEPARTURE'] || '',
        guest['BED NIGHTS'] || '',
        guest.DOB || '',
        `"${(guest['COUNTRY OF RESIDENCE'] || '').replace(/"/g, '""')}"`,
        `"${(guest['NATIONALITY AS PER PASSPORT'] || '').replace(/"/g, '""')}"`,
        `"${(guest['PASSPORT NUMBER'] || '').replace(/"/g, '""')}"`,
        `"${(guest['EMAIL ADDRESS'] || '').replace(/"/g, '""')}"`
      ].join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `past_guests_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const formatDate = (dateStr: string) => {
    if (!dateStr) return ''
    try {
      const date = new Date(dateStr)
      return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
    } catch {
      return dateStr
    }
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading guest data...</p>
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
            <p className="text-red-600 mb-4">Error loading guest data: {error}</p>
            <button
              onClick={fetchData}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
            >
              Retry
            </button>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Past Guest Analysis</h1>
          <p className="text-gray-600">
            Comprehensive analysis and management of past guest information
          </p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Guests</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{statistics.totalGuests.toLocaleString()}</p>
              </div>
              <Users className="h-8 w-8 text-primary-600" />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Bed Nights</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{statistics.totalBedNights.toLocaleString()}</p>
              </div>
              <Users className="h-8 w-8 text-primary-600" />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Countries</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{statistics.uniqueCountries}</p>
              </div>
              <Users className="h-8 w-8 text-primary-600" />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Avg Bed Nights</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{statistics.avgBedNights}</p>
              </div>
              <Users className="h-8 w-8 text-primary-600" />
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by name, email, passport, country..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
            </div>

            <button
              onClick={() => setShowAddGuestModal(true)}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center space-x-2"
            >
              <UserPlus className="h-4 w-4" />
              <span>Add Guest</span>
            </button>

            <button
              onClick={exportToCSV}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center space-x-2"
            >
              <Download className="h-4 w-4" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Add Guest Modal */}
        <AddGuestModal
          isOpen={showAddGuestModal}
          onClose={() => setShowAddGuestModal(false)}
          onGuestAdded={() => {
            fetchData()
          }}
        />

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center space-x-2 mb-4">
            <Filter className="h-5 w-5 text-primary-600" />
            <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
          </div>

          <div className="space-y-4">
            {/* Year Filter - Multiple Selection */}
            <div className="flex items-center space-x-3">
              <span className="text-sm font-medium text-gray-700 w-20">Years:</span>
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
                        isSelected ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
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

            {/* Other Filters */}
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium text-gray-700">Month:</label>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="All">All Months</option>
                  {availableMonths.map(month => (
                    <option key={month} value={month}>
                      {new Date(2000, parseInt(month) - 1, 1).toLocaleString('en-US', { month: 'long' })}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium text-gray-700">Country:</label>
                <select
                  value={selectedCountry}
                  onChange={(e) => setSelectedCountry(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="All">All Countries</option>
                  {availableCountries.map(country => (
                    <option key={country} value={country}>{country}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium text-gray-700">Nationality:</label>
                <select
                  value={selectedNationality}
                  onChange={(e) => setSelectedNationality(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="All">All Nationalities</option>
                  {availableNationalities.map(nationality => (
                    <option key={nationality} value={nationality}>{nationality}</option>
                  ))}
                </select>
              </div>
            </div>

            <p className="text-sm text-gray-600 mt-4">
              Showing {filteredAndSortedData.length} of {data.length} guests
            </p>
          </div>
        </div>

        {/* Country Heatmap */}
        {data.length > 0 && (
          <GuestCountryHeatmap data={filteredAndSortedData} />
        )}

        {/* Customer Profiles */}
        {data.length > 0 && (
          <CustomerProfilesByCountry data={filteredAndSortedData} />
        )}

        {/* Guest Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="max-h-[600px] overflow-y-auto overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr>
                  <th 
                    className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('Year')}
                  >
                    Year {sortField === 'Year' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th 
                    className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('Month')}
                  >
                    Month {sortField === 'Month' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Guest No.
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Booking Name
                  </th>
                  <th 
                    className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('SURNAME')}
                  >
                    Surname {sortField === 'SURNAME' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th 
                    className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('FIRST NAME')}
                  >
                    First Name {sortField === 'FIRST NAME' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Title
                  </th>
                  <th 
                    className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('DATE OF ARRIVAL')}
                  >
                    Arrival {sortField === 'DATE OF ARRIVAL' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th 
                    className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('DATE OF DEPARTURE')}
                  >
                    Departure {sortField === 'DATE OF DEPARTURE' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th 
                    className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('BED NIGHTS')}
                  >
                    Bed Nights {sortField === 'BED NIGHTS' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    DOB
                  </th>
                  <th 
                    className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('COUNTRY OF RESIDENCE')}
                  >
                    Country {sortField === 'COUNTRY OF RESIDENCE' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th 
                    className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('NATIONALITY AS PER PASSPORT')}
                  >
                    Nationality {sortField === 'NATIONALITY AS PER PASSPORT' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Passport
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Email
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredAndSortedData.length === 0 ? (
                  <tr>
                    <td colSpan={15} className="px-4 py-8 text-center text-gray-500">
                      No guest data found
                    </td>
                  </tr>
                ) : (
                  filteredAndSortedData.map((guest) => (
                    <tr key={guest.id || `${guest.Year}-${guest.Month}-${guest['Guest No.']}-${guest['DATE OF ARRIVAL']}`} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{guest.Year}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {guest.Month ? new Date(2000, parseInt(String(guest.Month)) - 1, 1).toLocaleString('en-US', { month: 'short' }) : ''}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{guest['Guest No.']}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{guest['BOOKING NAME']}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{guest.SURNAME}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{guest['FIRST NAME']}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{guest.TITLE}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{formatDate(guest['DATE OF ARRIVAL'])}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{formatDate(guest['DATE OF DEPARTURE'])}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-right">{guest['BED NIGHTS']}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{formatDate(guest.DOB)}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{guest['COUNTRY OF RESIDENCE']}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{guest['NATIONALITY AS PER PASSPORT']}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 font-mono text-xs">{guest['PASSPORT NUMBER']}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{guest['EMAIL ADDRESS']}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

