import { NextRequest, NextResponse } from 'next/server'
import { addGuest } from '@/lib/firestore'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate required fields
    if (!body.firstName || !body.surname) {
      return NextResponse.json(
        { error: 'First name and surname are required' },
        { status: 400 }
      )
    }

    // Create new guest record
    const newGuest = {
      'Year': String(body.year || new Date().getFullYear()),
      'Month': parseInt(body.month) || new Date().getMonth() + 1,
      'Guest No.': body.guestNo || '',
      'BOOKING NAME': body.bookingName || '',
      'SURNAME': body.surname,
      'FIRST NAME': body.firstName,
      'TITLE': body.title || '',
      'DATE OF ARRIVAL': body.dateOfArrival || '',
      'DATE OF DEPARTURE': body.dateOfDeparture || '',
      'BED NIGHTS': parseFloat(body.bedNights) || 0,
      'DOB': body.dob || '',
      'COUNTRY OF RESIDENCE': body.countryOfResidence || '',
      'NATIONALITY AS PER PASSPORT': body.nationality || '',
      'PASSPORT NUMBER': body.passportNumber || '',
      'EMAIL ADDRESS': body.emailAddress || ''
    }

    // Add to Firestore
    const guestId = await addGuest(newGuest)

    console.log(`Guest added: ${newGuest['FIRST NAME']} ${newGuest['SURNAME']}`)

    return NextResponse.json({
      message: 'Guest added successfully',
      guest: { ...newGuest, id: guestId }
    }, {
      status: 200,
      headers: { 'Cache-Control': 'no-store' }
    })
  } catch (error) {
    console.error('Error adding guest:', error)
    return NextResponse.json(
      { error: 'Failed to add guest: ' + (error as Error).message },
      { status: 500 }
    )
  }
}



