import { NextResponse } from 'next/server'
import { getAdminDb } from '@/lib/firebase-admin'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  try {
    const db = getAdminDb()
    const snapshot = await db
      .collection('weekly_sales_reports')
      .orderBy('generated_at', 'desc')
      .limit(24)
      .get()

    const reports = snapshot.docs.map((doc) => {
      const data = doc.data() || {}
      return {
        id: doc.id,
        week_key: data.week_key || doc.id,
        generated_at: data.generated_at || null,
        baseline_snapshot_week: data.baseline_snapshot_week || null,
        updates_count: data.updates_count ?? 0,
        drop_off_count: data.drop_off_count ?? 0,
        total_current_bookings: data.total_current_bookings ?? 0,
        snapshot_finalized: !!data.snapshot_finalized,
        updates: Array.isArray(data.updates) ? data.updates : [],
        drop_off: Array.isArray(data.drop_off) ? data.drop_off : []
      }
    })

    return NextResponse.json({ reports })
  } catch (error: any) {
    return NextResponse.json(
      {
        error: 'Failed to load weekly reports',
        details: error?.message || 'Unknown error'
      },
      { status: 500 }
    )
  }
}

