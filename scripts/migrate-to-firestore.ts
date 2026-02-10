/**
 * Migration script to move data from JSON files to Firestore
 * Run with: npx tsx scripts/migrate-to-firestore.ts
 */

import { readFile } from 'fs/promises'
import { join } from 'path'
import { db } from '../firebase'
import { collection, doc, setDoc, Timestamp, writeBatch } from 'firebase/firestore'
import {
  GUESTS_COLLECTION,
  FISHING_COLLECTION,
  GAME_SIGHTINGS_COLLECTION,
  GUEST_FEEDBACK_COLLECTION,
  GuestDocument,
  FishingCatchDocument,
  GameSightingDocument,
  GuestFeedbackDocument
} from '../lib/firestore'

const BATCH_SIZE = 500 // Firestore batch limit is 500

async function migrateGuests() {
  console.log('Migrating guests data...')
  const guestDataPath = join(process.cwd(), 'public', 'guest_data.json')
  
  try {
    const fileContent = await readFile(guestDataPath, 'utf-8')
    const guests: GuestDocument[] = JSON.parse(fileContent)
    
    console.log(`Found ${guests.length} guest records`)
    
    const batches: any[][] = []
    for (let i = 0; i < guests.length; i += BATCH_SIZE) {
      batches.push(guests.slice(i, i + BATCH_SIZE))
    }
    
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = writeBatch(db)
      const batchData = batches[batchIndex]
      
      for (const guest of batchData) {
        const docRef = doc(collection(db, GUESTS_COLLECTION))
        batch.set(docRef, {
          ...guest,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now()
        })
      }
      
      await batch.commit()
      console.log(`Migrated batch ${batchIndex + 1}/${batches.length} (${batchData.length} records)`)
    }
    
    console.log(`✓ Successfully migrated ${guests.length} guest records`)
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      console.log('No guest_data.json file found, skipping...')
    } else {
      console.error('Error migrating guests:', error)
      throw error
    }
  }
}

async function migrateFishing() {
  console.log('Migrating fishing catches data...')
  const fishingDataPath = join(process.cwd(), 'public', 'fishing_data.json')
  
  try {
    const fileContent = await readFile(fishingDataPath, 'utf-8')
    const catches: FishingCatchDocument[] = JSON.parse(fileContent)
    
    console.log(`Found ${catches.length} fishing catch records`)
    
    const batches: any[][] = []
    for (let i = 0; i < catches.length; i += BATCH_SIZE) {
      batches.push(catches.slice(i, i + BATCH_SIZE))
    }
    
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = writeBatch(db)
      const batchData = batches[batchIndex]
      
      for (const catchItem of batchData) {
        const docRef = doc(collection(db, FISHING_COLLECTION))
        const { id, ...catchData } = catchItem
        batch.set(docRef, {
          ...catchData,
          timestamp: catchData.timestamp ? Timestamp.fromDate(new Date(catchData.timestamp)) : Timestamp.now(),
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now()
        })
      }
      
      await batch.commit()
      console.log(`Migrated batch ${batchIndex + 1}/${batches.length} (${batchData.length} records)`)
    }
    
    console.log(`✓ Successfully migrated ${catches.length} fishing catch records`)
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      console.log('No fishing_data.json file found, skipping...')
    } else {
      console.error('Error migrating fishing catches:', error)
      throw error
    }
  }
}

async function migrateGameSightings() {
  console.log('Migrating game sightings data...')
  const gameSightingsDataPath = join(process.cwd(), 'public', 'game_sightings_data.json')
  
  try {
    const fileContent = await readFile(gameSightingsDataPath, 'utf-8')
    const sightings: GameSightingDocument[] = JSON.parse(fileContent)
    
    console.log(`Found ${sightings.length} game sighting records`)
    
    const batches: any[][] = []
    for (let i = 0; i < sightings.length; i += BATCH_SIZE) {
      batches.push(sightings.slice(i, i + BATCH_SIZE))
    }
    
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = writeBatch(db)
      const batchData = batches[batchIndex]
      
      for (const sighting of batchData) {
        const docRef = doc(collection(db, GAME_SIGHTINGS_COLLECTION))
        const { id, ...sightingData } = sighting
        batch.set(docRef, {
          ...sightingData,
          timestamp: sightingData.timestamp ? Timestamp.fromDate(new Date(sightingData.timestamp)) : Timestamp.now(),
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now()
        })
      }
      
      await batch.commit()
      console.log(`Migrated batch ${batchIndex + 1}/${batches.length} (${batchData.length} records)`)
    }
    
    console.log(`✓ Successfully migrated ${sightings.length} game sighting records`)
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      console.log('No game_sightings_data.json file found, skipping...')
    } else {
      console.error('Error migrating game sightings:', error)
      throw error
    }
  }
}

async function migrateGuestFeedback() {
  console.log('Migrating guest feedback data...')
  const feedbackDataPath = join(process.cwd(), 'public', 'guest_feedback_data.json')
  
  try {
    const fileContent = await readFile(feedbackDataPath, 'utf-8')
    const feedback: GuestFeedbackDocument[] = JSON.parse(fileContent)
    
    console.log(`Found ${feedback.length} guest feedback records`)
    
    const batches: any[][] = []
    for (let i = 0; i < feedback.length; i += BATCH_SIZE) {
      batches.push(feedback.slice(i, i + BATCH_SIZE))
    }
    
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = writeBatch(db)
      const batchData = batches[batchIndex]
      
      for (const feedbackItem of batchData) {
        const docRef = doc(collection(db, GUEST_FEEDBACK_COLLECTION))
        const { id, ...feedbackData } = feedbackItem
        batch.set(docRef, {
          ...feedbackData,
          timestamp: feedbackData.timestamp ? Timestamp.fromDate(new Date(feedbackData.timestamp)) : Timestamp.now(),
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now()
        })
      }
      
      await batch.commit()
      console.log(`Migrated batch ${batchIndex + 1}/${batches.length} (${batchData.length} records)`)
    }
    
    console.log(`✓ Successfully migrated ${feedback.length} guest feedback records`)
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      console.log('No guest_feedback_data.json file found, skipping...')
    } else {
      console.error('Error migrating guest feedback:', error)
      throw error
    }
  }
}

async function main() {
  console.log('Starting migration to Firestore...\n')
  
  try {
    await migrateGuests()
    await migrateFishing()
    await migrateGameSightings()
    await migrateGuestFeedback()
    
    console.log('\n✓ Migration completed successfully!')
  } catch (error) {
    console.error('\n✗ Migration failed:', error)
    process.exit(1)
  }
}

// Run migration if executed directly
if (require.main === module) {
  main()
}

export { main as migrateToFirestore }

