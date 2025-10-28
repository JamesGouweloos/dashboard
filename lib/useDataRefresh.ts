'use client'

import { useEffect, useState } from 'react'

export function useDataRefresh() {
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    // Listen for storage events to detect data updates
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'dashboard-data-updated') {
        setRefreshKey(prev => prev + 1)
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [])

  return refreshKey
}

export function triggerDataRefresh() {
  // Trigger refresh across all tabs/windows
  localStorage.setItem('dashboard-data-updated', Date.now().toString())
  localStorage.removeItem('dashboard-data-updated')
}

