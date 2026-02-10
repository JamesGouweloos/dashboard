'use client'

import { useState, useEffect } from 'react'
import DashboardLayout from '@/components/DashboardLayout'
import AuthGuard from '@/components/AuthGuard'
import { useAuth } from '@/lib/auth'
import { 
  collection, 
  doc, 
  getDoc,
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  Timestamp,
  query,
  orderBy
} from 'firebase/firestore'
import { db } from '@/firebase'
import { motion } from 'framer-motion'
import { 
  Users, 
  Building2, 
  UserPlus, 
  Plus, 
  Edit2, 
  Trash2, 
  Save, 
  X,
  Shield,
  Mail,
  Key
} from 'lucide-react'

interface Company {
  id: string
  name: string
  createdAt: Timestamp
  updatedAt: Timestamp
  createdBy: string
}

interface UserProfile {
  id: string
  email: string
  role: 'super_admin' | 'company_admin' | 'company_user'
  companyId?: string
  companyName?: string
  displayName?: string
  createdAt: Timestamp
  updatedAt: Timestamp
}

export default function AdminPage() {
  const { userProfile, isSuperAdmin, createUser } = useAuth()
  const [companies, setCompanies] = useState<Company[]>([])
  const [users, setUsers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'companies' | 'users'>('companies')
  
  // Company form
  const [showCompanyForm, setShowCompanyForm] = useState(false)
  const [editingCompany, setEditingCompany] = useState<Company | null>(null)
  const [companyName, setCompanyName] = useState('')
  
  // User form
  const [showUserForm, setShowUserForm] = useState(false)
  const [userEmail, setUserEmail] = useState('')
  const [userPassword, setUserPassword] = useState('')
  const [userRole, setUserRole] = useState<'company_admin' | 'company_user'>('company_user')
  const [selectedCompanyId, setSelectedCompanyId] = useState('')

  useEffect(() => {
    if (isSuperAdmin) {
      fetchCompanies()
      fetchUsers()
    }
  }, [isSuperAdmin])

  const fetchCompanies = async () => {
    try {
      const q = query(collection(db, 'companies'), orderBy('createdAt', 'desc'))
      const snapshot = await getDocs(q)
      const companiesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Company[]
      setCompanies(companiesData)
    } catch (error) {
      console.error('Error fetching companies:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchUsers = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'users'))
      const usersData = await Promise.all(
        snapshot.docs.map(async (userDoc) => {
          const userData = { id: userDoc.id, ...userDoc.data() } as UserProfile
          if (userData.companyId) {
            try {
              // Direct document access is more efficient
              const companyDocRef = doc(db, 'companies', userData.companyId)
              const companyDocSnap = await getDoc(companyDocRef)
              if (companyDocSnap.exists()) {
                userData.companyName = companyDocSnap.data().name
              }
            } catch (error) {
              console.error('Error fetching company name:', error)
            }
          }
          return userData
        })
      )
      setUsers(usersData)
    } catch (error) {
      console.error('Error fetching users:', error)
    }
  }

  const handleCreateCompany = async () => {
    if (!companyName.trim() || !userProfile) return

    try {
      const companyData = {
        name: companyName.trim(),
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        createdBy: userProfile.uid
      }

      const docRef = await addDoc(collection(db, 'companies'), companyData)
      await fetchCompanies()
      setCompanyName('')
      setShowCompanyForm(false)
      alert('Company created successfully!')
    } catch (error) {
      console.error('Error creating company:', error)
      alert('Failed to create company')
    }
  }

  const handleUpdateCompany = async () => {
    if (!editingCompany || !companyName.trim()) return

    try {
      await updateDoc(doc(db, 'companies', editingCompany.id), {
        name: companyName.trim(),
        updatedAt: Timestamp.now()
      })
      await fetchCompanies()
      setEditingCompany(null)
      setCompanyName('')
      alert('Company updated successfully!')
    } catch (error) {
      console.error('Error updating company:', error)
      alert('Failed to update company')
    }
  }

  const handleDeleteCompany = async (companyId: string) => {
    if (!confirm('Are you sure you want to delete this company? This will also delete all associated users.')) {
      return
    }

    try {
      // Delete all users associated with this company
      const companyUsers = users.filter(u => u.companyId === companyId)
      for (const user of companyUsers) {
        await deleteDoc(doc(db, 'users', user.id))
      }
      
      await deleteDoc(doc(db, 'companies', companyId))
      await fetchCompanies()
      await fetchUsers()
      alert('Company deleted successfully!')
    } catch (error) {
      console.error('Error deleting company:', error)
      alert('Failed to delete company')
    }
  }

  const handleCreateUser = async () => {
    if (!userEmail.trim() || !userPassword.trim() || !selectedCompanyId) return

    try {
      await createUser(userEmail.trim(), userPassword, userRole, selectedCompanyId)
      await fetchUsers()
      setUserEmail('')
      setUserPassword('')
      setSelectedCompanyId('')
      setShowUserForm(false)
      alert('User created successfully!')
    } catch (error: any) {
      console.error('Error creating user:', error)
      alert(error.message || 'Failed to create user')
    }
  }

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user?')) {
      return
    }

    try {
      await deleteDoc(doc(db, 'users', userId))
      await fetchUsers()
      alert('User deleted successfully!')
    } catch (error) {
      console.error('Error deleting user:', error)
      alert('Failed to delete user')
    }
  }

  if (!isSuperAdmin) {
    return (
      <AuthGuard requiredRole="super_admin">
        <DashboardLayout>
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
              <p className="text-red-600 mb-4">You don't have permission to access this page.</p>
            </div>
          </div>
        </DashboardLayout>
      </AuthGuard>
    )
  }

  return (
    <AuthGuard requiredRole="super_admin">
      <DashboardLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Panel</h1>
            <p className="text-gray-600">Manage companies and user accounts</p>
          </div>

          {/* Tabs */}
          <div className="flex space-x-2 border-b border-gray-200">
            <button
              onClick={() => setActiveTab('companies')}
              className={`px-4 py-2 font-medium transition-colors ${
                activeTab === 'companies'
                  ? 'border-b-2 border-primary-600 text-primary-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Building2 className="inline h-4 w-4 mr-2" />
              Companies
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`px-4 py-2 font-medium transition-colors ${
                activeTab === 'users'
                  ? 'border-b-2 border-primary-600 text-primary-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Users className="inline h-4 w-4 mr-2" />
              Users
            </button>
          </div>

          {/* Companies Tab */}
          {activeTab === 'companies' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Companies</h2>
                <button
                  onClick={() => {
                    setShowCompanyForm(true)
                    setEditingCompany(null)
                    setCompanyName('')
                  }}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center space-x-2"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add Company</span>
                </button>
              </div>

              {showCompanyForm && (
                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-medium text-gray-900 mb-4">
                    {editingCompany ? 'Edit Company' : 'Create New Company'}
                  </h3>
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="Company name"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                    <button
                      onClick={editingCompany ? handleUpdateCompany : handleCreateCompany}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center space-x-2"
                    >
                      <Save className="h-4 w-4" />
                      <span>Save</span>
                    </button>
                    <button
                      onClick={() => {
                        setShowCompanyForm(false)
                        setEditingCompany(null)
                        setCompanyName('')
                      }}
                      className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center space-x-2"
                    >
                      <X className="h-4 w-4" />
                      <span>Cancel</span>
                    </button>
                  </div>
                </div>
              )}

              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-3"></div>
                  <p className="text-gray-600">Loading companies...</p>
                </div>
              ) : companies.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Building2 className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                  <p>No companies yet. Create one to get started.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left font-medium text-gray-700">Name</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-700">Created</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-700">Users</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-700">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {companies.map((company) => (
                        <tr key={company.id}>
                          <td className="px-4 py-3 font-medium text-gray-900">{company.name}</td>
                          <td className="px-4 py-3 text-gray-600">
                            {company.createdAt?.toDate?.()?.toLocaleDateString() || 'N/A'}
                          </td>
                          <td className="px-4 py-3 text-gray-600">
                            {users.filter(u => u.companyId === company.id).length}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => {
                                  setEditingCompany(company)
                                  setCompanyName(company.name)
                                  setShowCompanyForm(true)
                                }}
                                className="p-1 text-primary-600 hover:text-primary-700"
                                title="Edit"
                              >
                                <Edit2 className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteCompany(company.id)}
                                className="p-1 text-red-600 hover:text-red-700"
                                title="Delete"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </motion.div>
          )}

          {/* Users Tab */}
          {activeTab === 'users' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Users</h2>
                <button
                  onClick={() => {
                    setShowUserForm(true)
                    setUserEmail('')
                    setUserPassword('')
                    setUserRole('company_user')
                    setSelectedCompanyId('')
                  }}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center space-x-2"
                >
                  <UserPlus className="h-4 w-4" />
                  <span>Add User</span>
                </button>
              </div>

              {showUserForm && (
                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-medium text-gray-900 mb-4">Create New User</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                      <input
                        type="email"
                        value={userEmail}
                        onChange={(e) => setUserEmail(e.target.value)}
                        placeholder="user@example.com"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                      <input
                        type="password"
                        value={userPassword}
                        onChange={(e) => setUserPassword(e.target.value)}
                        placeholder="Minimum 6 characters"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
                      <select
                        value={selectedCompanyId}
                        onChange={(e) => setSelectedCompanyId(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      >
                        <option value="">Select a company</option>
                        {companies.map((company) => (
                          <option key={company.id} value={company.id}>
                            {company.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                      <select
                        value={userRole}
                        onChange={(e) => setUserRole(e.target.value as 'company_admin' | 'company_user')}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      >
                        <option value="company_user">Company User</option>
                        <option value="company_admin">Company Admin</option>
                      </select>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={handleCreateUser}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center space-x-2"
                      >
                        <Save className="h-4 w-4" />
                        <span>Create User</span>
                      </button>
                      <button
                        onClick={() => {
                          setShowUserForm(false)
                          setUserEmail('')
                          setUserPassword('')
                          setSelectedCompanyId('')
                        }}
                        className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center space-x-2"
                      >
                        <X className="h-4 w-4" />
                        <span>Cancel</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium text-gray-700">Email</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-700">Role</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-700">Company</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-700">Created</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {users.map((user) => (
                      <tr key={user.id}>
                        <td className="px-4 py-3 font-medium text-gray-900">{user.email}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            user.role === 'super_admin' ? 'bg-purple-100 text-purple-800' :
                            user.role === 'company_admin' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {user.role === 'super_admin' ? 'Super Admin' :
                             user.role === 'company_admin' ? 'Company Admin' :
                             'Company User'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-600">{user.companyName || 'N/A'}</td>
                        <td className="px-4 py-3 text-gray-600">
                          {user.createdAt?.toDate?.()?.toLocaleDateString() || 'N/A'}
                        </td>
                        <td className="px-4 py-3">
                          {user.role !== 'super_admin' && (
                            <button
                              onClick={() => handleDeleteUser(user.id)}
                              className="p-1 text-red-600 hover:text-red-700"
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}
        </div>
      </DashboardLayout>
    </AuthGuard>
  )
}

