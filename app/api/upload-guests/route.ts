import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'

export const dynamic = 'force-dynamic'
export const revalidate = 0

// CSV processing functions
function parseCSV(csvText: string): any[] {
  const lines = csvText.split('\n').filter(line => line.trim())
  if (lines.length < 2) return []

  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''))
  
  const data: any[] = []
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]
    if (!line.trim()) continue

    // Handle CSV with quoted values
    const values: string[] = []
    let currentValue = ''
    let insideQuotes = false

    for (let j = 0; j < line.length; j++) {
      const char = line[j]
      
      if (char === '"') {
        insideQuotes = !insideQuotes
      } else if (char === ',' && !insideQuotes) {
        values.push(currentValue.trim())
        currentValue = ''
      } else {
        currentValue += char
      }
    }
    values.push(currentValue.trim())

    const row: any = {}
    headers.forEach((header, index) => {
      row[header] = values[index] || ''
    })
    data.push(row)
  }
  
  return data
}

function processGuestData(data: any[]): any[] {
  console.log(`Processing ${data.length} guest records...`)
  
  // Month name to number mapping
  const monthMap: Record<string, number> = {
    'jan': 1, 'january': 1,
    'feb': 2, 'february': 2,
    'mar': 3, 'march': 3,
    'apr': 4, 'april': 4,
    'may': 5,
    'jun': 6, 'june': 6,
    'jul': 7, 'july': 7,
    'aug': 8, 'august': 8,
    'sep': 9, 'sept': 9, 'september': 9,
    'oct': 10, 'october': 10,
    'nov': 11, 'november': 11,
    'dec': 12, 'december': 12
  }

  const parseMonth = (monthValue: string): number | string => {
    if (!monthValue) return ''
    const monthStr = String(monthValue).trim()
    
    // Check if it's already a number
    const numMonth = parseInt(monthStr)
    if (!isNaN(numMonth) && numMonth >= 1 && numMonth <= 12) {
      return numMonth
    }
    
    // Try to match month name
    const monthLower = monthStr.toLowerCase()
    if (monthMap[monthLower]) {
      return monthMap[monthLower]
    }
    
    return monthStr // Return as-is if can't parse
  }

  const parseDOB = (dobValue: string): string => {
    if (!dobValue) return ''
    const dobStr = String(dobValue).trim()
    
    // Check if it's in DD.MM.YYYY format
    const ddmmyyyyPattern = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/
    const match = dobStr.match(ddmmyyyyPattern)
    
    if (match) {
      const [, day, month, year] = match
      // Convert to ISO format YYYY-MM-DD
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
    }
    
    return dobStr // Return as-is if not in expected format
  }

  const processed = data.map(guest => {
    return {
      'Year': String(guest['Year'] || guest['YEAR'] || ''),
      'Month': parseMonth(guest['Month'] || guest['MONTH'] || ''),
      'Guest No.': guest['Guest No.'] || guest['GUEST NO.'] || guest['Guest No'] || '',
      'BOOKING NAME': guest['BOOKING NAME'] || guest['Booking Name'] || '',
      'SURNAME': guest['SURNAME'] || guest['Surname'] || '',
      'FIRST NAME': guest['FIRST NAME'] || guest['First Name'] || guest['FIRSTNAME'] || '',
      'TITLE': guest['TITLE'] || guest['Title'] || '',
      'DATE OF ARRIVAL': guest['DATE OF ARRIVAL'] || guest['Date of Arrival'] || guest['Arrival Date'] || '',
      'DATE OF DEPARTURE': guest['DATE OF DEPARTURE'] || guest['Date of Departure'] || guest['Departure Date'] || '',
      'BED NIGHTS': guest['BED NIGHTS'] || guest['Bed Nights'] || guest['BED_NIGHTS'] || 0,
      'DOB': parseDOB(guest['DOB'] || guest['Date of Birth'] || ''),
      'COUNTRY OF RESIDENCE': guest['COUNTRY OF RESIDENCE'] || guest['Country of Residence'] || guest['Country'] || '',
      'NATIONALITY AS PER PASSPORT': guest['NATIONALITY AS PER PASSPORT'] || guest['Nationality'] || '',
      'PASSPORT NUMBER': guest['PASSPORT NUMBER'] || guest['Passport Number'] || guest['Passport'] || '',
      'EMAIL ADDRESS': guest['EMAIL ADDRESS'] || guest['Email'] || guest['EMAIL'] || ''
    }
  })

  // Filter out records with null/empty first name or surname
  const initialCount = processed.length
  const filtered = processed.filter(guest => {
    const firstName = String(guest['FIRST NAME'] || '').trim()
    const surname = String(guest['SURNAME'] || '').trim()
    return firstName !== '' && surname !== ''
  })

  const removedCount = initialCount - filtered.length
  console.log(`Processed ${filtered.length} guest records (removed ${removedCount} records with missing name data)`)
  return filtered
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file uploaded' },
        { status: 400 }
      )
    }

    // Read file content
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const csvText = buffer.toString('utf-8')

    // Parse and process CSV
    const rawData = parseCSV(csvText)
    if (rawData.length === 0) {
      return NextResponse.json(
        { error: 'No valid data found in CSV file' },
        { status: 400 }
      )
    }

    const processedData = processGuestData(rawData)

    // Import Firestore functions
    const { addGuest } = await import('@/lib/firestore')
    const { writeBatch, collection, doc, Timestamp } = await import('firebase/firestore')
    const { db } = await import('@/firebase')

    // Batch write to Firestore (500 per batch)
    const BATCH_SIZE = 500
    let totalAdded = 0

    for (let i = 0; i < processedData.length; i += BATCH_SIZE) {
      const batch = writeBatch(db)
      const batchData = processedData.slice(i, i + BATCH_SIZE)
      
      for (const guest of batchData) {
        const docRef = doc(collection(db, 'past_guests'))
        batch.set(docRef, {
          ...guest,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now()
        })
      }
      
      await batch.commit()
      totalAdded += batchData.length
      console.log(`Uploaded batch: ${totalAdded}/${processedData.length} records`)
    }

    console.log(`Guest data saved to Firestore: ${processedData.length} records`)

    return NextResponse.json({
      message: 'Guest data uploaded and processed successfully',
      totalRecords: processedData.length
    }, {
      status: 200,
      headers: { 'Cache-Control': 'no-store' }
    })
  } catch (error) {
    console.error('Error processing guest data:', error)
    return NextResponse.json(
      { error: 'Failed to process guest data: ' + (error as Error).message },
      { status: 500 }
    )
  }
}

