'use client'

import { useState, useEffect } from 'react'
import Sidebar from './Sidebar'
import { Menu } from 'lucide-react'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 1024
      setIsMobile(mobile)
      // On desktop, sidebar is always visible (open)
      // On mobile, sidebar starts closed
      if (!mobile) {
        setSidebarOpen(true)
      }
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Load collapsed state from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined' && !isMobile) {
      const saved = localStorage.getItem('sidebarCollapsed')
      if (saved !== null) {
        setSidebarCollapsed(saved === 'true')
      }
    }
  }, [isMobile])

  // Save collapsed state to localStorage
  const handleToggleCollapse = () => {
    const newState = !sidebarCollapsed
    setSidebarCollapsed(newState)
    if (typeof window !== 'undefined') {
      localStorage.setItem('sidebarCollapsed', String(newState))
    }
  }

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Sidebar 
        isOpen={sidebarOpen} 
        onClose={() => setSidebarOpen(false)}
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={handleToggleCollapse}
      />
      
      {/* Mobile menu button */}
      <button
        onClick={() => setSidebarOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-30 p-2 bg-gray-900 text-white rounded-lg shadow-lg hover:bg-gray-800 transition-colors"
        aria-label="Open menu"
      >
        <Menu className="h-6 w-6" />
      </button>
      
      <div 
        className="flex-1 flex flex-col overflow-y-auto h-screen transition-all duration-300"
        style={{
          marginLeft: isMobile ? 0 : (sidebarCollapsed ? '80px' : '256px')
        }}
      >
        <main className="flex-1 px-4 sm:px-6 pt-16 lg:pt-6 pb-0">
          {children}
        </main>

        <footer className="border-t border-gray-200 bg-white py-4 px-4 sm:px-6 flex-shrink-0">
          <div className="text-center text-sm text-gray-600">
            <p>© {new Date().getFullYear()} Baines River Camp - Booking Dashboard</p>
          </div>
        </footer>
      </div>
    </div>
  )
}
