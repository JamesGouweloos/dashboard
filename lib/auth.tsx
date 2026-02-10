'use client'

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { 
  User,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail
} from 'firebase/auth'
import { doc, getDoc, setDoc, collection, query, where, getDocs, Timestamp } from 'firebase/firestore'
import { auth, db } from '@/firebase'

export type UserRole = 'super_admin' | 'company_admin' | 'company_user'

export interface UserProfile {
  uid: string
  email: string
  role: UserRole
  companyId?: string
  companyName?: string
  displayName?: string
  createdAt: Timestamp
  updatedAt: Timestamp
}

export interface Company {
  id: string
  name: string
  createdAt: Timestamp
  updatedAt: Timestamp
  createdBy: string
}

interface AuthContextType {
  user: User | null
  userProfile: UserProfile | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  createUser: (email: string, password: string, role: UserRole, companyId?: string) => Promise<string>
  resetPassword: (email: string) => Promise<void>
  isSuperAdmin: boolean
  isCompanyAdmin: boolean
  isCompanyUser: boolean
  hasAccess: (requiredRole?: UserRole) => boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser)
      
      if (firebaseUser) {
        // Fetch user profile from Firestore
        try {
          const profileDoc = await getDoc(doc(db, 'users', firebaseUser.uid))
          if (profileDoc.exists()) {
            const profileData = profileDoc.data() as UserProfile
            setUserProfile(profileData)
            
            // If user has companyId, fetch company name
            if (profileData.companyId) {
              const companyDoc = await getDoc(doc(db, 'companies', profileData.companyId))
              if (companyDoc.exists()) {
                setUserProfile({
                  ...profileData,
                  companyName: companyDoc.data().name
                })
              }
            }
          } else {
            // Create default profile if doesn't exist
            const defaultProfile: UserProfile = {
              uid: firebaseUser.uid,
              email: firebaseUser.email || '',
              role: 'company_user',
              createdAt: Timestamp.now(),
              updatedAt: Timestamp.now()
            }
            await setDoc(doc(db, 'users', firebaseUser.uid), defaultProfile)
            setUserProfile(defaultProfile)
          }
        } catch (error) {
          console.error('Error fetching user profile:', error)
        }
      } else {
        setUserProfile(null)
      }
      
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  const login = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password)
  }

  const logout = async () => {
    await signOut(auth)
    setUserProfile(null)
  }

  const createUser = async (email: string, password: string, role: UserRole, companyId?: string): Promise<string> => {
    // Create Firebase Auth user
    const userCredential = await createUserWithEmailAndPassword(auth, email, password)
    const uid = userCredential.user.uid

    // Create user profile in Firestore
    const userProfile: UserProfile = {
      uid,
      email,
      role,
      companyId,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    }

    await setDoc(doc(db, 'users', uid), userProfile)

    // If companyId provided, fetch company name
    if (companyId) {
      const companyDoc = await getDoc(doc(db, 'companies', companyId))
      if (companyDoc.exists()) {
        userProfile.companyName = companyDoc.data().name
      }
    }

    return uid
  }

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email)
  }

  const isSuperAdmin = userProfile?.role === 'super_admin'
  const isCompanyAdmin = userProfile?.role === 'company_admin'
  const isCompanyUser = userProfile?.role === 'company_user'

  const hasAccess = (requiredRole?: UserRole): boolean => {
    if (!userProfile) return false
    if (!requiredRole) return true
    
    const roleHierarchy: Record<UserRole, number> = {
      'super_admin': 3,
      'company_admin': 2,
      'company_user': 1
    }
    
    return roleHierarchy[userProfile.role] >= roleHierarchy[requiredRole]
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        userProfile,
        loading,
        login,
        logout,
        createUser,
        resetPassword,
        isSuperAdmin,
        isCompanyAdmin,
        isCompanyUser,
        hasAccess
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

