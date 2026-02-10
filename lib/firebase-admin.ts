import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getFirestore, Firestore } from 'firebase-admin/firestore'

let adminDb: Firestore | null = null

// Initialize Firebase Admin lazily - only when first accessed
export function getAdminDb(): Firestore {
  if (adminDb) {
    return adminDb
  }

  try {
    if (!getApps().length) {
      // Try to initialize with service account if available
      // Check both FIREBASE_SERVICE_ACCOUNT_KEY (local) and SERVICE_ACCOUNT_KEY (production)
      const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY || process.env.SERVICE_ACCOUNT_KEY
      if (serviceAccountKey) {
        try {
          const serviceAccount = JSON.parse(serviceAccountKey)
          initializeApp({
            credential: cert(serviceAccount),
            projectId: 'dashboard-baines'
          })
        } catch (parseError) {
          console.error('Error parsing service account key:', parseError)
          // Fall through to default initialization
        }
      }
      
      // For Firebase App Hosting, use Application Default Credentials
      // This will automatically use the service account attached to the App Hosting backend
      if (!getApps().length) {
        console.log('Initializing Firebase Admin with Application Default Credentials...')
        initializeApp({
          projectId: 'dashboard-baines'
        })
        console.log('Firebase Admin app initialized')
      }
    }
    
    // Get Firestore instance - explicitly use default database
    try {
      adminDb = getFirestore()
      if (!adminDb) {
        throw new Error('getFirestore() returned null or undefined')
      }
      console.log('Firestore instance obtained successfully')
    } catch (firestoreError: any) {
      console.error('Failed to get Firestore instance:', firestoreError)
      throw new Error(`Failed to get Firestore instance: ${firestoreError?.message || String(firestoreError)}`)
    }
    
    // Safely get project ID
    try {
      const apps = getApps()
      if (apps.length > 0) {
        const projectId = apps[0].options.projectId || 'dashboard-baines'
        console.log('Project ID:', projectId)
      } else {
        console.log('Project ID: dashboard-baines (default)')
      }
    } catch (projectIdError) {
      console.warn('Could not determine project ID:', projectIdError)
    }
    
    // Verify Firestore instance is valid
    console.log('Firestore instance ready')
    
    return adminDb
  } catch (error: any) {
    console.error('Error initializing Firebase Admin:', error)
    const errorMessage = error?.message || String(error)
    
    // Provide helpful error message for missing credentials
    if (errorMessage.includes('Could not load the default credentials') || 
        errorMessage.includes('default credentials')) {
      const isLocalDev = process.env.NODE_ENV === 'development'
      const hasServiceAccountKey = !!process.env.FIREBASE_SERVICE_ACCOUNT_KEY
      
      let helpMessage = '\n\n'
      if (isLocalDev) {
        helpMessage += 'LOCAL DEVELOPMENT SETUP REQUIRED:\n'
        helpMessage += '1. Download a service account key from Firebase Console\n'
        helpMessage += '2. Set FIREBASE_SERVICE_ACCOUNT_KEY environment variable in .env.local\n'
        helpMessage += '   OR use: gcloud auth application-default login\n'
        helpMessage += '3. See FIREBASE_ADMIN_SETUP.md for detailed instructions\n'
      } else {
        helpMessage += 'PRODUCTION SETUP REQUIRED:\n'
        helpMessage += '1. Ensure App Hosting backend has a service account attached\n'
        helpMessage += '2. Verify IAM permissions for the service account\n'
        helpMessage += '3. Or set FIREBASE_SERVICE_ACCOUNT_KEY as a secret in App Hosting\n'
        helpMessage += '4. See FIREBASE_ADMIN_SETUP.md for detailed instructions\n'
      }
      
      throw new Error(`Failed to initialize Firebase Admin SDK: ${errorMessage}${helpMessage}`)
    }
    
    throw new Error(`Failed to initialize Firebase Admin SDK: ${errorMessage}`)
  }
}

// Export adminDbHelper as a convenience wrapper for backward compatibility
// Note: Prefer using getAdminDb() directly for better type safety
export const adminDbHelper = {
  doc: (path: string) => getAdminDb().doc(path),
  collection: (path: string) => getAdminDb().collection(path)
}

