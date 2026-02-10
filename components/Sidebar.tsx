'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { LayoutDashboard, BarChart3, TrendingUp, Filter, Globe, Upload, PieChart, Calendar, Users, Fish, Eye, MessageSquare, Shield, LogOut, ExternalLink, Menu, X, ChevronLeft, ChevronRight } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '@/lib/auth'

interface NavItem {
  name: string
  href: string
  icon: any
  requiredRole?: 'super_admin' | 'company_admin' | 'company_user'
}

const navigation: NavItem[] = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Occupancy', href: '/occupancy', icon: Calendar },
  { name: 'Agencies', href: '/revenue', icon: TrendingUp },
  { name: 'Sources', href: '/sources', icon: Globe },
  { name: 'Components', href: '/components', icon: PieChart },
  { name: 'Analysis', href: '/analysis', icon: BarChart3 },
  { name: 'Past Guests', href: '/guests', icon: Users },
  { name: 'Fishing Tracker', href: '/fishing', icon: Fish },
  { name: 'Game Sightings', href: '/game-sightings', icon: Eye },
  { name: 'Guest Feedback', href: '/guest-feedback', icon: MessageSquare },
  { name: 'Temple', href: '/temple', icon: ExternalLink },
  { name: 'Upload Data', href: '/upload', icon: Upload, requiredRole: 'super_admin' },
  { name: 'Admin Panel', href: '/admin', icon: Shield, requiredRole: 'super_admin' },
]

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
  isCollapsed?: boolean
  onToggleCollapse?: () => void
}

export default function Sidebar({ isOpen, onClose, isCollapsed = false, onToggleCollapse }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { userProfile, logout, hasAccess } = useAuth()
  const [logoSrc, setLogoSrc] = useState<string | null>(null)

  // Close sidebar when route changes on mobile
  useEffect(() => {
    const handleRouteChange = () => {
      if (window.innerWidth < 1024 && isOpen) {
        onClose()
      }
    }
    handleRouteChange()
  }, [pathname, isOpen, onClose])

  useEffect(() => {
    const loadBranding = async () => {
      try {
        const response = await fetch(`/branding/branding.json?ts=${Date.now()}`)
        if (!response.ok) return
        const data = await response.json()
        if (data?.logoPath) {
          const version = data?.logoVersion
          const src = version ? `${data.logoPath}?v=${version}` : data.logoPath
          setLogoSrc(src)
        } else {
          setLogoSrc(null)
        }
      } catch (error) {
        console.error('Failed to fetch branding config:', error)
      }
    }

    loadBranding()
  }, [])

  const handleLogout = async () => {
    await logout()
    router.push('/login')
  }

  const filteredNavigation = navigation.filter(item => {
    if (!item.requiredRole) return true
    return hasAccess(item.requiredRole)
  })

  return (
    <>
      {/* Mobile overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.div
        initial={false}
        animate={{
          x: isOpen ? 0 : -256,
          width: isCollapsed ? 80 : 256,
        }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="fixed left-0 top-0 h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white flex flex-col z-50 lg:translate-x-0"
      >
        {/* Mobile close button */}
        <button
          onClick={onClose}
          className="lg:hidden absolute top-4 right-4 p-2 rounded-lg hover:bg-gray-700 transition-colors"
          aria-label="Close menu"
        >
          <X className="h-6 w-6" />
        </button>

        {/* Desktop collapse/expand button */}
        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            className="hidden lg:flex absolute top-4 -right-3 p-1.5 bg-gray-800 hover:bg-gray-700 rounded-full border-2 border-gray-700 transition-colors z-10"
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4 text-white" />
            ) : (
              <ChevronLeft className="h-4 w-4 text-white" />
            )}
          </button>
        )}
      <div className={`p-6 border-b border-gray-700 flex-shrink-0 flex flex-col items-center transition-all ${isCollapsed ? 'px-2' : ''}`}>
        {logoSrc ? (
          <img
            src={logoSrc}
            alt="Dashboard logo"
            className={`object-contain transition-all ${isCollapsed ? 'h-12 w-12' : 'h-24 w-auto'}`}
          />
        ) : (
          <div className={`flex items-center justify-center font-semibold text-white transition-all ${isCollapsed ? 'h-12 text-xs' : 'h-24 text-lg'}`}>
            {isCollapsed ? 'D' : 'Dashboard'}
          </div>
        )}
      </div>

      <nav className="p-4 space-y-2 flex-1 overflow-y-auto">
        {filteredNavigation.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href
          
          return (
            <Link key={item.name} href={item.href}>
              <motion.div
                whileHover={{ x: isCollapsed ? 0 : 4 }}
                whileTap={{ scale: 0.98 }}
                className={`
                  flex items-center rounded-lg transition-colors group relative
                  ${isCollapsed ? 'justify-center px-3 py-3' : 'space-x-3 px-4 py-3'}
                  ${isActive 
                    ? 'bg-primary-600 text-white' 
                    : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                  }
                `}
                title={isCollapsed ? item.name : undefined}
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
                {!isCollapsed && <span className="font-medium">{item.name}</span>}
                {/* Tooltip for collapsed state */}
                {isCollapsed && (
                  <span className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-sm rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity">
                    {item.name}
                  </span>
                )}
              </motion.div>
            </Link>
          )
        })}
      </nav>

      <div className={`p-4 border-t border-gray-700 flex-shrink-0 transition-all ${isCollapsed ? 'px-2' : ''}`}>
        {!isCollapsed && (
          <div className="mb-3 text-xs text-gray-400">
            <p className="text-gray-300 font-medium mb-1 truncate">{userProfile?.email}</p>
            <p className="text-xs">
              {userProfile?.role === 'super_admin' ? 'Super Admin' :
               userProfile?.role === 'company_admin' ? 'Company Admin' :
               'User'}
            </p>
          </div>
        )}
        <button
          onClick={handleLogout}
          className={`w-full flex items-center rounded-lg text-gray-300 hover:bg-gray-800 hover:text-white transition-colors group relative ${
            isCollapsed ? 'justify-center px-3 py-2' : 'space-x-2 px-3 py-2'
          }`}
          title={isCollapsed ? 'Sign Out' : undefined}
        >
          <LogOut className="h-4 w-4 flex-shrink-0" />
          {!isCollapsed && <span className="text-sm font-medium">Sign Out</span>}
          {isCollapsed && (
            <span className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-sm rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity">
              Sign Out
            </span>
          )}
        </button>
      </div>
    </motion.div>
    </>
  )
}

