import { NextRequest, NextResponse } from 'next/server'
import { getAdminDb } from '@/lib/firebase-admin'
import * as FirebaseFirestore from 'firebase-admin/firestore'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const GUESTS_COLLECTION = 'past_guests'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    // Parse query parameters
    const yearsParam = searchParams.get('years')
    const month = searchParams.get('month') || undefined
    const country = searchParams.get('country') || undefined
    const nationality = searchParams.get('nationality') || undefined
    const search = searchParams.get('search') || undefined
    const pageSize = parseInt(searchParams.get('pageSize') || '100')
    const lastDocId = searchParams.get('lastDocId') || undefined
    
    const years = yearsParam ? yearsParam.split(',').map(y => parseInt(y)).filter(y => !isNaN(y)) : undefined
    
    // Use Admin SDK for server-side reads
    const adminDb = getAdminDb()
    let query: FirebaseFirestore.Query = adminDb.collection(GUESTS_COLLECTION)
    
    // Apply filters
    if (years && years.length > 0) {
      // Firestore 'in' limit is 10, so we need to handle multiple queries if needed
      const yearStrings = years.slice(0, 10).map(y => String(y))
      if (yearStrings.length > 0) {
        query = query.where('Year', 'in', yearStrings)
      }
    }
    
    if (month) {
      const monthNumber = parseInt(String(month), 10)
      if (!Number.isNaN(monthNumber)) {
        query = query.where('Month', '==', monthNumber)
      }
    }
    
    if (country) {
      query = query.where('COUNTRY OF RESIDENCE', '==', country)
    }
    
    if (nationality) {
      query = query.where('NATIONALITY AS PER PASSPORT', '==', nationality)
    }
    
    // Order by Year descending
    query = query.orderBy('Year', 'desc')
    
    // Handle pagination with lastDocId
    if (lastDocId) {
      const lastDocRef = adminDb.collection(GUESTS_COLLECTION).doc(lastDocId)
      const lastDocSnap = await lastDocRef.get()
      if (lastDocSnap.exists) {
        query = query.startAfter(lastDocSnap)
      }
    }
    
    // Get one extra to check if there's more
    const limitSize = pageSize + 1
    query = query.limit(limitSize)
    
    const snapshot = await query.get()
    const docs = snapshot.docs
    const hasMore = docs.length > pageSize
    const data = (hasMore ? docs.slice(0, -1) : docs).map(doc => ({
      ...doc.data(),
      id: doc.id
    }))
    
    // Deduplicate based on unique combination of fields
    // Use document ID as primary deduplication key, then fall back to data fields
    const seenById = new Set<string>()
    const seenByData = new Map<string, string>() // Map of data key to document ID
    
    const deduplicatedData = data.filter((guest: any) => {
      const docId = guest.id || ''
      
      // If we've seen this exact document ID, it's a duplicate
      if (seenById.has(docId)) {
        console.log('Duplicate document ID found:', docId)
        return false
      }
      seenById.add(docId)
      
      // Also check for duplicate data (same guest info but different document ID)
      const guestNo = String(guest['Guest No.'] || '').trim()
      const year = String(guest.Year || '').trim()
      const month = String(guest.Month || '').trim()
      const arrivalDate = String(guest['DATE OF ARRIVAL'] || '').trim()
      const departureDate = String(guest['DATE OF DEPARTURE'] || '').trim()
      const surname = String(guest.SURNAME || '').trim()
      const firstName = String(guest['FIRST NAME'] || '').trim()
      const passport = String(guest['PASSPORT NUMBER'] || '').trim()
      const email = String(guest['EMAIL ADDRESS'] || '').trim()
      
      // Create a comprehensive unique key from all identifying fields
      // Use passport number or email if available (most unique), otherwise use name + dates
      let uniqueKey: string
      if (passport) {
        uniqueKey = `passport:${passport.toLowerCase()}`
      } else if (email) {
        uniqueKey = `email:${email.toLowerCase()}`
      } else {
        // Fall back to combination of name, dates, and guest number
        uniqueKey = `data:${year}-${month}-${guestNo}-${arrivalDate}-${departureDate}-${surname.toLowerCase()}-${firstName.toLowerCase()}`
      }
      
      // Check if we've seen this data before
      const existingDocId = seenByData.get(uniqueKey)
      if (existingDocId && existingDocId !== docId) {
        console.log('Duplicate guest data found:', { 
          existingDocId, 
          duplicateDocId: docId,
          guestNo, 
          year, 
          month, 
          arrivalDate, 
          surname, 
          firstName,
          passport,
          email
        })
        return false
      }
      
      // Store this data key
      if (!existingDocId) {
        seenByData.set(uniqueKey, docId)
      }
      
      return true
    })
    
    const duplicatesRemoved = data.length - deduplicatedData.length
    if (duplicatesRemoved > 0) {
      console.log(`Deduplication: ${data.length} total records, ${deduplicatedData.length} unique records, ${duplicatesRemoved} duplicates removed`)
    }
    
    // Apply search filter client-side if needed (Firestore doesn't support full-text search)
    let filteredData = deduplicatedData
    if (search) {
      const searchLower = search.toLowerCase()
      filteredData = data.filter((guest: any) => 
        guest.SURNAME?.toLowerCase().includes(searchLower) ||
        guest['FIRST NAME']?.toLowerCase().includes(searchLower) ||
        guest['BOOKING NAME']?.toLowerCase().includes(searchLower) ||
        guest['EMAIL ADDRESS']?.toLowerCase().includes(searchLower) ||
        guest['PASSPORT NUMBER']?.toLowerCase().includes(searchLower) ||
        guest['COUNTRY OF RESIDENCE']?.toLowerCase().includes(searchLower) ||
        guest['NATIONALITY AS PER PASSPORT']?.toLowerCase().includes(searchLower)
      )
    }
    
    return NextResponse.json({
      guests: filteredData,
      pagination: {
        hasMore: hasMore && filteredData.length === pageSize,
        lastDocId: hasMore && docs.length > 1 ? docs[docs.length - 2].id : (docs.length > 0 ? docs[docs.length - 1].id : null)
      }
    }, {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
    })
  } catch (error) {
    console.error('Error fetching guest data:', error)
    return NextResponse.json({ 
      error: 'Failed to load guest data: ' + (error as Error).message 
    }, {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
    })
  }
}



