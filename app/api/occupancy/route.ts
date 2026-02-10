import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { getAdminDb } from '@/lib/firebase-admin'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  try {
    // Try to get data from Firestore first
    try {
      const db = getAdminDb()
      const docRef = db.doc('occupancy/data')
      const docSnap = await docRef.get()
      
      if (docSnap.exists) {
        const data: any = docSnap.data()
        console.log('Occupancy data fetched from Firestore')
        return new NextResponse(JSON.stringify(data), {
          status: 200,
          headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
        })
      }
    } catch (firestoreError: any) {
      console.error('Error accessing Firestore for occupancy/data:', firestoreError)
      // Fall through to JSON file fallback
    }

    // Fallback to JSON file if Firestore is not available
    const filePath = path.join(process.cwd(), 'occupancy_data.json')
    
    if (!fs.existsSync(filePath)) {
      return new NextResponse(JSON.stringify({ error: 'No occupancy data available. Please upload an occupancy report CSV file first.' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
      })
    }

    const fileContents = fs.readFileSync(filePath, 'utf8')
    const data = JSON.parse(fileContents)
    console.log('Occupancy data fetched from JSON file')

    return new NextResponse(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
    })
  } catch (error) {
    console.error('Error fetching occupancy data:', error)
    return new NextResponse(JSON.stringify({ error: 'Failed to load occupancy data' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
    })
  }
}

