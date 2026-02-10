'use client'

import { motion } from 'framer-motion'
import { TrendingUp, Calendar, Moon, DollarSign, Building2, User } from 'lucide-react'

interface SourceData {
  [key: string]: {
    count: number
    revenue: number
    bed_nights: number
    agency?: { count: number; revenue: number; bed_nights: number }
    direct?: { count: number; revenue: number; bed_nights: number }
  }
}

interface AgencyDirectData {
  [key: string]: {
    agency: { count: number; revenue: number; bed_nights: number }
    direct: { count: number; revenue: number; bed_nights: number }
  }
}

export default function SourcesCardGrid({ data, agencyDirectData }: { data: SourceData; agencyDirectData?: AgencyDirectData }) {
  if (!data || typeof data !== 'object') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
      >
        <div className="flex items-center space-x-2 mb-6">
          <Calendar className="h-5 w-5 text-primary-600" />
          <h2 className="text-xl font-semibold text-gray-900">Source Details</h2>
        </div>
        <div className="flex items-center justify-center h-[400px] text-gray-500">
          No data available
        </div>
      </motion.div>
    )
  }

  const totalRevenue = Object.values(data).reduce((sum, val) => sum + val.revenue, 0)
  const totalBookings = Object.values(data).reduce((sum, val) => sum + val.count, 0)

  const sourceData = Object.entries(data)
    .map(([source, values]) => {
      const agencyInfo = agencyDirectData?.[source]?.agency || values.agency || { count: 0, revenue: 0, bed_nights: 0 }
      const directInfo = agencyDirectData?.[source]?.direct || values.direct || { count: values.count || 0, revenue: values.revenue || 0, bed_nights: values.bed_nights || 0 }
      
      return {
        source,
        revenue: values.revenue,
        bookings: values.count,
        bedNights: values.bed_nights,
        revenueShare: ((values.revenue / totalRevenue) * 100),
        bookingShare: ((values.count / totalBookings) * 100),
        avgPerBooking: values.count > 0 ? values.revenue / values.count : 0,
        avgBedNights: values.count > 0 ? values.bed_nights / values.count : 0,
        // Agency/Direct breakdown
        agencyRevenue: agencyInfo.revenue || 0,
        directRevenue: directInfo.revenue || 0,
        agencyBookings: agencyInfo.count || 0,
        directBookings: directInfo.count || 0,
        agencyBedNights: agencyInfo.bed_nights || 0,
        directBedNights: directInfo.bed_nights || 0,
        agencyRevenueShare: values.revenue > 0 ? ((agencyInfo.revenue || 0) / values.revenue) * 100 : 0,
        directRevenueShare: values.revenue > 0 ? ((directInfo.revenue || 0) / values.revenue) * 100 : 0
      }
    })
    .sort((a, b) => b.revenue - a.revenue)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
    >
      <div className="flex items-center space-x-2 mb-6">
        <Calendar className="h-5 w-5 text-primary-600" />
        <h2 className="text-xl font-semibold text-gray-900">Source Performance Cards with Agency/Direct Breakdown</h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[600px] overflow-y-auto pr-2">
        {sourceData.map((source, index) => (
          <motion.div
            key={source.source}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05 }}
            className="bg-gradient-to-br from-white to-gray-50 border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
          >
            <h3 className="font-semibold text-gray-900 mb-3 text-sm line-clamp-2">
              {source.source}
            </h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <DollarSign className="h-4 w-4 text-primary-600" />
                  <span className="text-xs text-gray-600">Revenue</span>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900 text-sm">${source.revenue.toLocaleString()}</p>
                  <p className="text-xs text-gray-500">{source.revenueShare.toFixed(1)}%</p>
                </div>
              </div>
              
              {/* Agency/Direct Revenue Breakdown */}
              <div className="pl-4 border-l-2 border-blue-400 space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-1">
                    <Building2 className="h-3 w-3 text-blue-600" />
                    <span className="text-gray-600">Agency</span>
                  </div>
                  <div className="text-right">
                    <span className="font-medium text-blue-600">${source.agencyRevenue.toLocaleString()}</span>
                    <span className="text-gray-500 ml-1">({source.agencyRevenueShare.toFixed(0)}%)</span>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-1">
                    <User className="h-3 w-3 text-green-600" />
                    <span className="text-gray-600">Direct</span>
                  </div>
                  <div className="text-right">
                    <span className="font-medium text-green-600">${source.directRevenue.toLocaleString()}</span>
                    <span className="text-gray-500 ml-1">({source.directRevenueShare.toFixed(0)}%)</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                  <span className="text-xs text-gray-600">Bookings</span>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900 text-sm">{source.bookings}</p>
                  <p className="text-xs text-gray-500">{source.bookingShare.toFixed(1)}%</p>
                </div>
              </div>
              
              {/* Agency/Direct Bookings Breakdown */}
              <div className="pl-4 border-l-2 border-blue-400 space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-600">Agency:</span>
                  <span className="font-medium text-blue-600">{source.agencyBookings}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-600">Direct:</span>
                  <span className="font-medium text-green-600">{source.directBookings}</span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Moon className="h-4 w-4 text-purple-600" />
                  <span className="text-xs text-gray-600">Bed Nights</span>
                </div>
                <p className="font-semibold text-gray-900 text-sm">{source.bedNights}</p>
              </div>
              
              <div className="pt-2 mt-2 border-t border-gray-200 flex justify-between text-xs">
                <span className="text-gray-500">Avg/Booking:</span>
                <span className="font-medium text-gray-700">${source.avgPerBooking.toFixed(0)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Avg Nights:</span>
                <span className="font-medium text-gray-700">{source.avgBedNights.toFixed(1)}</span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  )
}
