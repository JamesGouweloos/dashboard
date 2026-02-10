import { NextResponse } from 'next/server'
import { getAdminDb } from '@/lib/firebase-admin'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  try {
    const db = getAdminDb()
    
    // Check main dashboard document
    const mainDoc = await db.doc('dashboard/data').get()
    const mainData = mainDoc.exists ? mainDoc.data() : null
    
    // Check per-year documents
    const perYearCol = db.collection('dashboard_data_by_year')
    const perYearSnap = await perYearCol.get()
    const perYearDocs = perYearSnap.docs.map(d => ({
      id: d.id,
      exists: true,
      keys: Object.keys(d.data() || {})
    }))
    
    // Check monthly bookings
    const monthlyCol = db.collection('dashboard_monthly_bookings')
    const monthlySnap = await monthlyCol.get()
    const monthlyDocs = monthlySnap.docs.map(d => ({
      id: d.id,
      exists: true,
      keys: Object.keys(d.data() || {})
    }))
    
    return NextResponse.json({
      main_document: {
        exists: mainDoc.exists,
        keys: mainData ? Object.keys(mainData) : [],
        has_summary: !!mainData?.summary,
        summary: mainData?.summary || null
      },
      per_year_documents: {
        count: perYearDocs.length,
        docs: perYearDocs
      },
      monthly_bookings_documents: {
        count: monthlyDocs.length,
        docs: monthlyDocs.slice(0, 5) // First 5 only
      }
    })
  } catch (error: any) {
    return NextResponse.json({
      error: 'Failed to check Firestore',
      message: error?.message,
      stack: error?.stack
    }, { status: 500 })
  }
}

