import { NextRequest, NextResponse } from 'next/server'
import { writeFile, unlink, access, rename } from 'fs/promises'
import { join } from 'path'
import { initializeApp } from 'firebase/app'
import { getFirestore, doc, setDoc } from 'firebase/firestore'

// Initialize Firebase Admin (for server-side)
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

// CSV processing functions
function parseCSV(csvText: string) {
  const lines = csvText.split('\n')
  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''))
  
  const data = []
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim()) {
      const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''))
      const row: any = {}
      headers.forEach((header, index) => {
        row[header] = values[index] || ''
      })
      data.push(row)
    }
  }
  
  return data
}

function applyBusinessRules(data: any[]) {
  console.log(`Processing ${data.length} bookings...`)
  
  // Rule 1: Remove MV-Matusadona bookings
  let filtered = data.filter(row => row['Property'] !== 'MV - Matusadona')
  console.log(`After Rule 1: ${filtered.length} bookings`)
  
  // Rule 2: Remove staff bookings (with exceptions)
  const keywords = ['Scott', 'Brown', 'Craig', 'Featherby', 'TWF', 'Staff']
  const exceptions = ['WB3703', 'WB4118', 'WB2748', 'WB4001', 'WB3556', 'WB4121']
  
  filtered = filtered.filter(row => {
    const reservationName = row['Reservation name'] || ''
    const reservationNumber = row['Reservation #'] || ''
    const source = row['Source'] || ''
    
    // Keep exceptions
    if (exceptions.includes(reservationNumber)) return true
    
    // Keep "Return Guests" source
    if (source.toLowerCase().includes('return guests')) return true
    
    // Remove if contains keywords
    for (const keyword of keywords) {
      if (reservationName.toLowerCase().includes(keyword.toLowerCase())) {
        return false
      }
    }
    
    return true
  })
  
  console.log(`After Rule 2: ${filtered.length} bookings`)
  
  // Rule 3 & 4: Categorize bookings
  filtered.forEach(row => {
    const accommodation = parseFloat(row['Accommodation']) || 0
    const reservationNumber = row['Reservation #'] || ''
    const zeroAccommodationExceptions = ['WB3964', 'Wb3762', 'WB4193', 'WB4242']
    
    if (accommodation === 0 && !zeroAccommodationExceptions.includes(reservationNumber)) {
      row['Booking Class'] = 'Non-Income Generating'
    } else {
      row['Booking Class'] = 'Income Generating'
    }
  })
  
  // Calculate Income and Disbursements
  const incomeColumns = [
    'WOMEN JEWELRY', 'Shop Purchases', 'Service Fee', 'Private guide and vehicle',
    'Private guide and boat', 'POS Misc', 'Operational', 'Miscellaneous', 'MEN JEWELRY',
    'Luxury Family Suite', 'Luxury Double Suite', 'Lunch ', 'Gratuity', 'Generator Fees',
    'Game Drive National Park', 'Game Drive GMA', 'Fuel', 'Fishing National Park full-day 26',
    'Fishing National Park', 'Fishing GMA', 'F&B', 'F & B', 'Extra Activity in the GMA',
    'Early Check-In / Late Check-Out', 'Dual Property Booking - Baines\' and Matusadona - T',
    'Drinks Tab', 'Curio: VR Prints', 'Curio: Short Sleeve', 'Curio: Luggage',
    'Curio: Long Sleeve', 'Curio: Jacket', 'Curio: Head & Waist Wear', 'Curio: Golfers',
    'Curio: Dress', 'Curio Shop', 'CURIO', 'COVID TEST - BRC', 'Booking Fee',
    'Boat Cruises GMA', 'Barter Agreement', 'Bar: White Wine', 'Bar: White House',
    'Bar: Whisky', 'Bar: Vodka', 'Bar: Soft Drinks', 'Bar: Single Malt', 'Bar: Rum',
    'Bar: Rose House', 'Bar: Red Wine', 'Bar: Red House', 'Bar: Liqueurs', 'Bar: Gin',
    'Bar: Cordials', 'Bar: Comp/Kitchen', 'Bar: Cider', 'Bar: Champagne / Sparkling',
    'Bar: Brandy', 'Bar: Beer', 'Bar: Aperitif', 'Baines\' River Camp',
    'BAR: ISLAND SUNDOWNERS', 'BAR: CORKAGE', 'Accommodation at Baine\'s',
    'Accommodation'
  ]
  
  filtered.forEach(row => {
    let income = 0
    incomeColumns.forEach(col => {
      if (row[col]) {
        income += parseFloat(row[col]) || 0
      }
    })
    
    // Subtract discounts
    if (row['10% Discount']) {
      income -= parseFloat(row['10% Discount']) || 0
    }
    
    row['Income'] = income
    row['Disbursements'] = (parseFloat(row['Revenue Total']) || 0) - income
  })
  
  return filtered
}

function createBreakdowns(data: any[]) {
  // Summary
  const summary = {
    total_bookings: data.length,
    total_revenue: data.reduce((sum, row) => sum + (parseFloat(row['Revenue Total']) || 0), 0),
    total_bed_nights: data.reduce((sum, row) => sum + (parseInt(row['Bed nights']) || 0), 0),
    income_generating: data.filter(row => row['Booking Class'] === 'Income Generating').length,
    non_income_generating: data.filter(row => row['Booking Class'] === 'Non-Income Generating').length
  }
  
  // Breakdown by status
  const by_status: any = {}
  data.forEach(row => {
    const status = row['Status'] || 'Unknown'
    if (!by_status[status]) {
      by_status[status] = { bookings: 0, revenue: 0, bed_nights: 0 }
    }
    by_status[status].bookings++
    by_status[status].revenue += parseFloat(row['Revenue Total']) || 0
    by_status[status].bed_nights += parseInt(row['Bed nights']) || 0
  })
  
  // Breakdown by booking class
  const by_booking_class: any = {}
  data.forEach(row => {
    const bookingClass = row['Booking Class'] || 'Unknown'
    if (!by_booking_class[bookingClass]) {
      by_booking_class[bookingClass] = { bookings: 0, revenue: 0, bed_nights: 0 }
    }
    by_booking_class[bookingClass].bookings++
    by_booking_class[bookingClass].revenue += parseFloat(row['Revenue Total']) || 0
    by_booking_class[bookingClass].bed_nights += parseInt(row['Bed nights']) || 0
  })
  
  // Breakdown by source
  const by_source: any = {}
  data.forEach(row => {
    const source = row['Source'] || 'Unknown'
    if (!by_source[source]) {
      by_source[source] = { bookings: 0, revenue: 0, bed_nights: 0 }
    }
    by_source[source].bookings++
    by_source[source].revenue += parseFloat(row['Revenue Total']) || 0
    by_source[source].bed_nights += parseInt(row['Bed nights']) || 0
  })
  
  // Breakdown by agent
  const by_agent: any = {}
  data.forEach(row => {
    const agent = row['Agent'] || 'Unknown'
    if (!by_agent[agent]) {
      by_agent[agent] = { bookings: 0, revenue: 0, bed_nights: 0 }
    }
    by_agent[agent].bookings++
    by_agent[agent].revenue += parseFloat(row['Revenue Total']) || 0
    by_agent[agent].bed_nights += parseInt(row['Bed nights']) || 0
  })
  
  // Revenue trends
  const revenue_trends: any = {}
  data.forEach(row => {
    const arrivalDate = row['Arrival date']
    if (arrivalDate) {
      const date = new Date(arrivalDate)
      const year = date.getFullYear()
      const month = date.getMonth() + 1
      const key = `${year}-${month.toString().padStart(2, '0')}`
      
      if (!revenue_trends[key]) {
        revenue_trends[key] = { revenue: 0, bookings: 0, bed_nights: 0 }
      }
      
      revenue_trends[key].revenue += parseFloat(row['Revenue Total']) || 0
      revenue_trends[key].bookings++
      revenue_trends[key].bed_nights += parseInt(row['Bed nights']) || 0
    }
  })
  
  return {
    summary,
    by_status,
    by_booking_class,
    by_source,
    by_agent,
    revenue_trends,
    yearly_breakdown: {},
    monthly_breakdown: {},
    yearly_breakdown_by_class: {},
    monthly_breakdown_by_class: {},
    yearly_breakdown_combined: {},
    monthly_breakdown_combined: {},
    monthly_bookings: {}
  }
}

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

    console.log('Processing CSV file...')
    
    try {
      // Parse CSV data
      const rawData = parseCSV(csvText)
      console.log(`Parsed ${rawData.length} rows from CSV`)
      
      // Apply business rules
      const processedData = applyBusinessRules(rawData)
      console.log(`After processing: ${processedData.length} bookings`)
      
      // Create breakdowns
      const breakdowns = createBreakdowns(processedData)
      console.log('Created data breakdowns')
      
      // Store the processed data in Firestore
      console.log('Storing data in Firestore...')
      await setDoc(doc(db, 'dashboard', 'data'), {
        ...breakdowns,
        lastUpdated: new Date().toISOString(),
        uploadTimestamp: Date.now()
      })

      console.log('Data successfully stored in Firestore')

      return NextResponse.json({
        message: 'File uploaded and processed successfully',
        details: `Processed ${processedData.length} bookings`,
        timestamp: Date.now()
      })

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