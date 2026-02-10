'use client'

import { motion } from 'framer-motion'
import { Calendar, Users, CheckCircle, Clock } from 'lucide-react'

interface OccupancySummary {
  total_occupancy: number
  total_confirmed: number
  total_provisional: number
  average_daily_occupancy: number
  date_range: {
    start: string
    end: string
    total_days: number
  }
}

interface OccupancySummaryCardsProps {
  summary: OccupancySummary
}

export default function OccupancySummaryCards({ summary }: OccupancySummaryCardsProps) {
  const cards = [
    {
      title: 'Total Occupancy',
      value: summary.total_occupancy.toLocaleString(),
      subtitle: 'Over entire period',
      icon: Users,
      color: 'bg-blue-500',
      textColor: 'text-blue-600'
    },
    {
      title: 'Confirmed',
      value: summary.total_confirmed.toLocaleString(),
      subtitle: 'Bookings confirmed',
      icon: CheckCircle,
      color: 'bg-green-500',
      textColor: 'text-green-600'
    },
    {
      title: 'Provisional',
      value: summary.total_provisional.toLocaleString(),
      subtitle: 'Provisional bookings',
      icon: Clock,
      color: 'bg-yellow-500',
      textColor: 'text-yellow-600'
    },
    {
      title: 'Avg Daily',
      value: summary.average_daily_occupancy.toFixed(1),
      subtitle: 'Average per day',
      icon: Calendar,
      color: 'bg-purple-500',
      textColor: 'text-purple-600'
    }
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
      {cards.map((card, index) => {
        const Icon = card.icon
        return (
          <motion.div
            key={card.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white rounded-lg shadow-md p-6 border-l-4"
            style={{ borderLeftColor: card.color.replace('bg-', '').split('-')[1] === 'blue' ? '#3b82f6' : 
                             card.color.replace('bg-', '').split('-')[1] === 'green' ? '#10b981' :
                             card.color.replace('bg-', '').split('-')[1] === 'yellow' ? '#f59e0b' : '#8b5cf6' }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">{card.title}</p>
                <p className="text-3xl font-bold text-gray-900">{card.value}</p>
                <p className="text-xs text-gray-500 mt-2">{card.subtitle}</p>
              </div>
              <div className={`${card.color} rounded-full p-3`}>
                <Icon className="w-6 h-6 text-white" />
              </div>
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}



