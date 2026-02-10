import { NextRequest, NextResponse } from 'next/server'
import { getAdminDb } from '@/lib/firebase-admin'
import { Timestamp, FieldValue } from 'firebase-admin/firestore'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const FISHING_COLLECTION = 'fishing_catches'

const VALID_SPECIES = ['Tiger Fish', 'Vundu'] as const
const VALID_AREAS = ['GMA', 'Park'] as const

type Species = (typeof VALID_SPECIES)[number]
type Area = (typeof VALID_AREAS)[number]

const isValidSpecies = (value: any): value is Species =>
  VALID_SPECIES.includes(value)

const isValidArea = (value: any): value is Area =>
  VALID_AREAS.includes(value)

const normalizeLocation = (coords: any) => {
  if (!coords) return undefined
  const latValue = typeof coords.lat === 'string' ? parseFloat(coords.lat) : coords.lat
  const lngValue = typeof coords.lng === 'string' ? parseFloat(coords.lng) : coords.lng

  if (
    typeof latValue !== 'number' ||
    typeof lngValue !== 'number' ||
    Number.isNaN(latValue) ||
    Number.isNaN(lngValue)
  ) {
    throw new Error('INVALID_COORDINATES')
  }

  return {
    lat: latValue,
    lng: lngValue,
  }
}

// Helper to convert Firestore timestamp to ISO string
const timestampToISO = (timestamp: any): string => {
  if (timestamp?.toDate) {
    return timestamp.toDate().toISOString()
  }
  if (timestamp instanceof Timestamp) {
    return timestamp.toDate().toISOString()
  }
  return timestamp || new Date().toISOString()
}

// GET - Fetch all fishing catches
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const pageSize = parseInt(searchParams.get('pageSize') || '1000')
    
    // Use Admin SDK for server-side reads
    const adminDb = getAdminDb()
    const snapshot = await adminDb.collection(FISHING_COLLECTION)
      .orderBy('timestamp', 'desc')
      .limit(pageSize)
      .get()
    
    const data = snapshot.docs.map(doc => {
      const docData = doc.data()
      return {
        id: doc.id,
        ...docData,
        area: (docData.area as 'GMA' | 'Park') || 'GMA',
        timestamp: timestampToISO(docData.timestamp || docData.createdAt)
      }
    })
    
    return NextResponse.json(data, {
      status: 200,
      headers: { 'Cache-Control': 'no-store' }
    })
  } catch (error) {
    console.error('Error reading fishing data:', error)
    return NextResponse.json([], { status: 200 })
  }
}

// POST - Add a new fishing catch
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { date, time, guide, species, weight, location, weather, area } = body

    // Validation
    if (!date || !guide || !species || !weight || !area) {
      return NextResponse.json(
        { message: 'Missing required fields' },
        { status: 400 }
      )
    }

    if (!isValidSpecies(species)) {
      return NextResponse.json(
        { message: 'Invalid species. Must be "Tiger Fish" or "Vundu"' },
        { status: 400 }
      )
    }

    if (!isValidArea(area)) {
      return NextResponse.json(
        { message: 'Invalid area. Must be "GMA" or "Park"' },
        { status: 400 }
      )
    }

    // Convert weight to number if it's a string
    const weightNum = typeof weight === 'string' ? parseFloat(weight) : weight
    if (typeof weightNum !== 'number' || isNaN(weightNum) || weightNum <= 0) {
      return NextResponse.json(
        { message: 'Weight must be a positive number' },
        { status: 400 }
      )
    }

    let processedLocation
    try {
      processedLocation = normalizeLocation(location)
    } catch {
      return NextResponse.json(
        { message: 'Invalid coordinates supplied' },
        { status: 400 }
      )
    }

    // Create timestamp from date and time if provided, otherwise use current time
    const timestamp = time
      ? new Date(`${date}T${time}`).toISOString()
      : new Date().toISOString()

    // Create new catch
    const newCatch: any = {
      date,
      time: time || undefined,
      guide: guide.trim(),
      species,
      weight: weightNum,
      area,
      timestamp,
    }

    if (processedLocation) {
      newCatch.location = processedLocation
    }

    if (weather) {
      newCatch.weather = weather
    }

    // Add to Firestore using Admin SDK
    const adminDb = getAdminDb()
    const docRef = adminDb.collection(FISHING_COLLECTION).doc()
    const catchId = docRef.id
    
    const firestoreData: any = {
      ...newCatch,
      timestamp: Timestamp.fromDate(new Date(newCatch.timestamp)),
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    }
    
    if (newCatch.location === undefined) {
      delete firestoreData.location
    }
    
    await docRef.set(firestoreData)

    return NextResponse.json({ ...newCatch, id: catchId }, { status: 201 })
  } catch (error) {
    console.error('Error saving fishing catch:', error)
    return NextResponse.json(
      { message: 'Failed to save fishing catch' },
      { status: 500 }
    )
  }
}

// PUT - Update an existing fishing catch
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, date, time, guide, species, weight, location, weather, area } = body

    if (!id) {
      return NextResponse.json(
        { message: 'Missing catch ID' },
        { status: 400 }
      )
    }

    // Validation
    if (!date || !guide || !species || !weight || !area) {
      return NextResponse.json(
        { message: 'Missing required fields' },
        { status: 400 }
      )
    }

    if (!isValidSpecies(species)) {
      return NextResponse.json(
        { message: 'Invalid species. Must be "Tiger Fish" or "Vundu"' },
        { status: 400 }
      )
    }

    if (!isValidArea(area)) {
      return NextResponse.json(
        { message: 'Invalid area. Must be "GMA" or "Park"' },
        { status: 400 }
      )
    }

    // Convert weight to number if it's a string
    const weightNum = typeof weight === 'string' ? parseFloat(weight) : weight
    if (typeof weightNum !== 'number' || isNaN(weightNum) || weightNum <= 0) {
      return NextResponse.json(
        { message: 'Weight must be a positive number' },
        { status: 400 }
      )
    }

    let processedLocation: { lat: number; lng: number } | null | undefined
    if (location === null) {
      processedLocation = null
    } else if (location !== undefined) {
      try {
        processedLocation = normalizeLocation(location)
      } catch {
      return NextResponse.json(
          { message: 'Invalid coordinates supplied' },
        { status: 400 }
      )
    }
    }

    // Get existing catch to preserve timestamp logic using Admin SDK
    const adminDb = getAdminDb()
    const catchDocRef = adminDb.collection(FISHING_COLLECTION).doc(id)
    const catchDoc = await catchDocRef.get()
    
    if (!catchDoc.exists) {
      return NextResponse.json(
        { message: 'Catch not found' },
        { status: 404 }
      )
    }

    const existingCatch = catchDoc.data()
    
    if (!existingCatch) {
      return NextResponse.json(
        { message: 'Catch data not found' },
        { status: 404 }
      )
    }

    // Update timestamp if date or time changed
    let timestamp = existingCatch.timestamp?.toDate?.()?.toISOString() || existingCatch.timestamp
    if (time && date) {
      timestamp = new Date(`${date}T${time}`).toISOString()
    } else if (date && existingCatch.date !== date) {
      const existingTime = time || existingCatch.time || new Date(timestamp).toTimeString().slice(0, 5)
      timestamp = new Date(`${date}T${existingTime}`).toISOString()
    }

    const updatePayload: any = {
      date,
      time: time !== undefined ? time : existingCatch.time,
      guide: guide.trim(),
      species,
      weight: weightNum,
      area,
      weather: weather !== undefined ? weather : existingCatch.weather,
      timestamp,
    }

    // Handle location: if null, delete the field; if undefined, don't update; otherwise set it
    if (processedLocation === null) {
      updatePayload.location = FieldValue.delete()
    } else if (processedLocation !== undefined) {
      updatePayload.location = processedLocation
    }

    // Convert timestamp to Firestore Timestamp if provided
    if (updatePayload.timestamp) {
      updatePayload.timestamp = Timestamp.fromDate(new Date(updatePayload.timestamp))
    }
    
    updatePayload.updatedAt = Timestamp.now()

    // Update using Admin SDK
    await catchDocRef.update(updatePayload)

    const responseLocation =
      processedLocation === undefined
        ? existingCatch.location ?? undefined
        : processedLocation

    return NextResponse.json(
      {
        id,
        date,
        time,
        guide,
        species,
        weight: weightNum,
        area,
        location: responseLocation,
        weather: updatePayload.weather,
        timestamp,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error updating fishing catch:', error)
    return NextResponse.json(
      { message: 'Failed to update fishing catch' },
      { status: 500 }
    )
  }
}

// DELETE - Delete a fishing catch
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { message: 'Missing catch ID' },
        { status: 400 }
      )
    }

    // Delete using Admin SDK
    const adminDb = getAdminDb()
    await adminDb.collection(FISHING_COLLECTION).doc(id).delete()

    return NextResponse.json({ message: 'Catch deleted successfully' }, { status: 200 })
  } catch (error) {
    console.error('Error deleting fishing catch:', error)
    return NextResponse.json(
      { message: 'Failed to delete fishing catch' },
      { status: 500 }
    )
  }
}

