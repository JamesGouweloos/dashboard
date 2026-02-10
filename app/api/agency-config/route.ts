import { NextResponse } from 'next/server'
import { getAdminDb } from '@/lib/firebase-admin'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  try {
    const db = getAdminDb()
    const ref = db.doc('agency_config/classification')
    const snap = await ref.get()
    
    if (snap.exists) {
      const data = snap.data()
      return NextResponse.json(data, {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
      })
    } else {
      // Return default configuration (all agents default to 'Agent')
      return NextResponse.json({
        agentToType: {},
        lastUpdated: null
      }, {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
      })
    }
  } catch (error) {
    console.error('Error fetching agency config:', error)
    return NextResponse.json({ error: 'Failed to load agency configuration' }, {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
    })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { agentToType } = body
    
    const config = {
      agentToType: agentToType || {},
      lastUpdated: new Date().toISOString()
    }
    
    const db = getAdminDb()
    await db.doc('agency_config/classification').set(config)
    
    return NextResponse.json({ success: true }, {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
    })
  } catch (error) {
    console.error('Error saving agency config:', error)
    return NextResponse.json({ error: 'Failed to save agency configuration' }, {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
    })
  }
}

