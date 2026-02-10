'use client'

import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Users, Calendar, Moon, TrendingUp, Globe } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface CustomerProfilesByCountryProps {
  data: any[]
}

interface CountryProfile {
  country: string
  guestCount: number
  totalBedNights: number
  avgBedNights: number
  peakMonth: string
  peakMonthCount: number
  monthlyDistribution: Record<number, number>
  nationalities: Record<string, number>
  avgGroupSize: number
  ages: number[]
  avgAge: number
  ageDistribution: {
    '0-17': number
    '18-30': number
    '31-45': number
    '46-60': number
    '61+': number
  }
}

export default function CustomerProfilesByCountry({ data }: CustomerProfilesByCountryProps) {
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null)

  const calculateAge = (dobString: string): number | null => {
    if (!dobString) return null
    try {
      const dob = new Date(dobString)
      if (isNaN(dob.getTime())) return null
      
      const today = new Date()
      let age = today.getFullYear() - dob.getFullYear()
      const monthDiff = today.getMonth() - dob.getMonth()
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
        age--
      }
      return age > 0 && age < 120 ? age : null // Validate reasonable age
    } catch {
      return null
    }
  }

  const countryProfiles = useMemo(() => {
    const profiles: Record<string, CountryProfile> = {}

    data.forEach(guest => {
      const country = guest['COUNTRY OF RESIDENCE'] || 'Unknown'
      const bedNights = typeof guest['BED NIGHTS'] === 'number' 
        ? guest['BED NIGHTS'] 
        : parseFloat(String(guest['BED NIGHTS'] || 0)) || 0
      const month = parseInt(String(guest.Month || 0))
      const nationality = guest['NATIONALITY AS PER PASSPORT'] || 'Unknown'
      const age = calculateAge(guest.DOB)

      if (!profiles[country]) {
        profiles[country] = {
          country,
          guestCount: 0,
          totalBedNights: 0,
          avgBedNights: 0,
          peakMonth: '',
          peakMonthCount: 0,
          monthlyDistribution: {},
          nationalities: {},
          avgGroupSize: 0,
          ages: [],
          avgAge: 0,
          ageDistribution: {
            '0-17': 0,
            '18-30': 0,
            '31-45': 0,
            '46-60': 0,
            '61+': 0
          }
        }
      }

      profiles[country].guestCount += 1
      profiles[country].totalBedNights += bedNights

      // Track ages
      if (age !== null) {
        profiles[country].ages.push(age)
        
        // Categorize age
        if (age <= 17) profiles[country].ageDistribution['0-17'] += 1
        else if (age <= 30) profiles[country].ageDistribution['18-30'] += 1
        else if (age <= 45) profiles[country].ageDistribution['31-45'] += 1
        else if (age <= 60) profiles[country].ageDistribution['46-60'] += 1
        else profiles[country].ageDistribution['61+'] += 1
      }

      // Track monthly distribution
      if (month >= 1 && month <= 12) {
        if (!profiles[country].monthlyDistribution[month]) {
          profiles[country].monthlyDistribution[month] = 0
        }
        profiles[country].monthlyDistribution[month] += 1
      }

      // Track nationalities
      if (!profiles[country].nationalities[nationality]) {
        profiles[country].nationalities[nationality] = 0
      }
      profiles[country].nationalities[nationality] += 1
    })

    // Calculate derived metrics
    Object.values(profiles).forEach(profile => {
      profile.avgBedNights = profile.guestCount > 0 ? profile.totalBedNights / profile.guestCount : 0

      // Find peak month
      let maxMonthCount = 0
      let peakMonth = 0
      Object.entries(profile.monthlyDistribution).forEach(([month, count]) => {
        if (count > maxMonthCount) {
          maxMonthCount = count
          peakMonth = parseInt(month)
        }
      })
      profile.peakMonth = peakMonth > 0 
        ? new Date(2000, peakMonth - 1, 1).toLocaleString('en-US', { month: 'long' })
        : 'N/A'
      profile.peakMonthCount = maxMonthCount
    })

    return Object.values(profiles).sort((a, b) => b.guestCount - a.guestCount)
  }, [data])

  // Calculate overall profile for all data (when no country selected)
  const overallProfile = useMemo(() => {
    if (data.length === 0) return null

    const profile: CountryProfile = {
      country: 'All Countries',
      guestCount: data.length,
      totalBedNights: 0,
      avgBedNights: 0,
      peakMonth: '',
      peakMonthCount: 0,
      monthlyDistribution: {},
      nationalities: {},
      avgGroupSize: 0,
      ages: [],
      avgAge: 0,
      ageDistribution: {
        '0-17': 0,
        '18-30': 0,
        '31-45': 0,
        '46-60': 0,
        '61+': 0
      }
    }

    data.forEach(guest => {
      const bedNights = typeof guest['BED NIGHTS'] === 'number' 
        ? guest['BED NIGHTS'] 
        : parseFloat(String(guest['BED NIGHTS'] || 0)) || 0
      const month = parseInt(String(guest.Month || 0))
      const nationality = guest['NATIONALITY AS PER PASSPORT'] || 'Unknown'
      const age = calculateAge(guest.DOB)

      profile.totalBedNights += bedNights

      if (age !== null) {
        profile.ages.push(age)
        if (age <= 17) profile.ageDistribution['0-17'] += 1
        else if (age <= 30) profile.ageDistribution['18-30'] += 1
        else if (age <= 45) profile.ageDistribution['31-45'] += 1
        else if (age <= 60) profile.ageDistribution['46-60'] += 1
        else profile.ageDistribution['61+'] += 1
      }

      if (month >= 1 && month <= 12) {
        if (!profile.monthlyDistribution[month]) {
          profile.monthlyDistribution[month] = 0
        }
        profile.monthlyDistribution[month] += 1
      }

      if (!profile.nationalities[nationality]) {
        profile.nationalities[nationality] = 0
      }
      profile.nationalities[nationality] += 1
    })

    profile.avgBedNights = profile.guestCount > 0 ? profile.totalBedNights / profile.guestCount : 0

    if (profile.ages.length > 0) {
      const totalAge = profile.ages.reduce((sum, age) => sum + age, 0)
      profile.avgAge = totalAge / profile.ages.length
    }

    // Find peak month
    let maxMonthCount = 0
    let peakMonth = 0
    Object.entries(profile.monthlyDistribution).forEach(([month, count]) => {
      if (count > maxMonthCount) {
        maxMonthCount = count
        peakMonth = parseInt(month)
      }
    })
    profile.peakMonth = peakMonth > 0 
      ? new Date(2000, peakMonth - 1, 1).toLocaleString('en-US', { month: 'long' })
      : 'N/A'
    profile.peakMonthCount = maxMonthCount

    return profile
  }, [data])

  const selectedProfile = useMemo(() => {
    if (!selectedCountry) return overallProfile
    return countryProfiles.find(p => p.country === selectedCountry) || null
  }, [selectedCountry, countryProfiles, overallProfile])

  const selectedCountryMonthlyData = useMemo(() => {
    if (!selectedProfile) return []
    return Array.from({ length: 12 }, (_, i) => ({
      month: new Date(2000, i, 1).toLocaleString('en-US', { month: 'short' }),
      guests: selectedProfile.monthlyDistribution[i + 1] || 0
    }))
  }, [selectedProfile])

  const topNationalities = useMemo(() => {
    if (!selectedProfile) return []
    return Object.entries(selectedProfile.nationalities)
      .map(([nationality, count]) => ({ nationality, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
  }, [selectedProfile])

  const ageDistributionData = useMemo(() => {
    if (!selectedProfile) return []
    return [
      { ageGroup: '0-17', count: selectedProfile.ageDistribution['0-17'] },
      { ageGroup: '18-30', count: selectedProfile.ageDistribution['18-30'] },
      { ageGroup: '31-45', count: selectedProfile.ageDistribution['31-45'] },
      { ageGroup: '46-60', count: selectedProfile.ageDistribution['46-60'] },
      { ageGroup: '61+', count: selectedProfile.ageDistribution['61+'] }
    ]
  }, [selectedProfile])

  const dominantAgeGroup = useMemo(() => {
    if (!selectedProfile) return null
    const sorted = ageDistributionData.sort((a, b) => b.count - a.count)
    return sorted[0]?.ageGroup || null
  }, [selectedProfile, ageDistributionData])

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-2">
            <Globe className="h-5 w-5 text-primary-600" />
            <h2 className="text-xl font-semibold text-gray-900">Customer Profiles by Country</h2>
          </div>
        </div>

        {/* Country Selection */}
        <div className="mb-6">
          <label className="text-sm font-medium text-gray-700 mb-2 block">Select a country to view detailed profile:</label>
          <select
            value={selectedCountry || ''}
            onChange={(e) => setSelectedCountry(e.target.value || null)}
            className="w-full md:w-96 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="">Select a country...</option>
            {countryProfiles.map(profile => (
              <option key={profile.country} value={profile.country}>
                {profile.country} ({profile.guestCount} guests)
              </option>
            ))}
          </select>
        </div>

        {/* Country Profile Details */}
        {selectedProfile && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900">
              {selectedProfile.country === 'All Countries' 
                ? 'Overall Customer Profile' 
                : `Customer Profile: ${selectedProfile.country}`}
            </h3>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-blue-700 font-medium">Total Guests</p>
                    <p className="text-2xl font-bold text-blue-900 mt-1">
                      {selectedProfile.guestCount.toLocaleString()}
                    </p>
                  </div>
                  <Users className="h-8 w-8 text-blue-600" />
                </div>
              </div>

              <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-green-700 font-medium">Total Bed Nights</p>
                    <p className="text-2xl font-bold text-green-900 mt-1">
                      {selectedProfile.totalBedNights.toLocaleString()}
                    </p>
                  </div>
                  <Moon className="h-8 w-8 text-green-600" />
                </div>
              </div>

              <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-purple-700 font-medium">Avg Stay Duration</p>
                    <p className="text-2xl font-bold text-purple-900 mt-1">
                      {selectedProfile.avgBedNights.toFixed(1)}
                    </p>
                    <p className="text-xs text-purple-600">nights per visit</p>
                  </div>
                  <Calendar className="h-8 w-8 text-purple-600" />
                </div>
              </div>

              <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-orange-700 font-medium">Peak Travel Month</p>
                    <p className="text-2xl font-bold text-orange-900 mt-1">
                      {selectedProfile.peakMonth}
                    </p>
                    <p className="text-xs text-orange-600">{selectedProfile.peakMonthCount} guests</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-orange-600" />
                </div>
              </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Monthly Distribution Chart */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-4">Monthly Guest Distribution</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={selectedCountryMonthlyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis 
                      dataKey="month" 
                      stroke="#6b7280"
                      tick={{ fill: '#6b7280', fontSize: 11 }}
                    />
                    <YAxis 
                      stroke="#6b7280"
                      tick={{ fill: '#6b7280', fontSize: 11 }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                      }}
                    />
                    <Bar dataKey="guests" fill="#3b82f6" name="Guests" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Age Distribution Chart */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-4">Age Distribution</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={ageDistributionData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis 
                      dataKey="ageGroup" 
                      stroke="#6b7280"
                      tick={{ fill: '#6b7280', fontSize: 11 }}
                    />
                    <YAxis 
                      stroke="#6b7280"
                      tick={{ fill: '#6b7280', fontSize: 11 }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                      }}
                    />
                    <Bar dataKey="count" fill="#6366f1" name="Guests" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Top Nationalities */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-4">Top Nationalities</h3>
                <div className="space-y-3">
                  {topNationalities.map((nat, index) => {
                    const percentage = selectedProfile.guestCount > 0 
                      ? (nat.count / selectedProfile.guestCount * 100).toFixed(1) 
                      : '0'
                    return (
                      <div key={nat.nationality} className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-medium text-gray-900">
                              {index + 1}. {nat.nationality}
                            </span>
                          </div>
                          <div className="mt-1 bg-gray-200 rounded-full h-2 overflow-hidden">
                            <div 
                              className="bg-primary-600 h-full rounded-full"
                              style={{ width: `${percentage}%` }}
                            ></div>
                          </div>
                        </div>
                        <div className="ml-4 text-right">
                          <p className="text-sm font-semibold text-gray-900">{nat.count}</p>
                          <p className="text-xs text-gray-500">{percentage}%</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Marketing Insights */}
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6 border border-blue-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Marketing Insights</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-medium text-gray-700 mb-2">🎯 Target Audience</p>
                  <ul className="space-y-1 text-gray-600">
                    <li>• Primary market: {selectedProfile.country}</li>
                    <li>• Guest volume: {selectedProfile.guestCount} visitors</li>
                    <li>• Average stay: {selectedProfile.avgBedNights.toFixed(1)} nights</li>
                    <li>• Average age: {selectedProfile.avgAge > 0 ? `${selectedProfile.avgAge.toFixed(1)} years` : 'N/A'}</li>
                    <li>• Dominant age group: {dominantAgeGroup || 'N/A'}</li>
                  </ul>
                </div>
                <div>
                  <p className="font-medium text-gray-700 mb-2">📅 Seasonal Strategy</p>
                  <ul className="space-y-1 text-gray-600">
                    <li>• Peak season: {selectedProfile.peakMonth}</li>
                    <li>• Peak volume: {selectedProfile.peakMonthCount} guests</li>
                    <li>• Plan campaigns for {selectedProfile.peakMonth}</li>
                  </ul>
                </div>
                <div>
                  <p className="font-medium text-gray-700 mb-2">💼 Value Proposition</p>
                  <ul className="space-y-1 text-gray-600">
                    <li>• {selectedProfile.avgBedNights > 5 ? 'Extended stay packages' : 'Short break deals'}</li>
                    <li>• {selectedProfile.peakMonthCount > 10 ? 'High-demand market' : 'Growth opportunity'}</li>
                    <li>• {selectedProfile.avgAge > 0 && selectedProfile.avgAge < 40 ? 'Adventure-focused marketing' : selectedProfile.avgAge >= 40 ? 'Luxury & relaxation focus' : 'Diverse messaging'}</li>
                  </ul>
                </div>
                <div>
                  <p className="font-medium text-gray-700 mb-2">🌍 Cultural Considerations</p>
                  <ul className="space-y-1 text-gray-600">
                    {topNationalities.slice(0, 3).map(nat => (
                      <li key={nat.nationality}>• {nat.nationality}: {nat.count} guests</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

      </motion.div>
    </div>
  )
}

