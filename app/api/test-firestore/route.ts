import { NextResponse } from 'next/server'
import { getAdminDb } from '@/lib/firebase-admin'
import { getApps } from 'firebase-admin/app'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  const results: any = {
    timestamp: new Date().toISOString(),
    tests: []
  }

  try {
    // Test 1: Initialize Admin SDK
    results.tests.push({ name: 'Initialize Admin SDK', status: 'running' })
    const db = getAdminDb()
    results.tests[0].status = 'success'
    results.tests[0].message = 'Admin SDK initialized'
    
    // Safely get project ID
    try {
      const apps = getApps()
      if (apps.length > 0) {
        results.tests[0].projectId = apps[0].options.projectId || 'dashboard-baines'
      } else {
        results.tests[0].projectId = 'dashboard-baines (default)'
      }
    } catch (projectIdError) {
      results.tests[0].projectId = 'unknown'
      results.tests[0].projectIdError = String(projectIdError)
    }

    // Test 2: Read from Firestore
    results.tests.push({ name: 'Read from Firestore', status: 'running' })
    try {
      const readDoc = await db.doc('dashboard/data').get()
      results.tests[1].status = 'success'
      results.tests[1].message = readDoc.exists ? 'Document exists' : 'Document does not exist'
      results.tests[1].exists = readDoc.exists
      if (readDoc.exists) {
        results.tests[1].keys = Object.keys(readDoc.data() || {})
      }
    } catch (readError: any) {
      results.tests[1].status = 'error'
      results.tests[1].message = readError.message
      results.tests[1].error = readError.toString()
    }

    // Test 3: Write to Firestore
    results.tests.push({ name: 'Write to Firestore', status: 'running' })
    try {
      const testDocId = `_test_${Date.now()}`
      const testDocRef = db.doc(`dashboard/${testDocId}`)
      
      await testDocRef.set({
        test: true,
        timestamp: new Date().toISOString(),
        message: 'Test write from API route'
      })
      
      // Verify write
      const verifyRead = await testDocRef.get()
      if (verifyRead.exists) {
        results.tests[2].status = 'success'
        results.tests[2].message = 'Write successful and verified'
        results.tests[2].writtenData = verifyRead.data()
        
        // Clean up
        await testDocRef.delete()
        results.tests[2].cleanup = 'Test document deleted'
      } else {
        results.tests[2].status = 'error'
        results.tests[2].message = 'Write appeared to succeed but document does not exist'
      }
    } catch (writeError: any) {
      results.tests[2].status = 'error'
      results.tests[2].message = writeError.message
      results.tests[2].error = writeError.toString()
      results.tests[2].stack = writeError.stack
    }

    // Test 4: Check environment variables
    results.tests.push({ name: 'Environment Check', status: 'success' })
    results.tests[3].hasServiceAccountKey = !!process.env.FIREBASE_SERVICE_ACCOUNT_KEY
    results.tests[3].nodeEnv = process.env.NODE_ENV
    results.tests[3].firebaseProjectId = process.env.FIREBASE_PROJECT_ID || 'dashboard-baines'

    return NextResponse.json(results, { status: 200 })
  } catch (error: any) {
    results.error = error.message
    results.stack = error.stack
    return NextResponse.json(results, { status: 500 })
  }
}

