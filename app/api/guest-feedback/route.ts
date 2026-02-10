import { NextRequest, NextResponse } from 'next/server'
import { getAdminDb } from '@/lib/firebase-admin'

export const dynamic = 'force-dynamic'
export const revalidate = 0

type Rating = 'Poor' | 'Average' | 'Good' | 'Excellent'

const GUEST_FEEDBACK_COLLECTION = 'guest_feedback'

// GET - Fetch all guest feedback
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const pageSize = parseInt(searchParams.get('pageSize') || '1000')
    
    // Use Admin SDK for server-side reads
    const adminDb = getAdminDb()
    const snapshot = await adminDb.collection(GUEST_FEEDBACK_COLLECTION)
      .orderBy('timestamp', 'desc')
      .limit(pageSize)
      .get()
    
    const data = snapshot.docs.map(doc => {
      const docData = doc.data()
      // Convert Firestore Timestamp to ISO string
      const timestamp = docData.timestamp?.toDate?.()?.toISOString() || docData.timestamp || new Date().toISOString()
      const createdAt = docData.createdAt?.toDate?.()?.toISOString() || docData.createdAt
      const updatedAt = docData.updatedAt?.toDate?.()?.toISOString() || docData.updatedAt
      
      return {
        id: doc.id,
        ...docData,
        timestamp,
        createdAt,
        updatedAt
      }
    })
    
    return NextResponse.json(data, {
      status: 200,
      headers: { 'Cache-Control': 'no-store' }
    })
  } catch (error) {
    console.error('Error reading guest feedback data:', error)
    return NextResponse.json(
      { error: 'Failed to read guest feedback data: ' + (error as Error).message },
      { status: 500 }
    )
  }
}

// POST - Add new guest feedback
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { guestName, emailAddress, checkoutDate, service, food, activities, lodgeStaff, accommodation, overallStay, comments } = body

    // Validation
    if (!guestName || !guestName.trim()) {
      return NextResponse.json(
        { message: 'Guest name is required' },
        { status: 400 }
      )
    }

    // Validate checkout date
    if (!checkoutDate || !checkoutDate.trim()) {
      return NextResponse.json(
        { message: 'Checkout date is required' },
        { status: 400 }
      )
    }

    // Create timestamp from checkout date (end of day to ensure it's the checkout date)
    const checkoutDateTime = new Date(checkoutDate + 'T23:59:59')
    if (isNaN(checkoutDateTime.getTime())) {
      return NextResponse.json(
        { message: 'Invalid checkout date format' },
        { status: 400 }
      )
    }

    const validRatings: Rating[] = ['Poor', 'Average', 'Good', 'Excellent']
    const ratings = { service, food, activities, lodgeStaff, accommodation, overallStay }
    
    for (const [key, value] of Object.entries(ratings)) {
      if (!value || !validRatings.includes(value as Rating)) {
        return NextResponse.json(
          { message: `Invalid rating for ${key}. Must be one of: ${validRatings.join(', ')}` },
          { status: 400 }
        )
      }
    }

    // Email validation (optional, but if provided must be valid)
    let processedEmail: string | undefined = undefined
    if (emailAddress !== undefined && emailAddress !== null && emailAddress.trim() !== '') {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      const trimmedEmail = emailAddress.trim().toLowerCase()
      if (!emailRegex.test(trimmedEmail)) {
      return NextResponse.json(
        { message: 'Invalid email address format' },
        { status: 400 }
      )
    }
      processedEmail = trimmedEmail
    }
    // If emailAddress is empty string or undefined, processedEmail stays undefined
    // This means the field won't be included in the document

    // Create new feedback entry
    const newFeedback: any = {
      guestName: guestName.trim(),
      checkoutDate: checkoutDate.trim(),
      service,
      food,
      activities,
      lodgeStaff,
      accommodation,
      overallStay,
      timestamp: checkoutDateTime.toISOString(), // Use checkout date as timestamp
    }

    // Only include emailAddress if it's provided and valid
    if (processedEmail !== undefined) {
      newFeedback.emailAddress = processedEmail
    }
    
    // Only include comments if provided
    if (comments !== undefined && comments !== null && comments.trim() !== '') {
      newFeedback.comments = comments.trim()
    }

    // Add to Firestore using Admin SDK
    const adminDb = getAdminDb()
    const { Timestamp } = await import('firebase-admin/firestore')
    
    const data: any = {
      guestName: newFeedback.guestName,
      checkoutDate: newFeedback.checkoutDate,
      service: newFeedback.service,
      food: newFeedback.food,
      activities: newFeedback.activities,
      lodgeStaff: newFeedback.lodgeStaff,
      accommodation: newFeedback.accommodation,
      overallStay: newFeedback.overallStay,
      timestamp: Timestamp.fromDate(checkoutDateTime),
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    }
    
    if (newFeedback.emailAddress !== undefined) {
      data.emailAddress = newFeedback.emailAddress
    }
    
    if (newFeedback.comments !== undefined) {
      data.comments = newFeedback.comments
    }
    
    const docRef = adminDb.collection(GUEST_FEEDBACK_COLLECTION).doc()
    await docRef.set(data)

    return NextResponse.json({ ...newFeedback, id: docRef.id }, { status: 201 })
  } catch (error) {
    console.error('Error saving guest feedback:', error)
    return NextResponse.json(
      { message: 'Failed to save guest feedback' },
      { status: 500 }
    )
  }
}

// PUT - Update existing guest feedback
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, guestName, emailAddress, checkoutDate, service, food, activities, lodgeStaff, accommodation, overallStay, comments } = body

    if (!id) {
      return NextResponse.json(
        { message: 'Feedback ID is required' },
        { status: 400 }
      )
    }

    // Validation
    if (!guestName || !guestName.trim()) {
      return NextResponse.json(
        { message: 'Guest name is required' },
        { status: 400 }
      )
    }

    // Validate checkout date
    if (!checkoutDate || !checkoutDate.trim()) {
      return NextResponse.json(
        { message: 'Checkout date is required' },
        { status: 400 }
      )
    }

    // Create timestamp from checkout date (end of day to ensure it's the checkout date)
    const checkoutDateTime = new Date(checkoutDate + 'T23:59:59')
    if (isNaN(checkoutDateTime.getTime())) {
      return NextResponse.json(
        { message: 'Invalid checkout date format' },
        { status: 400 }
      )
    }

    const validRatings: Rating[] = ['Poor', 'Average', 'Good', 'Excellent']
    const ratings = { service, food, activities, lodgeStaff, accommodation, overallStay }
    
    for (const [key, value] of Object.entries(ratings)) {
      if (!value || !validRatings.includes(value as Rating)) {
        return NextResponse.json(
          { message: `Invalid rating for ${key}. Must be one of: ${validRatings.join(', ')}` },
          { status: 400 }
        )
      }
    }

    // Email validation (optional, but if provided must be valid)
    // Use empty string to signal deletion, undefined means don't update the field
    let processedEmail: string | '' | undefined = undefined
    if (emailAddress !== undefined && emailAddress !== null) {
      const trimmedEmail = emailAddress.trim()
      if (trimmedEmail === '') {
        // Empty string means delete the field
        processedEmail = ''
      } else {
        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(trimmedEmail)) {
          return NextResponse.json(
            { message: 'Invalid email address format' },
            { status: 400 }
          )
        }
        processedEmail = trimmedEmail.toLowerCase()
      }
    }

    // Update feedback entry
    const updateData: any = {
      guestName: guestName.trim(),
      checkoutDate: checkoutDate.trim(),
      service,
      food,
      activities,
      lodgeStaff,
      accommodation,
      overallStay,
      timestamp: checkoutDateTime.toISOString(), // Update timestamp from checkout date
    }
    
    // Only include emailAddress if it was provided (even if empty string to delete)
    if (processedEmail !== undefined) {
      updateData.emailAddress = processedEmail
    }
    
    // Handle comments
    if (comments !== undefined) {
      updateData.comments = comments?.trim() || ''
    }

    // Update in Firestore using Admin SDK
    const adminDb = getAdminDb()
    const { Timestamp } = await import('firebase-admin/firestore')
    
    const docRef = adminDb.collection(GUEST_FEEDBACK_COLLECTION).doc(id)
    
    const firestoreUpdateData: any = {
      guestName: updateData.guestName,
      checkoutDate: updateData.checkoutDate,
      service: updateData.service,
      food: updateData.food,
      activities: updateData.activities,
      lodgeStaff: updateData.lodgeStaff,
      accommodation: updateData.accommodation,
      overallStay: updateData.overallStay,
      timestamp: Timestamp.fromDate(checkoutDateTime),
      updatedAt: Timestamp.now()
    }
    
    if (updateData.emailAddress !== undefined) {
      if (updateData.emailAddress === '') {
        // Delete the field
        const { FieldValue } = await import('firebase-admin/firestore')
        firestoreUpdateData.emailAddress = FieldValue.delete()
      } else {
        firestoreUpdateData.emailAddress = updateData.emailAddress
      }
    }
    
    if (updateData.comments !== undefined) {
      firestoreUpdateData.comments = updateData.comments
    }
    
    await docRef.update(firestoreUpdateData)

    return NextResponse.json({ id, ...updateData }, { status: 200 })
  } catch (error) {
    console.error('Error updating guest feedback:', error)
    return NextResponse.json(
      { message: 'Failed to update guest feedback' },
      { status: 500 }
    )
  }
}

// DELETE - Delete a feedback entry
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { message: 'Missing feedback ID' },
        { status: 400 }
      )
    }

    // Delete from Firestore using Admin SDK
    const adminDb = getAdminDb()
    await adminDb.collection(GUEST_FEEDBACK_COLLECTION).doc(id).delete()

    return NextResponse.json({ message: 'Feedback deleted successfully' }, { status: 200 })
  } catch (error) {
    console.error('Error deleting guest feedback:', error)
    return NextResponse.json(
      { message: 'Failed to delete guest feedback' },
      { status: 500 }
    )
  }
}

