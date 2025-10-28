'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { LayoutDashboard, BarChart3, TrendingUp, Filter, Globe, Zap, Upload } from 'lucide-react'
import { motion } from 'framer-motion'

interface NavItem {
  name: string
  href: string
  icon: any
}

const navigation: NavItem[] = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Performance', href: '/performance', icon: Zap },
  { name: 'Revenue', href: '/revenue', icon: TrendingUp },
  { name: 'Sources', href: '/sources', icon: Globe },
  { name: 'Analysis', href: '/analysis', icon: BarChart3 },
  { name: 'Upload Data', href: '/upload', icon: Upload },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <motion.div
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      className="w-64 bg-gradient-to-b from-gray-900 to-gray-800 text-white min-h-screen"
    >
      <div className="p-6 border-b border-gray-700">
        <h1 className="text-xl font-bold text-white">Baines River Camp</h1>
        <p className="text-sm text-gray-400">Booking Dashboard</p>
      </div>

      <nav className="p-4 space-y-2">
        {navigation.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href
          
          return (
            <Link key={item.name} href={item.href}>
              <motion.div
                whileHover={{ x: 4 }}
                whileTap={{ scale: 0.98 }}
                className={`
                  flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors
                  ${isActive 
                    ? 'bg-primary-600 text-white' 
                    : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                  }
                `}
              >
                <Icon className="h-5 w-5" />
                <span className="font-medium">{item.name}</span>
              </motion.div>
            </Link>
          )
        })}
      </nav>

      <div className="absolute bottom-0 w-64 p-4 border-t border-gray-700">
        <div className="text-xs text-gray-400">
          <p>Last Updated:</p>
          <p className="text-gray-500">Check dashboard</p>
        </div>
      </div>
    </motion.div>
  )
}

