import { NextRequest, NextResponse } from 'next/server'
import { initializeApp } from 'firebase/app'
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore'

export const dynamic = 'force-dynamic'
export const revalidate = 0

// Initialize Firebase
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

function applyBusinessRules(data: any[]) {
  console.log('Applying business rules to data...')
  
  // Rule 1: Remove all bookings for Property "MV-Matusadona"
  let filtered = data.filter(row => {
    const property = row['Property'] || ''
    return !property.toLowerCase().includes('matusadona')
  })
  console.log(`After Rule 1 (Remove Matusadona): ${filtered.length} bookings`)
  
  // Rule 2: Remove bookings containing specific names, with exceptions
  filtered = filtered.filter(row => {
    const reservationName = (row['Reservation name'] || '').toLowerCase()
    const reservationNumber = row['Reservation #'] || ''
    const source = row['Source'] || ''
    
    // Check for excluded names
    const excludedNames = ['scott', 'brown', 'craig', 'featherby', 'twf', 'staff']
    const hasExcludedName = excludedNames.some(name => reservationName.includes(name))
    
    // Exception booking numbers
    const exceptionNumbers = ['WB3703', 'WB4118', 'WB2748', 'WB4001', 'WB3556', 'WB4121', 'WB4194', 'WB4362']
    const isException = exceptionNumbers.includes(reservationNumber)
    
    // Exception for Return Guests source
    const isReturnGuest = source.toLowerCase().includes('return guests')
    
    // Keep if no excluded name, or if it's an exception
    return !hasExcludedName || isException || isReturnGuest
  })
  console.log(`After Rule 2 (Remove staff bookings): ${filtered.length} bookings`)
  
  // Rule 3 & 4: Create Booking Class
  filtered = filtered.map(row => {
    const accommodation = parseFloat(row['Accommodation']) || 0
    const reservationNumber = row['Reservation #'] || ''
    
    // Exception booking numbers for Non-Income Generating
    const nonIncomeExceptions = ['WB3964', 'WB3762', 'WB4193', 'WB4242']
    
    let bookingClass = 'Income Generating'
    if (accommodation === 0 && !nonIncomeExceptions.includes(reservationNumber)) {
      bookingClass = 'Non-Income Generating'
    }
    
    return {
      ...row,
      'Booking Class': bookingClass
    }
  })
  
  // Rule 5: Create Income column
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
  
  filtered = filtered.map(row => {
    let income = 0
    incomeColumns.forEach(col => {
      const value = parseFloat(row[col]) || 0
      income += value
    })
    
    return {
      ...row,
      'Income': income
    }
  })
  
  // Rule 6: Create Disbursements column
  filtered = filtered.map(row => {
    const revenueTotal = parseFloat(row['Revenue Total']) || 0
    const income = parseFloat(row['Income']) || 0
    const disbursements = revenueTotal - income
    
    return {
      ...row,
      'Disbursements': disbursements
    }
  })
  
  console.log('Business rules applied successfully')
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
    console.log('Reprocessing stored data...')
    
    // Get raw data from Firestore
    const rawDataDoc = await getDoc(doc(db, 'dashboard', 'raw_data'))
    
    if (!rawDataDoc.exists()) {
      return NextResponse.json({
        error: 'No raw data found. Please upload a CSV file first.'
      }, { status: 404 })
    }
    
    const rawData = rawDataDoc.data()
    const bookings = rawData.bookings || []
    
    console.log(`Found ${bookings.length} bookings to reprocess`)
    
    if (bookings.length === 0) {
      return NextResponse.json({
        error: 'No bookings found in stored data.'
      }, { status: 404 })
    }
    
    // Convert bookings back to CSV format for Cloud Function
    const csvContent = convertBookingsToCSV(bookings)
    
    // Call the Cloud Function
    const cloudFunctionUrl = 'https://us-central1-dashboard-baines.cloudfunctions.net/process_booking_data'
    
    const response = await fetch(cloudFunctionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/csv',
      },
      body: csvContent
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Cloud Function failed: ${response.status} ${errorText}`)
    }
    
    const result = await response.json()
    console.log('Cloud Function reprocessing completed:', result.message)
    
    return NextResponse.json({
      message: 'Data reprocessed successfully',
      details: result.message,
      summary: result.summary,
      timestamp: result.timestamp
    })
    
  } catch (error: any) {
    console.error('Processing error:', error)
    return NextResponse.json({
      error: 'Failed to process stored data',
      details: error.message
    }, { status: 500 })
  }
}

function convertBookingsToCSV(bookings: any[]): string {
  if (bookings.length === 0) return ''
  
  // Get headers from the first booking
  const headers = Object.keys(bookings[0])
  
  // Create CSV content
  const csvRows = [headers.join(',')]
  
  for (const booking of bookings) {
    const values = headers.map(header => {
      const value = booking[header]
      // Escape commas and quotes in values
      if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
        return `"${value.replace(/"/g, '""')}"`
      }
      return value || ''
    })
    csvRows.push(values.join(','))
  }
  
  return csvRows.join('\n')
}
