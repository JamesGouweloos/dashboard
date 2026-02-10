import { db } from '@/firebase'
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc,
  deleteDoc,
  deleteField,
  query, 
  where, 
  orderBy, 
  limit, 
  startAfter,
  Timestamp,
  QueryDocumentSnapshot,
  DocumentData
} from 'firebase/firestore'

// Helper to convert Firestore timestamp to ISO string
export const timestampToISO = (timestamp: any): string => {
  if (timestamp?.toDate) {
    return timestamp.toDate().toISOString()
  }
  if (timestamp instanceof Timestamp) {
    return timestamp.toDate().toISOString()
  }
  return timestamp || new Date().toISOString()
}

// Helper to convert ISO string to Firestore timestamp
export const isoToTimestamp = (isoString: string): Timestamp => {
  return Timestamp.fromDate(new Date(isoString))
}

// Generic pagination helper
export interface PaginationOptions {
  pageSize?: number
  lastDoc?: QueryDocumentSnapshot<DocumentData>
  orderByField?: string
  orderDirection?: 'asc' | 'desc'
}

export interface PaginatedResult<T> {
  data: T[]
  lastDoc: QueryDocumentSnapshot<DocumentData> | null
  hasMore: boolean
  total?: number
}

// Past Guests Collection
export const GUESTS_COLLECTION = 'past_guests'

export interface GuestDocument {
  Year: number | string
  Month: number | string
  'Guest No.': string
  'BOOKING NAME': string
  SURNAME: string
  'FIRST NAME': string
  TITLE: string
  'DATE OF ARRIVAL': string
  'DATE OF DEPARTURE': string
  'BED NIGHTS': number | string
  DOB: string
  'COUNTRY OF RESIDENCE': string
  'NATIONALITY AS PER PASSPORT': string
  'PASSPORT NUMBER': string
  'EMAIL ADDRESS': string
  createdAt?: Timestamp
  updatedAt?: Timestamp
}

export async function getGuests(
  filters?: {
    years?: number[]
    month?: string
    country?: string
    nationality?: string
    search?: string
  },
  pagination?: PaginationOptions & { lastDocId?: string }
): Promise<PaginatedResult<GuestDocument>> {
  let q = query(collection(db, GUESTS_COLLECTION))
  
  // Apply filters
  const yearFilters =
    filters?.years && filters.years.length > 0
      ? filters.years.map(year => String(year)).slice(0, 10)
      : undefined

  if (yearFilters && yearFilters.length > 0) {
    q = query(q, where('Year', 'in', yearFilters)) // Firestore 'in' limit is 10
  }

  if (filters?.month) {
    const monthNumber = parseInt(String(filters.month), 10)
    if (!Number.isNaN(monthNumber)) {
      q = query(q, where('Month', '==', monthNumber))
    }
  }
  if (filters?.country) {
    q = query(q, where('COUNTRY OF RESIDENCE', '==', filters.country))
  }
  if (filters?.nationality) {
    q = query(q, where('NATIONALITY AS PER PASSPORT', '==', filters.nationality))
  }
  
  // Order by
  const orderField = pagination?.orderByField || 'Year'
  const orderDir = pagination?.orderDirection || 'desc'
  q = query(q, orderBy(orderField, orderDir))
  
  // Pagination - handle lastDocId
  if (pagination?.lastDocId) {
    const lastDocRef = doc(db, GUESTS_COLLECTION, pagination.lastDocId)
    const lastDocSnap = await getDoc(lastDocRef)
    if (lastDocSnap.exists()) {
      q = query(q, startAfter(lastDocSnap))
    }
  } else if (pagination?.lastDoc) {
    q = query(q, startAfter(pagination.lastDoc))
  }
  
  if (pagination?.pageSize) {
    q = query(q, limit(pagination.pageSize + 1)) // Get one extra to check if there's more
  }
  
  const snapshot = await getDocs(q)
  const docs = snapshot.docs
  const hasMore = pagination?.pageSize ? docs.length > pagination.pageSize : false
  const data = (hasMore ? docs.slice(0, -1) : docs).map(doc => ({
    ...doc.data(),
    id: doc.id
  })) as unknown as GuestDocument[]
  
  // Apply search filter client-side if needed (Firestore doesn't support full-text search)
  let filteredData = data
  if (filters?.search) {
    const searchLower = filters.search.toLowerCase()
    filteredData = data.filter(guest => 
      guest.SURNAME?.toLowerCase().includes(searchLower) ||
      guest['FIRST NAME']?.toLowerCase().includes(searchLower) ||
      guest['BOOKING NAME']?.toLowerCase().includes(searchLower) ||
      guest['EMAIL ADDRESS']?.toLowerCase().includes(searchLower) ||
      guest['PASSPORT NUMBER']?.toLowerCase().includes(searchLower) ||
      guest['COUNTRY OF RESIDENCE']?.toLowerCase().includes(searchLower) ||
      guest['NATIONALITY AS PER PASSPORT']?.toLowerCase().includes(searchLower)
    )
  }
  
  return {
    data: filteredData,
    lastDoc: hasMore ? docs[docs.length - 2] : (docs.length > 0 ? docs[docs.length - 1] : null),
    hasMore
  }
}

export async function addGuest(guest: Omit<GuestDocument, 'createdAt' | 'updatedAt'>): Promise<string> {
  const docRef = doc(collection(db, GUESTS_COLLECTION))
  await setDoc(docRef, {
    ...guest,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now()
  })
  return docRef.id
}

export async function getGuestCount(): Promise<number> {
  const snapshot = await getDocs(collection(db, GUESTS_COLLECTION))
  return snapshot.size
}

// Fishing Catches Collection
export const FISHING_COLLECTION = 'fishing_catches'

export interface FishingCatchDocument {
  id?: string
  date: string
  time?: string
  guide: string
  species: 'Tiger Fish' | 'Vundu'
  weight: number
  area: 'GMA' | 'Park'
  location?: {
    lat: number
    lng: number
  }
  weather?: any
  timestamp: string
  createdAt?: Timestamp
  updatedAt?: Timestamp
}

export async function getFishingCatches(
  pagination?: PaginationOptions
): Promise<PaginatedResult<FishingCatchDocument>> {
  let q = query(collection(db, FISHING_COLLECTION))
  
  const orderField = pagination?.orderByField || 'timestamp'
  const orderDir = pagination?.orderDirection || 'desc'
  q = query(q, orderBy(orderField, orderDir))
  
  if (pagination?.lastDoc) {
    q = query(q, startAfter(pagination.lastDoc))
  }
  if (pagination?.pageSize) {
    q = query(q, limit(pagination.pageSize + 1))
  }
  
  const snapshot = await getDocs(q)
  const docs = snapshot.docs
  const hasMore = pagination?.pageSize ? docs.length > pagination.pageSize : false
  const data = (hasMore ? docs.slice(0, -1) : docs).map(doc => {
    const docData = doc.data()
    return {
      id: doc.id,
      ...docData,
      area: (docData.area as 'GMA' | 'Park') || 'GMA',
      timestamp: timestampToISO(docData.timestamp || docData.createdAt)
    } as FishingCatchDocument
  })
  
  return {
    data,
    lastDoc: hasMore ? docs[docs.length - 2] : (docs.length > 0 ? docs[docs.length - 1] : null),
    hasMore
  }
}

export async function addFishingCatch(catchData: Omit<FishingCatchDocument, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const docRef = doc(collection(db, FISHING_COLLECTION))
  const data: any = {
    ...catchData,
    timestamp: isoToTimestamp(catchData.timestamp),
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now()
  }

  if (catchData.location === undefined) {
    delete data.location
  }

  await setDoc(docRef, data)
  return docRef.id
}

export async function updateFishingCatch(id: string, catchData: Partial<FishingCatchDocument>): Promise<void> {
  const docRef = doc(db, FISHING_COLLECTION, id)
  const updateData: any = {
    ...catchData,
    updatedAt: Timestamp.now()
  }
  if (catchData.timestamp) {
    updateData.timestamp = isoToTimestamp(catchData.timestamp)
  }

  if (catchData.location === null) {
    updateData.location = deleteField()
  } else if (catchData.location === undefined) {
    delete updateData.location
  }

  await setDoc(docRef, updateData, { merge: true })
}

export async function deleteFishingCatch(id: string): Promise<void> {
  await deleteDoc(doc(db, FISHING_COLLECTION, id))
}

// Game Sightings Collection
export const GAME_SIGHTINGS_COLLECTION = 'game_sightings'

export interface GameSightingDocument {
  id?: string
  date: string
  guide: string
  species: string[]
  timeOfDay: 'AM' | 'PM'
  location: 'GMA' | 'Park'
  coordinates?: {
    lat: number
    lng: number
  }
  timestamp: string
  tripGroupId?: string
  createdAt?: Timestamp
  updatedAt?: Timestamp
}

export async function getGameSightings(
  pagination?: PaginationOptions
): Promise<PaginatedResult<GameSightingDocument>> {
  let q = query(collection(db, GAME_SIGHTINGS_COLLECTION))
  
  const orderField = pagination?.orderByField || 'timestamp'
  const orderDir = pagination?.orderDirection || 'desc'
  q = query(q, orderBy(orderField, orderDir))
  
  if (pagination?.lastDoc) {
    q = query(q, startAfter(pagination.lastDoc))
  }
  if (pagination?.pageSize) {
    q = query(q, limit(pagination.pageSize + 1))
  }
  
  const snapshot = await getDocs(q)
  const docs = snapshot.docs
  const hasMore = pagination?.pageSize ? docs.length > pagination.pageSize : false
  const data = (hasMore ? docs.slice(0, -1) : docs).map(doc => ({
    id: doc.id,
    ...doc.data(),
    timestamp: timestampToISO(doc.data().timestamp || doc.data().createdAt)
  })) as GameSightingDocument[]
  
  return {
    data,
    lastDoc: hasMore ? docs[docs.length - 2] : (docs.length > 0 ? docs[docs.length - 1] : null),
    hasMore
  }
}

export async function addGameSighting(sighting: Omit<GameSightingDocument, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const docRef = doc(collection(db, GAME_SIGHTINGS_COLLECTION))
  await setDoc(docRef, {
    ...sighting,
    timestamp: isoToTimestamp(sighting.timestamp),
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now()
  })
  return docRef.id
}

export async function updateGameSighting(id: string, sighting: Partial<GameSightingDocument>): Promise<void> {
  const docRef = doc(db, GAME_SIGHTINGS_COLLECTION, id)
  const updateData: any = {
    ...sighting,
    updatedAt: Timestamp.now()
  }
  if (sighting.timestamp) {
    updateData.timestamp = isoToTimestamp(sighting.timestamp)
  }
  await setDoc(docRef, updateData, { merge: true })
}

export async function deleteGameSighting(id: string): Promise<void> {
  await deleteDoc(doc(db, GAME_SIGHTINGS_COLLECTION, id))
}

// Guest Feedback Collection
export const GUEST_FEEDBACK_COLLECTION = 'guest_feedback'

export interface GuestFeedbackDocument {
  id?: string
  guestName: string
  emailAddress?: string
  checkoutDate: string
  service: 'Poor' | 'Average' | 'Good' | 'Excellent'
  food: 'Poor' | 'Average' | 'Good' | 'Excellent'
  activities: 'Poor' | 'Average' | 'Good' | 'Excellent'
  lodgeStaff: 'Poor' | 'Average' | 'Good' | 'Excellent'
  accommodation: 'Poor' | 'Average' | 'Good' | 'Excellent'
  overallStay: 'Poor' | 'Average' | 'Good' | 'Excellent'
  comments?: string
  timestamp: string
  createdAt?: Timestamp
  updatedAt?: Timestamp
}

export async function getGuestFeedback(
  pagination?: PaginationOptions
): Promise<PaginatedResult<GuestFeedbackDocument>> {
  let q = query(collection(db, GUEST_FEEDBACK_COLLECTION))
  
  const orderField = pagination?.orderByField || 'timestamp'
  const orderDir = pagination?.orderDirection || 'desc'
  q = query(q, orderBy(orderField, orderDir))
  
  if (pagination?.lastDoc) {
    q = query(q, startAfter(pagination.lastDoc))
  }
  if (pagination?.pageSize) {
    q = query(q, limit(pagination.pageSize + 1))
  }
  
  const snapshot = await getDocs(q)
  const docs = snapshot.docs
  const hasMore = pagination?.pageSize ? docs.length > pagination.pageSize : false
  const data = (hasMore ? docs.slice(0, -1) : docs).map(doc => ({
    id: doc.id,
    ...doc.data(),
    timestamp: timestampToISO(doc.data().timestamp || doc.data().createdAt)
  })) as GuestFeedbackDocument[]
  
  return {
    data,
    lastDoc: hasMore ? docs[docs.length - 2] : (docs.length > 0 ? docs[docs.length - 1] : null),
    hasMore
  }
}

export async function addGuestFeedback(feedback: Omit<GuestFeedbackDocument, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const docRef = doc(collection(db, GUEST_FEEDBACK_COLLECTION))
  
  // Remove undefined values to avoid Firestore errors
  const data: any = {
    guestName: feedback.guestName,
    checkoutDate: feedback.checkoutDate,
    service: feedback.service,
    food: feedback.food,
    activities: feedback.activities,
    lodgeStaff: feedback.lodgeStaff,
    accommodation: feedback.accommodation,
    overallStay: feedback.overallStay,
    timestamp: isoToTimestamp(feedback.timestamp),
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
  
  await setDoc(docRef, data)
  return docRef.id
}

export async function updateGuestFeedback(id: string, feedback: Partial<Omit<GuestFeedbackDocument, 'id' | 'createdAt' | 'updatedAt'>>): Promise<void> {
  const docRef = doc(db, GUEST_FEEDBACK_COLLECTION, id)
  const updateData: any = {
    updatedAt: Timestamp.now()
  }
  
  // Only include fields that are defined and not undefined
  if (feedback.guestName !== undefined) {
    updateData.guestName = feedback.guestName
  }
  if (feedback.checkoutDate !== undefined) {
    updateData.checkoutDate = feedback.checkoutDate
  }
  if (feedback.service !== undefined) {
    updateData.service = feedback.service
  }
  if (feedback.food !== undefined) {
    updateData.food = feedback.food
  }
  if (feedback.activities !== undefined) {
    updateData.activities = feedback.activities
  }
  if (feedback.lodgeStaff !== undefined) {
    updateData.lodgeStaff = feedback.lodgeStaff
  }
  if (feedback.accommodation !== undefined) {
    updateData.accommodation = feedback.accommodation
  }
  if (feedback.overallStay !== undefined) {
    updateData.overallStay = feedback.overallStay
  }
  
  // Handle emailAddress: if undefined or empty string, delete the field; otherwise set it
  if (feedback.emailAddress === undefined || feedback.emailAddress === null || feedback.emailAddress === '') {
    updateData.emailAddress = deleteField()
  } else {
    updateData.emailAddress = feedback.emailAddress
  }
  
  // Handle comments: if undefined or empty string, delete the field; otherwise set it
  if (feedback.comments === undefined || feedback.comments === null || feedback.comments === '') {
    updateData.comments = deleteField()
  } else {
    updateData.comments = feedback.comments
  }
  
  // Only update timestamp if it's provided
  if (feedback.timestamp !== undefined) {
    updateData.timestamp = isoToTimestamp(feedback.timestamp)
  }
  
  await updateDoc(docRef, updateData)
}

export async function deleteGuestFeedback(id: string): Promise<void> {
  await deleteDoc(doc(db, GUEST_FEEDBACK_COLLECTION, id))
}

