import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

// CSV processing functions
function parseCSV(csvText: string): any[] {
  const lines = csvText.split('\n').map(line => line.trim()).filter(line => line.length > 0)
  if (lines.length < 2) return []

  // Find the header row - look for a row containing "Guest Name" (case-insensitive)
  let headerIndex = 0
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].toLowerCase().includes('guest name')) {
      headerIndex = i
      break
    }
  }

  const headers = lines[headerIndex].split(',').map(h => h.trim().replace(/"/g, ''))
  console.log('Found headers:', headers)
  
  const data: any[] = []
  // Start processing from the row after the header
  for (let i = headerIndex + 1; i < lines.length; i++) {
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
      // Normalize header name (remove trailing spaces) for consistent access
      const normalizedHeader = header.trim()
      row[normalizedHeader] = values[index] || ''
      // Also keep original header name for backward compatibility
      if (normalizedHeader !== header) {
        row[header] = values[index] || ''
      }
    })
    data.push(row)
  }
  
  console.log(`Parsed ${data.length} rows from CSV`)
  return data
}

function extractEmail(text: string): string {
  if (!text) return ''
  
  // Try to find email pattern
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g
  const matches = text.match(emailRegex)
  if (matches && matches.length > 0) {
    return matches[0].toLowerCase().trim()
  }
  
  // If no email pattern found but text looks like an email, return as-is
  if (text.includes('@') && text.includes('.')) {
    return text.toLowerCase().trim()
  }
  
  return ''
}

function normalizeRating(rating: string): 'Poor' | 'Average' | 'Good' | 'Excellent' | '' {
  if (!rating) return ''
  
  const ratingLower = rating.trim().toLowerCase()
  
  // Direct matches
  if (ratingLower === 'poor') return 'Poor'
  if (ratingLower === 'average') return 'Average'
  if (ratingLower === 'good') return 'Good'
  if (ratingLower === 'excellent') return 'Excellent'
  
  // Numeric mappings (if ratings are stored as numbers)
  if (ratingLower === '1') return 'Poor'
  if (ratingLower === '2') return 'Average'
  if (ratingLower === '3') return 'Good'
  if (ratingLower === '4') return 'Excellent'
  
  // Try to match partial strings
  if (ratingLower.includes('poor')) return 'Poor'
  if (ratingLower.includes('average')) return 'Average'
  if (ratingLower.includes('good')) return 'Good'
  if (ratingLower.includes('excellent')) return 'Excellent'
  
  return ''
}

function processGuestFeedbackData(data: any[]): any[] {
  console.log(`Processing ${data.length} guest feedback records...`)
  if (data.length > 0) {
    console.log('Sample row keys:', Object.keys(data[0]))
    console.log('Sample row:', JSON.stringify(data[0], null, 2))
  }
  
  const validRatings: ('Poor' | 'Average' | 'Good' | 'Excellent')[] = ['Poor', 'Average', 'Good', 'Excellent']
  
  const processed = data.map((row, index) => {
    // Helper function to find column value by case-insensitive, space-tolerant matching
    const findColumn = (possibleNames: string[]): string => {
      // First try exact matches
      for (const name of possibleNames) {
        if (row[name] !== undefined && row[name] !== '') {
          return row[name]
        }
      }
      // Then try case-insensitive, space-tolerant matching
      const rowKeys = Object.keys(row)
      for (const name of possibleNames) {
        const normalizedName = name.trim().toLowerCase()
        const foundKey = rowKeys.find(k => k.trim().toLowerCase() === normalizedName)
        if (foundKey && row[foundKey] !== undefined && row[foundKey] !== '') {
          return row[foundKey]
        }
      }
      return ''
    }
    
    // Try different possible column name variations (case-insensitive, space-tolerant)
    const guestName = findColumn(['Guest Name', 'GuestName', 'guestName', 'GUEST NAME']) || ''
    
    // Email column might have trailing space: "Email " 
    const emailRaw = findColumn(['Email', 'Email ', 'EMAIL', 'email', 'Email Address', 'EMAIL ADDRESS']) || ''
    
    // Extract ratings using helper function for consistency
    const service = normalizeRating(findColumn(['Service', 'SERVICE', 'service']))
    const food = normalizeRating(findColumn(['Food', 'FOOD', 'food']))
    const activities = normalizeRating(findColumn(['Activities', 'ACTIVITIES', 'activities']))
    const lodgeStaff = normalizeRating(findColumn(['Lodge Staff', 'LodgeStaff', 'lodgeStaff', 'LODGE STAFF', 'Lodge Staff']))
    const accommodation = normalizeRating(findColumn(['Accommodation', 'ACCOMMODATION', 'accommodation']))
    const overallStay = normalizeRating(findColumn(['Overall Stay', 'OverallStay', 'overallStay', 'OVERALL STAY', 'Overall']))
    const comments = findColumn(['Comments', 'COMMENTS', 'comments', 'Comment']) || ''
    
    // Try to extract checkout date from various possible column names
    // Also check "Booking Dates" which might contain month names like "MARCH", "APRIL"
    let checkoutDate = findColumn(['Checkout Date', 'CheckoutDate', 'checkoutDate', 'CHECKOUT DATE', 
                                  'Date', 'DATE', 'date', 'Checkout', 'CHECKOUT', 'Booking Dates', 'Booking Dates '])
    
    // Extract email from email field
    const emailAddress = extractEmail(emailRaw)
    
    // Handle checkout date - might be a month name like "MARCH", "APRIL", etc.
    if (!checkoutDate || checkoutDate.trim() === '') {
      const today = new Date()
      checkoutDate = today.toISOString().split('T')[0] // Format: YYYY-MM-DD
      console.log(`No checkout date found for ${guestName}, defaulting to today: ${checkoutDate}`)
    } else {
      const checkoutDateUpper = checkoutDate.trim().toUpperCase()
      // Map month names to dates (use first day of that month in current year)
      const monthMap: { [key: string]: number } = {
        'JANUARY': 0, 'FEBRUARY': 1, 'MARCH': 2, 'APRIL': 3, 'MAY': 4, 'JUNE': 5,
        'JULY': 6, 'AUGUST': 7, 'SEPTEMBER': 8, 'OCTOBER': 9, 'NOVEMBER': 10, 'DECEMBER': 11
      }
      
      if (monthMap[checkoutDateUpper] !== undefined) {
        // It's a month name - use first day of that month in current year
        const today = new Date()
        const year = today.getFullYear()
        const month = monthMap[checkoutDateUpper]
        checkoutDate = new Date(year, month, 1).toISOString().split('T')[0]
        console.log(`Converted month "${checkoutDateUpper}" to date: ${checkoutDate} for ${guestName}`)
      } else {
        // Try to parse as a regular date
        try {
          const parsedDate = new Date(checkoutDate)
          if (!isNaN(parsedDate.getTime())) {
            checkoutDate = parsedDate.toISOString().split('T')[0] // Normalize to YYYY-MM-DD
          } else {
            // If parsing fails, use today's date
            const today = new Date()
            checkoutDate = today.toISOString().split('T')[0]
            console.log(`Invalid date format "${checkoutDate}" for ${guestName}, defaulting to today: ${checkoutDate}`)
          }
        } catch (e) {
          // If parsing fails, use today's date
          const today = new Date()
          checkoutDate = today.toISOString().split('T')[0]
          console.log(`Date parsing error for ${guestName}, defaulting to today: ${checkoutDate}`)
        }
      }
    }
    
    return {
      guestName: guestName.trim(),
      emailAddress: emailAddress,
      checkoutDate: checkoutDate.trim(),
      service,
      food,
      activities,
      lodgeStaff,
      accommodation,
      overallStay,
      comments: comments?.trim() || undefined,
    }
  })

  // Filter out records with missing required fields
  const initialCount = processed.length
  const filtered = processed.filter((feedback, index) => {
    const hasName = feedback.guestName && feedback.guestName.trim() !== ''
    // Email is now optional, so we don't check hasEmail
    const hasAllRatings = feedback.service !== '' && validRatings.includes(feedback.service as typeof validRatings[number]) &&
                         feedback.food !== '' && validRatings.includes(feedback.food as typeof validRatings[number]) &&
                         feedback.activities !== '' && validRatings.includes(feedback.activities as typeof validRatings[number]) &&
                         feedback.lodgeStaff !== '' && validRatings.includes(feedback.lodgeStaff as typeof validRatings[number]) &&
                         feedback.accommodation !== '' && validRatings.includes(feedback.accommodation as typeof validRatings[number]) &&
                         feedback.overallStay !== '' && validRatings.includes(feedback.overallStay as typeof validRatings[number])
    
    if (!hasName || !hasAllRatings) {
      console.warn(`Skipping row ${index + 2}: Missing required fields`, {
        hasName,
        hasAllRatings,
        guestName: feedback.guestName,
        emailAddress: feedback.emailAddress || '(not provided)',
        ratings: {
          service: feedback.service,
          food: feedback.food,
          activities: feedback.activities,
          lodgeStaff: feedback.lodgeStaff,
          accommodation: feedback.accommodation,
          overallStay: feedback.overallStay
        }
      })
      return false
    }
    
    return true
  })

  const removedCount = initialCount - filtered.length
  console.log(`Processed ${filtered.length} guest feedback records (removed ${removedCount} records with missing/invalid data)`)
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

    const processedData = processGuestFeedbackData(rawData)
    
    if (processedData.length === 0) {
      return NextResponse.json(
        { error: 'No valid feedback records found after processing. Please check that all required fields (Guest Name and all ratings) are present. Email is optional.' },
        { status: 400 }
      )
    }

    // Use Firebase Admin SDK for server-side writes (bypasses security rules)
    const { getAdminDb } = await import('@/lib/firebase-admin')
    const adminDb = getAdminDb()
    const { Timestamp } = await import('firebase-admin/firestore')

    // Add each feedback record to Firestore
    let totalAdded = 0
    let errors: string[] = []

    for (const feedback of processedData) {
      try {
        // Create timestamp from checkout date (end of day to ensure it's the checkout date)
        const checkoutDateTime = new Date(feedback.checkoutDate + 'T23:59:59')
        
        // Prepare data for Firestore
        const data: any = {
          guestName: feedback.guestName,
          checkoutDate: feedback.checkoutDate,
          service: feedback.service,
          food: feedback.food,
          activities: feedback.activities,
          lodgeStaff: feedback.lodgeStaff,
          accommodation: feedback.accommodation,
          overallStay: feedback.overallStay,
          timestamp: Timestamp.fromDate(checkoutDateTime),
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now()
        }
        
        // Only include emailAddress if it's defined
        if (feedback.emailAddress !== undefined && feedback.emailAddress !== null && feedback.emailAddress !== '') {
          data.emailAddress = feedback.emailAddress
        }
        
        // Only include comments if it's defined
        if (feedback.comments !== undefined && feedback.comments !== null && feedback.comments !== '') {
          data.comments = feedback.comments
        }
        
        // Add to Firestore using Admin SDK
        const docRef = adminDb.collection('guest_feedback').doc()
        await docRef.set(data)
        totalAdded++
      } catch (error) {
        const errorMsg = `Failed to add feedback for ${feedback.guestName}: ${(error as Error).message}`
        console.error(errorMsg, error)
        errors.push(errorMsg)
      }
    }

    if (errors.length > 0) {
      console.warn(`Some records failed to upload: ${errors.length} errors`)
    }

    console.log(`Guest feedback data saved to Firestore: ${totalAdded}/${processedData.length} records`)

    return NextResponse.json({
      message: `Guest feedback uploaded and processed successfully. ${totalAdded} records added${errors.length > 0 ? ` (${errors.length} errors)` : ''}.`,
      totalRecords: totalAdded,
      errors: errors.length > 0 ? errors : undefined
    }, {
      status: 200,
      headers: { 'Cache-Control': 'no-store' }
    })
  } catch (error) {
    console.error('Error processing guest feedback data:', error)
    return NextResponse.json(
      { error: 'Failed to process guest feedback data: ' + (error as Error).message },
      { status: 500 }
    )
  }
}

