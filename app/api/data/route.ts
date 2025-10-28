import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { initializeApp } from 'firebase/app'
import { getFirestore, doc, getDoc } from 'firebase/firestore'

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
    // Try to get data from Firestore first
    try {
      const docRef = doc(db, 'dashboard', 'data')
      const docSnap = await getDoc(docRef)
      
      if (docSnap.exists()) {
        const data = docSnap.data()
        console.log('Data fetched from Firestore')
        return NextResponse.json(data)
      }
    } catch (firestoreError) {
      console.log('Firestore not available, falling back to JSON file:', firestoreError)
    }

    // Fallback to JSON file if Firestore is not available
    const filePath = path.join(process.cwd(), 'dashboard_data.json')
    
    if (!fs.existsSync(filePath)) {
      return NextResponse.json(
        { error: 'No data available. Please upload a CSV file first.' },
        { status: 404 }
      )
    }

    const fileContents = fs.readFileSync(filePath, 'utf8')
    const data = JSON.parse(fileContents)
    console.log('Data fetched from JSON file')

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching data:', error)
    return NextResponse.json(
      { error: 'Failed to load data' },
      { status: 500 }
    )
  }
}

