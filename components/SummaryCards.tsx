'use client'

import { motion } from 'framer-motion'
import { DollarSign, Calendar, Moon, Users } from 'lucide-react'

interface SummaryData {
  total_bookings: number
  total_revenue: number
  total_payments: number
  total_outstanding: number
  total_bed_nights: number
  total_pax: number
  report_generated: string
}

export default function SummaryCards({ data }: { data: SummaryData }) {
  const cards = [
    {
      title: 'Total Revenue',
      value: `$${data.total_revenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      icon: DollarSign,
      color: 'bg-blue-500',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-700'
    },
    {
      title: 'Total Bookings',
      value: data.total_bookings.toString(),
      icon: Calendar,
      color: 'bg-green-500',
      bgColor: 'bg-green-50',
      textColor: 'text-green-700'
    },
    {
      title: 'Bed Nights',
      value: data.total_bed_nights.toString(),
      icon: Moon,
      color: 'bg-purple-500',
      bgColor: 'bg-purple-50',
      textColor: 'text-purple-700'
    },
    {
      title: 'Total Guests',
      value: data.total_pax.toString(),
      icon: Users,
      color: 'bg-orange-500',
      bgColor: 'bg-orange-50',
      textColor: 'text-orange-700'
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {cards.map((card, index) => {
        const Icon = card.icon
        return (
          <motion.div
            key={card.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`${card.bgColor} p-3 rounded-lg`}>
                <Icon className={`h-6 w-6 ${card.textColor}`} />
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">{card.title}</p>
                <p className="text-2xl font-bold text-gray-900">{card.value}</p>
              </div>
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}

