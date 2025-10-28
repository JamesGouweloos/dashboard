'use client'

import { useEffect, useState } from 'react'
import { initializeApp } from 'firebase/app'
import { getFirestore, doc, onSnapshot } from 'firebase/firestore'

// Initialize Firebase
const firebaseConfig = {
  apiKey: "AIzaSyD70vqTEpkDoxHrA1b0C3uJhESLti8k0uI",
  authDomain: "dashboard-baines.firebaseapp.com",
  projectId: "dashboard-baines",
  storageBucket: "dashboard-baines.firebasestorage.app",
  messagingSenderId: "490088692843",
  appId: "1:490088692843:web:87523298f218fa3570c52e"
}

const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

export function useRealtimeData() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)

  useEffect(() => {
    const docRef = doc(db, 'dashboard', 'data')
    
    const unsubscribe = onSnapshot(
      docRef,
      (doc) => {
        if (doc.exists()) {
          const docData = doc.data()
          setData(docData)
          setLastUpdated(docData.lastUpdated || new Date().toISOString())
          setLoading(false)
          setError(null)
        } else {
          setError('No data available')
          setLoading(false)
        }
      },
      (error) => {
        console.error('Error listening to Firestore:', error)
        setError('Failed to connect to database')
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [])

  return { data, loading, error, lastUpdated }
}

export function triggerDataRefresh() {
  // Trigger refresh across all tabs/windows
  localStorage.setItem('dashboard-data-updated', Date.now().toString())
  localStorage.removeItem('dashboard-data-updated')
}
