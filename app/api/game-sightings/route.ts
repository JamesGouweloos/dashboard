import { NextRequest, NextResponse } from 'next/server'
import { getAdminDb } from '@/lib/firebase-admin'
import { Timestamp, FieldValue } from 'firebase-admin/firestore'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const GAME_SIGHTINGS_COLLECTION = 'game_sightings'

const VALID_SPECIES = ['Lion', 'Leopard', 'Wild Dog', 'Buffalo']

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

// GET - Fetch all game trips
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const pageSize = parseInt(searchParams.get('pageSize') || '1000')
    
    // Use Admin SDK for server-side reads
    const adminDb = getAdminDb()
    const snapshot = await adminDb.collection(GAME_SIGHTINGS_COLLECTION)
      .orderBy('timestamp', 'desc')
      .limit(pageSize)
      .get()
    
    const data = snapshot.docs.map(doc => {
      const docData = doc.data()
      return {
        id: doc.id,
        ...docData,
        timestamp: timestampToISO(docData.timestamp || docData.createdAt)
      }
    })
    
    return NextResponse.json(data, {
      status: 200,
      headers: { 'Cache-Control': 'no-store' }
    })
  } catch (error) {
    console.error('Error reading game sightings data:', error)
    return NextResponse.json([], { status: 200 })
  }
}

// POST - Add a new game trip
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { date, guide, species, timeOfDay, location, coordinates, sightings, tripGroupId } = body

    // Validation
    if (!date || !guide || !timeOfDay || !location) {
      return NextResponse.json(
        { message: 'Missing required fields' },
        { status: 400 }
      )
    }

    if (!['AM', 'PM'].includes(timeOfDay)) {
      return NextResponse.json(
        { message: 'Invalid time of day. Must be "AM" or "PM"' },
        { status: 400 }
      )
    }

    if (!['GMA', 'Park'].includes(location)) {
      return NextResponse.json(
        { message: 'Invalid location. Must be "GMA" or "Park"' },
        { status: 400 }
      )
    }

    // Helper to validate coordinates
    const normalizeCoordinates = (coords: any) => {
      if (
        coords &&
        typeof coords.lat === 'number' &&
        typeof coords.lng === 'number' &&
        !isNaN(coords.lat) &&
        !isNaN(coords.lng)
      ) {
        return {
          lat: coords.lat,
          lng: coords.lng,
        }
      }
      return undefined
    }

    // If sightings array provided, create individual records for each species/location entry
    if (Array.isArray(sightings) && sightings.length > 0) {
      const createdTrips: any[] = []

      for (const [index, entry] of sightings.entries()) {
        if (!entry?.species || !VALID_SPECIES.includes(entry.species)) {
          return NextResponse.json(
            { message: `Invalid species provided for sighting ${index + 1}` },
            { status: 400 }
          )
        }

        const entryCoordinates = normalizeCoordinates(entry.coordinates)
        if (!entryCoordinates) {
          return NextResponse.json(
            { message: `Invalid or missing coordinates for ${entry.species} sighting` },
            { status: 400 }
          )
        }

        const newTrip: any = {
          date,
          guide: guide.trim(),
          species: [entry.species],
          timeOfDay,
          location,
          coordinates: entryCoordinates,
          timestamp: new Date().toISOString(),
        }

        if (tripGroupId) {
          newTrip.tripGroupId = tripGroupId
        }

        // Add to Firestore using Admin SDK
        const adminDb = getAdminDb()
        const docRef = adminDb.collection(GAME_SIGHTINGS_COLLECTION).doc()
        const tripId = docRef.id
        
        const firestoreData: any = {
          ...newTrip,
          timestamp: Timestamp.fromDate(new Date(newTrip.timestamp)),
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now()
        }
        
        await docRef.set(firestoreData)
        createdTrips.push({ ...newTrip, id: tripId })
      }

      return NextResponse.json({ trips: createdTrips }, { status: 201 })
    }

    // Legacy single payload flow
    if (!Array.isArray(species) || species.length === 0) {
      return NextResponse.json(
        { message: 'At least one species must be selected' },
        { status: 400 }
      )
    }

    for (const s of species) {
      if (!VALID_SPECIES.includes(s)) {
        return NextResponse.json(
          { message: `Invalid species: ${s}. Must be one of: ${VALID_SPECIES.join(', ')}` },
          { status: 400 }
        )
      }
    }

    const processedCoordinates = normalizeCoordinates(coordinates)

    const newTrip: any = {
      date,
      guide: guide.trim(),
      species,
      timeOfDay,
      location,
      timestamp: new Date().toISOString(),
    }

    if (processedCoordinates) {
      newTrip.coordinates = processedCoordinates
    }

    if (tripGroupId) {
      newTrip.tripGroupId = tripGroupId
    }

    // Add to Firestore using Admin SDK
    const adminDb = getAdminDb()
    const docRef = adminDb.collection(GAME_SIGHTINGS_COLLECTION).doc()
    const tripId = docRef.id
    
    const firestoreData: any = {
      ...newTrip,
      timestamp: Timestamp.fromDate(new Date(newTrip.timestamp)),
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    }
    
    await docRef.set(firestoreData)

    return NextResponse.json({ trips: [{ ...newTrip, id: tripId }] }, { status: 201 })
  } catch (error) {
    console.error('Error saving game trip:', error)
    return NextResponse.json(
      { message: 'Failed to save game trip' },
      { status: 500 }
    )
  }
}

// PUT - Update an existing game trip
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, date, guide, species, timeOfDay, location, coordinates } = body

    if (!id) {
      return NextResponse.json(
        { message: 'Missing trip ID' },
        { status: 400 }
      )
    }

    // Validation
    if (!date || !guide || !species || !timeOfDay || !location) {
      return NextResponse.json(
        { message: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Validate species array
    if (!Array.isArray(species) || species.length === 0) {
      return NextResponse.json(
        { message: 'At least one species must be selected' },
        { status: 400 }
      )
    }

    // Validate each species
    for (const s of species) {
      if (!VALID_SPECIES.includes(s)) {
        return NextResponse.json(
          { message: `Invalid species: ${s}. Must be one of: ${VALID_SPECIES.join(', ')}` },
          { status: 400 }
        )
      }
    }

    if (!['AM', 'PM'].includes(timeOfDay)) {
      return NextResponse.json(
        { message: 'Invalid time of day. Must be "AM" or "PM"' },
        { status: 400 }
      )
    }

    if (!['GMA', 'Park'].includes(location)) {
      return NextResponse.json(
        { message: 'Invalid location. Must be "GMA" or "Park"' },
        { status: 400 }
      )
    }

    // Validate coordinates if provided
    let processedCoordinates: { lat: number; lng: number } | undefined = undefined
    if (coordinates) {
      if (typeof coordinates.lat === 'number' && typeof coordinates.lng === 'number' &&
          !isNaN(coordinates.lat) && !isNaN(coordinates.lng)) {
        processedCoordinates = {
          lat: coordinates.lat,
          lng: coordinates.lng
        }
      }
    }

    // Update using Admin SDK
    const adminDb = getAdminDb()
    const tripDocRef = adminDb.collection(GAME_SIGHTINGS_COLLECTION).doc(id)
    const tripDoc = await tripDocRef.get()
    
    if (!tripDoc.exists) {
      return NextResponse.json(
        { message: 'Trip not found' },
        { status: 404 }
      )
    }
    
    const existingTrip = tripDoc.data()
    
    if (!existingTrip) {
      return NextResponse.json(
        { message: 'Trip data not found' },
        { status: 404 }
      )
    }
    
    // Update trip in Firestore
    const updateData: any = {
      date,
      guide: guide.trim(),
      species: species,
      timeOfDay,
      location,
      updatedAt: Timestamp.now()
    }

    // Handle coordinates
    if (processedCoordinates === undefined) {
      // Don't update coordinates - keep existing
      if (existingTrip.coordinates) {
        updateData.coordinates = existingTrip.coordinates
      }
    } else if (processedCoordinates === null) {
      updateData.coordinates = FieldValue.delete()
    } else {
      updateData.coordinates = processedCoordinates
    }
    
    // Update timestamp if date changed (create from date string)
    const timestamp = new Date(`${date}T${existingTrip.timeOfDay === 'AM' ? '08:00' : '18:00'}`).toISOString()
    updateData.timestamp = Timestamp.fromDate(new Date(timestamp))
    
    await tripDocRef.update(updateData)

    return NextResponse.json({ id, date, guide, species, timeOfDay, location, coordinates: processedCoordinates }, { status: 200 })
  } catch (error) {
    console.error('Error updating game trip:', error)
    return NextResponse.json(
      { message: 'Failed to update game trip' },
      { status: 500 }
    )
  }
}

// DELETE - Delete a game trip
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { message: 'Missing trip ID' },
        { status: 400 }
      )
    }

    // Delete using Admin SDK
    const adminDb = getAdminDb()
    await adminDb.collection(GAME_SIGHTINGS_COLLECTION).doc(id).delete()

    return NextResponse.json({ message: 'Trip deleted successfully' }, { status: 200 })
  } catch (error) {
    console.error('Error deleting game trip:', error)
    return NextResponse.json(
      { message: 'Failed to delete game trip' },
      { status: 500 }
    )
  }
}
