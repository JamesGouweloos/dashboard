import { NextResponse } from 'next/server'
import { initializeApp } from 'firebase/app'
import { getFirestore, doc, getDoc } from 'firebase/firestore'

export const dynamic = 'force-dynamic'
export const revalidate = 0

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

export async function GET() {
  try {
    const ref = doc(db, 'revenue_config', 'categorization')
    const snap = await getDoc(ref)
    
    if (snap.exists()) {
      const data = snap.data()
      return NextResponse.json(data, {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
      })
    } else {
      // Return default configuration
      return NextResponse.json({
        itemToCategory: {},
        categoryToType: {
          'Accommodation': 'Income',
          'Park Fees & Levies': 'Disbursements',
          'Travel': 'Income',
          'Activities': 'Income',
          'Bar': 'Income',
          'Shop': 'Income'
        },
        lastUpdated: null
      }, {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
      })
    }
  } catch (error) {
    console.error('Error fetching revenue config:', error)
    return NextResponse.json({ error: 'Failed to load revenue configuration' }, {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
    })
  }
}



