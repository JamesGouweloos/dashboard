import { NextRequest, NextResponse } from 'next/server'
import { writeFile, unlink, access, rename } from 'fs/promises'
import { join } from 'path'
import { getAdminDb } from '@/lib/firebase-admin'

export const dynamic = 'force-dynamic'
export const revalidate = 0

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
  const exceptions = ['WB3703', 'WB4118', 'WB2748', 'WB4001', 'WB3556', 'WB4121', 'WB4194', 'WB4362']
  
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
    const zeroAccommodationExceptions = ['WB3964', 'WB3762', 'WB4193', 'WB4242']
    
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

function createCompleteBreakdowns(data: any[]) {
  console.log('Creating comprehensive data breakdowns...')
  
  // Summary
  const summary = {
    total_bookings: data.length,
    total_revenue: data.reduce((sum, row) => sum + (parseFloat(row['Revenue Total']) || 0), 0),
    total_bed_nights: data.reduce((sum, row) => sum + (parseInt(row['Bed nights']) || 0), 0),
    total_pax: data.reduce((sum, row) => sum + (parseInt(row['PAX']) || 0), 0),
    total_payments: data.reduce((sum, row) => sum + (parseFloat(row['Total amount paid']) || 0), 0),
    total_outstanding: data.reduce((sum, row) => sum + (parseFloat(row['Total amount outstanding']) || 0), 0),
    income_generating: data.filter(row => row['Booking Class'] === 'Income Generating').length,
    non_income_generating: data.filter(row => row['Booking Class'] === 'Non-Income Generating').length,
    report_generated: new Date().toISOString()
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
      by_booking_class[bookingClass] = { 
        count: 0, 
        revenue: 0, 
        bed_nights: 0,
        income: 0,
        disbursements: 0,
        outstanding: 0
      }
    }
    by_booking_class[bookingClass].count++
    by_booking_class[bookingClass].revenue += parseFloat(row['Revenue Total']) || 0
    by_booking_class[bookingClass].bed_nights += parseInt(row['Bed nights']) || 0
    by_booking_class[bookingClass].income += parseFloat(row['Income']) || 0
    by_booking_class[bookingClass].disbursements += parseFloat(row['Disbursements']) || 0
    by_booking_class[bookingClass].outstanding += parseFloat(row['Total amount outstanding']) || 0
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
  
  // Yearly breakdown
  const yearly_breakdown: any = {}
  data.forEach(row => {
    const arrivalDate = row['Arrival date']
    if (arrivalDate) {
      const date = new Date(arrivalDate)
      const year = date.getFullYear().toString()
      const status = row['Status'] || 'Unknown'
      
      if (!yearly_breakdown[year]) {
        yearly_breakdown[year] = {}
      }
      if (!yearly_breakdown[year][status]) {
        yearly_breakdown[year][status] = {
          bed_nights: 0,
          accommodation: 0,
          income: 0,
          disbursements: 0,
          revenue_total: 0,
          outstanding: 0
        }
      }
      
      yearly_breakdown[year][status].bed_nights += parseInt(row['Bed nights']) || 0
      yearly_breakdown[year][status].accommodation += parseFloat(row['Accommodation']) || 0
      yearly_breakdown[year][status].income += parseFloat(row['Income']) || 0
      yearly_breakdown[year][status].disbursements += parseFloat(row['Disbursements']) || 0
      yearly_breakdown[year][status].revenue_total += parseFloat(row['Revenue Total']) || 0
      yearly_breakdown[year][status].outstanding += parseFloat(row['Total amount outstanding']) || 0
    }
  })
  
  // Monthly breakdown
  const monthly_breakdown: any = {}
  data.forEach(row => {
    const arrivalDate = row['Arrival date']
    if (arrivalDate) {
      const date = new Date(arrivalDate)
      const year = date.getFullYear().toString()
      const month = date.getMonth() + 1
      const status = row['Status'] || 'Unknown'
      
      if (!monthly_breakdown[year]) {
        monthly_breakdown[year] = {}
      }
      if (!monthly_breakdown[year][month]) {
        monthly_breakdown[year][month] = {}
      }
      if (!monthly_breakdown[year][month][status]) {
        monthly_breakdown[year][month][status] = {
          bed_nights: 0,
          accommodation: 0,
          income: 0,
          disbursements: 0,
          revenue_total: 0,
          outstanding: 0
        }
      }
      
      monthly_breakdown[year][month][status].bed_nights += parseInt(row['Bed nights']) || 0
      monthly_breakdown[year][month][status].accommodation += parseFloat(row['Accommodation']) || 0
      monthly_breakdown[year][month][status].income += parseFloat(row['Income']) || 0
      monthly_breakdown[year][month][status].disbursements += parseFloat(row['Disbursements']) || 0
      monthly_breakdown[year][month][status].revenue_total += parseFloat(row['Revenue Total']) || 0
      monthly_breakdown[year][month][status].outstanding += parseFloat(row['Total amount outstanding']) || 0
    }
  })
  
  // Yearly breakdown by booking class
  const yearly_breakdown_by_class: any = {}
  data.forEach(row => {
    const arrivalDate = row['Arrival date']
    if (arrivalDate) {
      const date = new Date(arrivalDate)
      const year = date.getFullYear().toString()
      const bookingClass = row['Booking Class'] || 'Unknown'
      
      if (!yearly_breakdown_by_class[year]) {
        yearly_breakdown_by_class[year] = {}
      }
      if (!yearly_breakdown_by_class[year][bookingClass]) {
        yearly_breakdown_by_class[year][bookingClass] = {
          bed_nights: 0,
          accommodation: 0,
          income: 0,
          disbursements: 0,
          revenue_total: 0,
          outstanding: 0
        }
      }
      
      yearly_breakdown_by_class[year][bookingClass].bed_nights += parseInt(row['Bed nights']) || 0
      yearly_breakdown_by_class[year][bookingClass].accommodation += parseFloat(row['Accommodation']) || 0
      yearly_breakdown_by_class[year][bookingClass].income += parseFloat(row['Income']) || 0
      yearly_breakdown_by_class[year][bookingClass].disbursements += parseFloat(row['Disbursements']) || 0
      yearly_breakdown_by_class[year][bookingClass].revenue_total += parseFloat(row['Revenue Total']) || 0
      yearly_breakdown_by_class[year][bookingClass].outstanding += parseFloat(row['Total amount outstanding']) || 0
    }
  })
  
  // Monthly breakdown by booking class
  const monthly_breakdown_by_class: any = {}
  data.forEach(row => {
    const arrivalDate = row['Arrival date']
    if (arrivalDate) {
      const date = new Date(arrivalDate)
      const year = date.getFullYear().toString()
      const month = date.getMonth() + 1
      const bookingClass = row['Booking Class'] || 'Unknown'
      
      if (!monthly_breakdown_by_class[year]) {
        monthly_breakdown_by_class[year] = {}
      }
      if (!monthly_breakdown_by_class[year][month]) {
        monthly_breakdown_by_class[year][month] = {}
      }
      if (!monthly_breakdown_by_class[year][month][bookingClass]) {
        monthly_breakdown_by_class[year][month][bookingClass] = {
          bed_nights: 0,
          accommodation: 0,
          income: 0,
          disbursements: 0,
          revenue_total: 0,
          outstanding: 0
        }
      }
      
      monthly_breakdown_by_class[year][month][bookingClass].bed_nights += parseInt(row['Bed nights']) || 0
      monthly_breakdown_by_class[year][month][bookingClass].accommodation += parseFloat(row['Accommodation']) || 0
      monthly_breakdown_by_class[year][month][bookingClass].income += parseFloat(row['Income']) || 0
      monthly_breakdown_by_class[year][month][bookingClass].disbursements += parseFloat(row['Disbursements']) || 0
      monthly_breakdown_by_class[year][month][bookingClass].revenue_total += parseFloat(row['Revenue Total']) || 0
      monthly_breakdown_by_class[year][month][bookingClass].outstanding += parseFloat(row['Total amount outstanding']) || 0
    }
  })
  
  // Combined breakdown by Year, Class, and Status
  const yearly_breakdown_combined: any = {}
  data.forEach(row => {
    const arrivalDate = row['Arrival date']
    if (arrivalDate) {
      const date = new Date(arrivalDate)
      const year = date.getFullYear().toString()
      const bookingClass = row['Booking Class'] || 'Unknown'
      const status = row['Status'] || 'Unknown'
      
      if (!yearly_breakdown_combined[year]) {
        yearly_breakdown_combined[year] = {}
      }
      if (!yearly_breakdown_combined[year][bookingClass]) {
        yearly_breakdown_combined[year][bookingClass] = {}
      }
      if (!yearly_breakdown_combined[year][bookingClass][status]) {
        yearly_breakdown_combined[year][bookingClass][status] = {
          count: 0,
          pax: 0,
          bed_nights: 0,
          accommodation: 0,
          income: 0,
          disbursements: 0,
          revenue_total: 0,
          outstanding: 0
        }
      }
      
      yearly_breakdown_combined[year][bookingClass][status].count++
      yearly_breakdown_combined[year][bookingClass][status].pax += parseInt(row['PAX']) || 0
      yearly_breakdown_combined[year][bookingClass][status].bed_nights += parseInt(row['Bed nights']) || 0
      yearly_breakdown_combined[year][bookingClass][status].accommodation += parseFloat(row['Accommodation']) || 0
      yearly_breakdown_combined[year][bookingClass][status].income += parseFloat(row['Income']) || 0
      yearly_breakdown_combined[year][bookingClass][status].disbursements += parseFloat(row['Disbursements']) || 0
      yearly_breakdown_combined[year][bookingClass][status].revenue_total += parseFloat(row['Revenue Total']) || 0
      yearly_breakdown_combined[year][bookingClass][status].outstanding += parseFloat(row['Total amount outstanding']) || 0
    }
  })
  
  // Combined breakdown by Year, Month, Class, and Status
  const monthly_breakdown_combined: any = {}
  data.forEach(row => {
    const arrivalDate = row['Arrival date']
    if (arrivalDate) {
      const date = new Date(arrivalDate)
      const year = date.getFullYear().toString()
      const month = date.getMonth() + 1
      const bookingClass = row['Booking Class'] || 'Unknown'
      const status = row['Status'] || 'Unknown'
      
      if (!monthly_breakdown_combined[year]) {
        monthly_breakdown_combined[year] = {}
      }
      if (!monthly_breakdown_combined[year][month]) {
        monthly_breakdown_combined[year][month] = {}
      }
      if (!monthly_breakdown_combined[year][month][bookingClass]) {
        monthly_breakdown_combined[year][month][bookingClass] = {}
      }
      if (!monthly_breakdown_combined[year][month][bookingClass][status]) {
        monthly_breakdown_combined[year][month][bookingClass][status] = {
          count: 0,
          pax: 0,
          bed_nights: 0,
          accommodation: 0,
          income: 0,
          disbursements: 0,
          revenue_total: 0,
          outstanding: 0
        }
      }
      
      monthly_breakdown_combined[year][month][bookingClass][status].count++
      monthly_breakdown_combined[year][month][bookingClass][status].pax += parseInt(row['PAX']) || 0
      monthly_breakdown_combined[year][month][bookingClass][status].bed_nights += parseInt(row['Bed nights']) || 0
      monthly_breakdown_combined[year][month][bookingClass][status].accommodation += parseFloat(row['Accommodation']) || 0
      monthly_breakdown_combined[year][month][bookingClass][status].income += parseFloat(row['Income']) || 0
      monthly_breakdown_combined[year][month][bookingClass][status].disbursements += parseFloat(row['Disbursements']) || 0
      monthly_breakdown_combined[year][month][bookingClass][status].revenue_total += parseFloat(row['Revenue Total']) || 0
      monthly_breakdown_combined[year][month][bookingClass][status].outstanding += parseFloat(row['Total amount outstanding']) || 0
    }
  })
  
  // Monthly bookings for detailed view
  const monthly_bookings: any = {}
  data.forEach(row => {
    const arrivalDate = row['Arrival date']
    if (arrivalDate) {
      const date = new Date(arrivalDate)
      const year = date.getFullYear().toString()
      const month = date.getMonth() + 1
      
      if (!monthly_bookings[year]) {
        monthly_bookings[year] = {}
      }
      if (!monthly_bookings[year][month]) {
        monthly_bookings[year][month] = []
      }
      
      monthly_bookings[year][month].push(row)
    }
  })
  
  // Top extras calculation
  const top_extras: any = {}
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
    '10% Discount', 'Accommodation'
  ]
  
  data.forEach(row => {
    incomeColumns.forEach(col => {
      const value = parseFloat(row[col]) || 0
      if (value > 0) {
        if (!top_extras[col]) {
          top_extras[col] = 0
        }
        top_extras[col] += value
      }
    })
  })
  
  // Payment status breakdown
  const payment_status = {
    fully_paid: 0,
    partially_paid: 0,
    unpaid: 0,
    overpaid: 0
  }
  
  data.forEach(row => {
    const totalPaid = parseFloat(row['Total amount paid']) || 0
    const totalOutstanding = parseFloat(row['Total amount outstanding']) || 0
    const totalRevenue = parseFloat(row['Revenue Total']) || 0
    
    if (totalOutstanding === 0 && totalPaid > 0) {
      payment_status.fully_paid++
    } else if (totalPaid > 0 && totalOutstanding > 0) {
      payment_status.partially_paid++
    } else if (totalPaid === 0 && totalOutstanding > 0) {
      payment_status.unpaid++
    } else if (totalPaid > totalRevenue && totalRevenue > 0) {
      payment_status.overpaid++
    }
  })
  
  console.log('Comprehensive breakdowns created successfully')
  
  return {
    summary,
    by_status,
    by_booking_class,
    by_source,
    by_agent,
    revenue_trends,
    top_extras,
    payment_status,
    yearly_breakdown,
    monthly_breakdown,
    yearly_breakdown_by_class,
    monthly_breakdown_by_class,
    yearly_breakdown_combined,
    monthly_breakdown_combined,
    monthly_bookings
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
    console.log(`CSV file size: ${csvText.length} characters`)
    
    try {
      // Call Cloud Function to process the CSV data
      console.log('Calling Cloud Function to process CSV data...')
      
      // Call the Cloud Function with the CSV content
      // Try 2nd gen Cloud Function URL format first, fallback to 1st gen format
      const cloudFunctionUrls = [
        process.env.CLOUD_FUNCTION_URL,
        'https://process-booking-data-q7elpl326q-uc.a.run.app', // 2nd gen direct URL
        'https://us-central1-dashboard-baines.cloudfunctions.net/process_booking_data' // Standard format
      ].filter(Boolean) as string[]
      
      let response: Response | null = null
      let lastError: Error | null = null
      
      for (const url of cloudFunctionUrls) {
        try {
          console.log('Trying Cloud Function URL:', url)
          response = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'text/csv',
            },
            body: csvText
          })
          
          if (response.ok) {
            console.log('✓ Successfully called Cloud Function at:', url)
            break
          } else {
            const errorText = await response.text()
            console.warn(`Cloud Function at ${url} returned ${response.status}:`, errorText.substring(0, 200))
            lastError = new Error(`Cloud Function failed: ${response.status} ${errorText}`)
            response = null
          }
        } catch (fetchError: any) {
          console.warn(`Failed to call Cloud Function at ${url}:`, fetchError.message)
          lastError = fetchError
          response = null
        }
      }
      
      if (!response || !response.ok) {
        const errorText = response ? await response.text() : 'No response'
        console.error('All Cloud Function URLs failed. Last error:', lastError?.message)
        throw new Error(`Cloud Function failed: ${response?.status || 'No response'} ${errorText}`)
      }
      
      const result = await response.json()
      console.log('Cloud Function processing completed:', result.message)
      console.log('Result keys:', Object.keys(result))
      console.log('Has dashboard_data:', !!result.dashboard_data)
      console.log('Full result structure:', JSON.stringify(result, null, 2).substring(0, 1000))

      const newTotalBookings =
        result?.summary?.total_bookings ??
        result.dashboard_data?.summary?.total_bookings ??
        0
      console.log('New dataset total bookings:', newTotalBookings)

      const MIN_BOOKING_RATIO = 0.8
      let previousTotalBookings = 0
      try {
        const db = getAdminDb()
        const existingDashboardDoc = await db.doc('dashboard/data').get()
        if (existingDashboardDoc.exists) {
          const existingSummary = existingDashboardDoc.data()?.summary as {
            total_bookings?: number
          } | undefined
          previousTotalBookings = existingSummary?.total_bookings ?? 0
        }
      } catch (docError) {
        console.warn('Unable to read existing dashboard summary:', docError)
      }

      if (newTotalBookings === 0) {
        console.error('Upload rejected: processed dataset has zero bookings')
        return NextResponse.json({
          error: 'Upload rejected: processed dataset has zero bookings',
          details: 'Please upload a full export from Opera/ResRequest instead of a filtered weekly file.'
        }, { status: 400 })
      }

      if (previousTotalBookings > 0) {
        const ratio = newTotalBookings / previousTotalBookings
        if (ratio < MIN_BOOKING_RATIO) {
          console.error(
            `Upload rejected: existing dataset has ${previousTotalBookings} bookings, new upload has ${newTotalBookings}`
          )
          return NextResponse.json({
            error: 'Upload rejected: dataset appears incomplete',
            details: `Existing dataset contains ${previousTotalBookings} bookings but the upload only includes ${newTotalBookings}. Please upload a complete export so historical data is preserved.`
          }, { status: 400 })
        }
      }

      // Store raw data and processed data in Firestore
      try {
        // Store raw CSV data in chunked parts to avoid 1MB limits
        console.log('Storing raw data to Firestore in chunked parts...')
        const uploadId = `${new Date().toISOString()}_${Math.random().toString(36).slice(2, 8)}`
        const CHUNK_SIZE = 900_000 // characters, safely under 1MB
        const totalParts = Math.ceil(csvText.length / CHUNK_SIZE)
        
        // Get Firestore instance and verify it's working
        console.log('Initializing Firestore Admin SDK...')
        const db = getAdminDb()
        console.log('Firestore Admin SDK initialized successfully')
        
        // Test write to verify permissions
        console.log('Testing Firestore write permissions...')
        const testDocRef = db.doc(`dashboard/_test_write_${Date.now()}`)
        await testDocRef.set({ test: true, timestamp: new Date().toISOString() })
        const testRead = await testDocRef.get()
        if (!testRead.exists) {
          throw new Error('Firestore write test failed: document was not created')
        }
        await testDocRef.delete() // Clean up test document
        console.log('✓ Firestore write permissions verified')
        
        await db.doc(`dashboard_raw_uploads/${uploadId}`).set({
          uploaded_at: new Date().toISOString(),
          filename: file.name,
          size: csvText.length,
          parts: totalParts
        })
        console.log(`✓ Created dashboard_raw_uploads/${uploadId} document`)
        for (let i = 0; i < totalParts; i++) {
          const start = i * CHUNK_SIZE
          const end = Math.min(start + CHUNK_SIZE, csvText.length)
          const chunk = csvText.slice(start, end)
          await db.doc(`dashboard_raw_uploads/${uploadId}/parts/${String(i).padStart(3, '0')}`).set({
            index: i,
            length: chunk.length,
            content: chunk
          })
        }
        console.log(`✓ Raw data stored in ${totalParts} parts under dashboard_raw_uploads/${uploadId}`)

        // Store processed dashboard data
        if (result.dashboard_data) {
          console.log('Storing dashboard data to Firestore...')
          console.log('Dashboard data keys:', Object.keys(result.dashboard_data))
          
          // Extract monthly_bookings for separate storage to stay under Firestore 1MB document limit
          const { monthly_bookings, ...dashboardDataToStore } = result.dashboard_data
          
          console.log('Data size before removal:', JSON.stringify(result.dashboard_data).length, 'bytes')
          console.log('Data size after removing monthly_bookings:', JSON.stringify(dashboardDataToStore).length, 'bytes')
          
          // Build per-year documents to keep individual docs small
          const {
            yearly_breakdown,
            monthly_breakdown,
            yearly_breakdown_by_class,
            monthly_breakdown_by_class,
            yearly_breakdown_combined,
            monthly_breakdown_combined,
            revenue_trends,
            // already removed monthly_bookings
            ...smallGlobals
          } = dashboardDataToStore as any

          // Persist small global aggregates (no large per-year maps) in main doc
          const dataToStore = {
            ...smallGlobals,
            last_updated: new Date().toISOString()
          }
          console.log('Storing to dashboard/data with keys:', Object.keys(dataToStore))
          console.log('Has summary:', !!dataToStore.summary)
          console.log('Data to store size:', JSON.stringify(dataToStore).length, 'bytes')
          
          const mainDocRef = db.doc('dashboard/data')
          console.log('Writing to dashboard/data...')
          await mainDocRef.set(dataToStore)
          console.log('✓ Write operation completed for dashboard/data')
          
          // Immediately verify the write
          const immediateCheck = await mainDocRef.get()
          if (!immediateCheck.exists) {
            throw new Error('Write completed but document does not exist immediately after write')
          }
          console.log('✓ Verified dashboard/data document exists immediately after write')

          // IMPORTANT: Delete all existing per-year documents first to ensure complete overwrite
          // This prevents old data from persisting when years are removed from the CSV
          console.log('Clearing existing per-year dashboard data documents for complete overwrite...')
          try {
            const existingPerYearCol = db.collection('dashboard_data_by_year')
            const existingPerYearSnap = await existingPerYearCol.get()
            const deletePerYearPromises = existingPerYearSnap.docs.map(doc => doc.ref.delete())
            await Promise.all(deletePerYearPromises)
            console.log(`✓ Deleted ${existingPerYearSnap.docs.length} existing per-year documents`)
          } catch (deleteError) {
            console.warn('Warning: Error deleting existing per-year documents:', deleteError)
            // Continue anyway - the .set() operations will overwrite
          }

          // Determine years from available per-year structures
          const yearSet = new Set<string>()
          const collectYears = (obj: any) => { if (obj && typeof obj === 'object') Object.keys(obj).forEach(y => yearSet.add(y)) }
          collectYears(yearly_breakdown)
          collectYears(monthly_breakdown)
          collectYears(yearly_breakdown_by_class)
          collectYears(monthly_breakdown_by_class)
          collectYears(yearly_breakdown_combined)
          collectYears(monthly_breakdown_combined)

          // Write per-year documents
          let perYearDocs = 0
          for (const year of Array.from(yearSet)) {
            const yearRevenueTrends: any = {}
            if (revenue_trends && typeof revenue_trends === 'object') {
              Object.entries(revenue_trends).forEach(([k, v]: any) => {
                if (k.startsWith(`${year}-`)) yearRevenueTrends[k] = v
              })
            }

            const perYearPayload = {
              year,
              revenue_trends: yearRevenueTrends,
              yearly_breakdown: yearly_breakdown?.[year] || {},
              monthly_breakdown: monthly_breakdown?.[year] || {},
              yearly_breakdown_by_class: yearly_breakdown_by_class?.[year] || {},
              monthly_breakdown_by_class: monthly_breakdown_by_class?.[year] || {},
              yearly_breakdown_combined: yearly_breakdown_combined?.[year] || {},
              monthly_breakdown_combined: monthly_breakdown_combined?.[year] || {},
              last_updated: new Date().toISOString()
            }
            await db.doc(`dashboard_data_by_year/${year}`).set(perYearPayload)
            perYearDocs++
          }
          console.log(`✓ Stored per-year dashboard data in ${perYearDocs} documents under 'dashboard_data_by_year'`)
          
          // Store monthly_bookings split by year-month to avoid 1MB limit
          // IMPORTANT: Delete all existing monthly_bookings first to ensure clean overwrite
          // This prevents old/cancelled bookings from persisting when they're not in the new CSV
          if (monthly_bookings && Object.keys(monthly_bookings).length > 0) {
            console.log('Clearing existing monthly_bookings documents for complete overwrite...')
            try {
              const existingMonthlyCol = db.collection('dashboard_monthly_bookings')
              const existingMonthlySnap = await existingMonthlyCol.get()
              const deletePromises = existingMonthlySnap.docs.map(doc => doc.ref.delete())
              await Promise.all(deletePromises)
              console.log(`✓ Deleted ${existingMonthlySnap.docs.length} existing monthly_bookings documents`)
            } catch (deleteError) {
              console.warn('Warning: Error deleting existing monthly_bookings:', deleteError)
              // Continue anyway - the .set() operations will overwrite
            }
            
            console.log('Storing monthly_bookings as per-month documents...')
            let totalDocs = 0
            for (const year of Object.keys(monthly_bookings)) {
              const months = monthly_bookings[year] || {}
              for (const month of Object.keys(months)) {
                const bookingsForMonth = months[month]
                // Normalize month to integer string (handle both "3" and "3.0")
                const monthNormalized = String(parseInt(month))
                const docId = `${year}-${monthNormalized}`
                // Write to a top-level collection to keep paths simple
                // Using .set() to completely overwrite any existing document
                await db.doc(`dashboard_monthly_bookings/${docId}`).set({
                  year,
                  month: monthNormalized,  // Store as integer string
                  bookings: bookingsForMonth,
                  last_updated: new Date().toISOString()
                })
                totalDocs++
              }
            }
            console.log(`✓ Monthly bookings stored across ${totalDocs} documents in 'dashboard_monthly_bookings'`)
          }
          
          // Verify data was stored by reading it back
          const verifyDoc = await db.doc('dashboard/data').get()
          if (!verifyDoc.exists) {
            throw new Error('Failed to verify data storage: dashboard/data document does not exist after write')
          }
          console.log('✓ Verified dashboard/data document exists')
        } else {
          console.warn('⚠ No dashboard_data in result. Result structure:', JSON.stringify(result, null, 2).substring(0, 500))
          throw new Error('Cloud Function did not return dashboard_data. Check Cloud Function logs for errors.')
        }
      } catch (firestoreError: any) {
        console.error('❌ Error storing data in Firestore:', firestoreError)
        console.error('Error details:', firestoreError.message)
        console.error('Error stack:', firestoreError.stack)
        // Re-throw the error so the upload fails if storage fails
        throw new Error(`Failed to store data in Firestore: ${firestoreError.message}`)
      }

      // Return response including storage status
      const response_data: any = {
        message: 'File uploaded and processed successfully',
        details: result.message,
        summary: result.summary,
        timestamp: result.timestamp || new Date().toISOString()
      }

      // Include storage status
      if (!result.dashboard_data) {
        response_data.warning = 'Dashboard data not found in Cloud Function response'
        console.error('⚠️ Dashboard data missing from Cloud Function response')
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