'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { UserRole } from '@/lib/auth'

interface AuthGuardProps {
  children: React.ReactNode
  requiredRole?: UserRole
  redirectTo?: string
}

export default function AuthGuard({ children, requiredRole, redirectTo = '/login' }: AuthGuardProps) {
  const { user, userProfile, loading, hasAccess } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push(redirectTo)
      } else if (requiredRole && !hasAccess(requiredRole)) {
        router.push('/')
      }
    }
  }, [user, userProfile, loading, requiredRole, hasAccess, router, redirectTo])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  if (requiredRole && !hasAccess(requiredRole)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-600 mb-4">You don't have permission to access this page.</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}

