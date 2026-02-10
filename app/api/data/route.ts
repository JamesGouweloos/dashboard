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
      const docRef = db.doc('dashboard/data')
      const docSnap = await docRef.get()
      
      console.log('Checking dashboard/data document...')
      console.log('Document exists:', docSnap.exists)
      
      if (docSnap.exists) {
        console.log('Document found, reading data...')
        const data: any = docSnap.data()
        console.log('Document data keys:', Object.keys(data || {}))
        console.log('Has summary:', !!data?.summary)
        // Ensure containers exist before merge
        data.revenue_trends = data.revenue_trends || {}
        data.yearly_breakdown = data.yearly_breakdown || {}
        data.monthly_breakdown = data.monthly_breakdown || {}
        data.yearly_breakdown_by_class = data.yearly_breakdown_by_class || {}
        data.monthly_breakdown_by_class = data.monthly_breakdown_by_class || {}
        data.yearly_breakdown_combined = data.yearly_breakdown_combined || {}
        data.monthly_breakdown_combined = data.monthly_breakdown_combined || {}
        
        // Fetch per-year dashboard data docs and merge into a single response shape
        try {
          const perYearCol = db.collection('dashboard_data_by_year')
          const perYearSnap = await perYearCol.get()
          perYearSnap.docs.forEach(d => {
            const year = d.id
            const v: any = d.data() || {}
            // Merge revenue trends entries
            if (v.revenue_trends) {
              Object.entries(v.revenue_trends).forEach(([k, val]) => {
                ;(data.revenue_trends as any)[k] = val
              })
            }
            // Year-scoped structures
            if (v.yearly_breakdown) data.yearly_breakdown[year] = v.yearly_breakdown
            if (v.monthly_breakdown) data.monthly_breakdown[year] = v.monthly_breakdown
            if (v.yearly_breakdown_by_class) data.yearly_breakdown_by_class[year] = v.yearly_breakdown_by_class
            if (v.monthly_breakdown_by_class) data.monthly_breakdown_by_class[year] = v.monthly_breakdown_by_class
            if (v.yearly_breakdown_combined) data.yearly_breakdown_combined[year] = v.yearly_breakdown_combined
            if (v.monthly_breakdown_combined) data.monthly_breakdown_combined[year] = v.monthly_breakdown_combined
          })
          console.log(`Merged ${perYearSnap.docs.length} per-year dashboard documents`)
        } catch (perYearErr) {
          console.log('Error fetching per-year dashboard data:', perYearErr)
        }

        // Fetch monthly_bookings from per-month collection
        try {
          const monthlyCol = db.collection('dashboard_monthly_bookings')
          const monthlySnap = await monthlyCol.get()
          const monthlyBookings: any = {}
          monthlySnap.docs.forEach(d => {
            const v: any = d.data() || {}
            const year = (v.year ?? '').toString()
            // Normalize month to integer string (handle both number and string, float and int)
            let month = v.month
            if (typeof month === 'number') {
              month = String(Math.floor(month))  // Convert float to int string
            } else {
              month = String(parseInt(month || '0'))  // Parse string to int, then to string
            }
            if (!year || !month || month === '0' || month === 'NaN') return
            if (!monthlyBookings[year]) monthlyBookings[year] = {}
            monthlyBookings[year][month] = v.bookings || []
          })
          data.monthly_bookings = monthlyBookings
          console.log(`Monthly bookings fetched: ${monthlySnap.docs.length} docs`)
        } catch (monthlyErr) {
          console.log('Error fetching per-month monthly_bookings:', monthlyErr)
        }
        
        console.log('Data fetched from Firestore successfully')
        console.log('Data keys:', Object.keys(data))
        return new NextResponse(JSON.stringify(data), {
          status: 200,
          headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
        })
      } else {
        console.log('dashboard/data document does not exist - checking for per-year documents...')
        // Check if we have per-year documents even if main doc doesn't exist
        try {
          const perYearCol = db.collection('dashboard_data_by_year')
          const perYearSnap = await perYearCol.get()
          if (perYearSnap.docs.length > 0) {
            console.log(`Found ${perYearSnap.docs.length} per-year documents but no main document`)
            return new NextResponse(JSON.stringify({ 
              error: 'Data structure incomplete. Main dashboard document missing.',
              details: 'Per-year documents exist but main document is missing. Please re-upload data.'
            }), {
              status: 500,
              headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
            })
          }
        } catch (checkError) {
          console.error('Error checking per-year documents:', checkError)
        }
      }
    } catch (firestoreError: any) {
      console.error('Error accessing Firestore:', firestoreError)
      console.error('Error message:', firestoreError?.message)
      console.error('Error stack:', firestoreError?.stack)
      // Don't fall through - return error
      return new NextResponse(JSON.stringify({ 
        error: 'Failed to access Firestore',
        details: firestoreError?.message || 'Unknown error'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
      })
    }

    // Fallback to JSON file if Firestore is not available
    const filePath = path.join(process.cwd(), 'dashboard_data.json')
    
    if (!fs.existsSync(filePath)) {
      return new NextResponse(JSON.stringify({ error: 'No data available. Please upload a CSV file first.' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
      })
    }

    const fileContents = fs.readFileSync(filePath, 'utf8')
    const data = JSON.parse(fileContents)
    console.log('Data fetched from JSON file')

    return new NextResponse(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
    })
  } catch (error) {
    console.error('Error fetching data:', error)
    return new NextResponse(JSON.stringify({ error: 'Failed to load data' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
    })
  }
}

