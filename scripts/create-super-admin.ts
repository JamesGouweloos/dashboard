/**
 * Script to create the first super admin user
 * Run with: npx tsx scripts/create-super-admin.ts <email> <password>
 */

import { createUserWithEmailAndPassword } from 'firebase/auth'
import { doc, setDoc, Timestamp, getDocs, collection } from 'firebase/firestore'
import { auth, db } from '../firebase'

async function createSuperAdmin(email: string, password: string) {
  try {
    console.log('Creating super admin user...')
    
    // Check if any super admin already exists
    const usersSnapshot = await getDocs(collection(db, 'users'))
    const existingSuperAdmin = usersSnapshot.docs.find(
      doc => doc.data().role === 'super_admin'
    )
    
    if (existingSuperAdmin) {
      console.log('⚠️  A super admin already exists. Use the admin panel to create additional users.')
      return
    }

    // Create Firebase Auth user
    const userCredential = await createUserWithEmailAndPassword(auth, email, password)
    const uid = userCredential.user.uid

    // Create user profile in Firestore with super_admin role
    await setDoc(doc(db, 'users', uid), {
      uid,
      email,
      role: 'super_admin',
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    })

    console.log('✓ Super admin created successfully!')
    console.log(`  Email: ${email}`)
    console.log(`  UID: ${uid}`)
    console.log('\nYou can now log in with these credentials.')
  } catch (error: any) {
    console.error('✗ Error creating super admin:', error.message)
    if (error.code === 'auth/email-already-in-use') {
      console.error('  This email is already registered. Please use a different email.')
    }
    process.exit(1)
  }
}

// Run if executed directly
if (require.main === module) {
  const email = process.argv[2]
  const password = process.argv[3]

  if (!email || !password) {
    console.error('Usage: npx tsx scripts/create-super-admin.ts <email> <password>')
    console.error('Example: npx tsx scripts/create-super-admin.ts admin@example.com SecurePassword123!')
    process.exit(1)
  }

  if (password.length < 6) {
    console.error('Error: Password must be at least 6 characters long')
    process.exit(1)
  }

  createSuperAdmin(email, password)
    .then(() => process.exit(0))
    .catch(() => process.exit(1))
}

export { createSuperAdmin }

