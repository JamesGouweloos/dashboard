import { NextRequest, NextResponse } from 'next/server'
import { getAdminDb } from '@/lib/firebase-admin'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function POST(request: NextRequest) {
  try {
    const data = await request.formData()
    const file: File | null = data.get('file') as unknown as File

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
    }

    // Validate file type
    if (!file.name.toLowerCase().endsWith('.csv')) {
      return NextResponse.json({ error: 'Only CSV files are allowed' }, { status: 400 })
    }

    // Convert file to buffer and text
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const csvText = buffer.toString('utf-8')

    console.log('Processing occupancy report CSV file...')
    console.log(`CSV file size: ${csvText.length} characters`)
    
    try {
      // Call Cloud Function to process the CSV data
      console.log('Calling Cloud Function to process occupancy report...')
      
      // Call the Cloud Function with the CSV content
      const cloudFunctionUrl = 'https://us-central1-dashboard-baines.cloudfunctions.net/process_occupancy_report'
      
      const response = await fetch(cloudFunctionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/csv',
        },
        body: csvText
      })
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('Cloud Function error:', errorText)
        throw new Error(`Cloud Function failed: ${response.status} ${errorText}`)
      }
      
      const result = await response.json()
      console.log('Cloud Function processing completed:', result.message)
      console.log('Has occupancy_data:', !!result.occupancy_data)

      // Store processed occupancy data in Firestore
      try {
        if (result.occupancy_data) {
          console.log('Storing occupancy data to Firestore...')
          
          // Use Admin SDK to store occupancy data in Firestore
          const db = getAdminDb()
          await db.doc('occupancy/data').set({
            ...result.occupancy_data,
            last_updated: new Date().toISOString(),
            filename: file.name
          })
          
          console.log('✓ Occupancy data stored in Firestore at occupancy/data')
        } else {
          console.warn('⚠ No occupancy_data in result')
        }
      } catch (firestoreError: any) {
        console.error('❌ Error storing data in Firestore:', firestoreError)
        throw firestoreError // Re-throw to prevent silent failures
      }

      // Return response including storage status
      const response_data: any = {
        message: 'Occupancy report uploaded and processed successfully',
        details: result.message,
        summary: result.summary,
        timestamp: result.timestamp || new Date().toISOString()
      }

      if (!result.occupancy_data) {
        response_data.warning = 'Occupancy data not found in Cloud Function response'
        console.error('⚠️ Occupancy data missing from Cloud Function response')
      }

      return NextResponse.json(response_data)

    } catch (error: any) {
      console.error('Error processing file:', error)
      return NextResponse.json({
        error: 'Failed to process the uploaded file. Please check the file format.',
        details: error.message
      }, { status: 500 })
    }

  } catch (error: any) {
    console.error('Upload error:', error)
    return NextResponse.json({
      error: 'Upload failed',
      details: error.message
    }, { status: 500 })
  }
}



