'use client'

import { motion } from 'framer-motion'
import Sidebar from './Sidebar'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Sidebar />
      
      <div className="flex-1 flex flex-col ml-64">
        <motion.header 
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-white shadow-sm border-b border-gray-200"
        >
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">
                  Real-time Analytics Dashboard
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500">Live Data</p>
                <p className="text-sm font-semibold text-primary-600">
                  📊 Dashboard Active
                </p>
              </div>
            </div>
          </div>
        </motion.header>

        <main className="flex-1 p-6">
          {children}
        </main>

        <footer className="border-t border-gray-200 bg-white py-6 px-6">
          <div className="text-center text-sm text-gray-600">
            <p>© {new Date().getFullYear()} Baines River Camp - Booking Dashboard</p>
          </div>
        </footer>
      </div>
    </div>
  )
}
