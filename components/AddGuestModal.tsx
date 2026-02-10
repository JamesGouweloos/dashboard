'use client'

import { useState } from 'react'
import { X, Save, UserPlus } from 'lucide-react'

interface AddGuestModalProps {
  isOpen: boolean
  onClose: () => void
  onGuestAdded: () => void
}

export default function AddGuestModal({ isOpen, onClose, onGuestAdded }: AddGuestModalProps) {
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [formData, setFormData] = useState({
    year: new Date().getFullYear().toString(),
    month: (new Date().getMonth() + 1).toString(),
    guestNo: '',
    bookingName: '',
    surname: '',
    firstName: '',
    title: '',
    dateOfArrival: '',
    dateOfDeparture: '',
    bedNights: '',
    dob: '',
    countryOfResidence: '',
    nationality: '',
    passportNumber: '',
    emailAddress: ''
  })

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validate required fields
    if (!formData.firstName || !formData.surname) {
      setError('First name and surname are required')
      return
    }

    setIsSaving(true)

    try {
      const response = await fetch('/api/add-guest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      const result = await response.json()

      if (response.ok) {
        // Reset form
        setFormData({
          year: new Date().getFullYear().toString(),
          month: (new Date().getMonth() + 1).toString(),
          guestNo: '',
          bookingName: '',
          surname: '',
          firstName: '',
          title: '',
          dateOfArrival: '',
          dateOfDeparture: '',
          bedNights: '',
          dob: '',
          countryOfResidence: '',
          nationality: '',
          passportNumber: '',
          emailAddress: ''
        })
        onGuestAdded()
        onClose()
      } else {
        setError(result.error || 'Failed to add guest')
      }
    } catch (err) {
      setError('Network error. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <UserPlus className="h-6 w-6 text-primary-600" />
            <h2 className="text-2xl font-bold text-gray-900">Add New Guest</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Year */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
              <input
                type="number"
                value={formData.year}
                onChange={(e) => handleChange('year', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            {/* Month */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Month</label>
              <select
                value={formData.month}
                onChange={(e) => handleChange('month', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {new Date(2000, i, 1).toLocaleString('en-US', { month: 'long' })}
                  </option>
                ))}
              </select>
            </div>

            {/* Guest No */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Guest No.</label>
              <input
                type="text"
                value={formData.guestNo}
                onChange={(e) => handleChange('guestNo', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            {/* Booking Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Booking Name</label>
              <input
                type="text"
                value={formData.bookingName}
                onChange={(e) => handleChange('bookingName', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            {/* Surname - Required */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Surname <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.surname}
                onChange={(e) => handleChange('surname', e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            {/* First Name - Required */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                First Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.firstName}
                onChange={(e) => handleChange('firstName', e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <select
                value={formData.title}
                onChange={(e) => handleChange('title', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="">Select...</option>
                <option value="Mr">Mr</option>
                <option value="Mrs">Mrs</option>
                <option value="Ms">Ms</option>
                <option value="Miss">Miss</option>
                <option value="Dr">Dr</option>
                <option value="Prof">Prof</option>
              </select>
            </div>

            {/* Date of Arrival */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date of Arrival</label>
              <input
                type="date"
                value={formData.dateOfArrival}
                onChange={(e) => handleChange('dateOfArrival', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            {/* Date of Departure */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date of Departure</label>
              <input
                type="date"
                value={formData.dateOfDeparture}
                onChange={(e) => handleChange('dateOfDeparture', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            {/* Bed Nights */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bed Nights</label>
              <input
                type="number"
                value={formData.bedNights}
                onChange={(e) => handleChange('bedNights', e.target.value)}
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            {/* Date of Birth */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
              <input
                type="date"
                value={formData.dob}
                onChange={(e) => handleChange('dob', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            {/* Country of Residence */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Country of Residence</label>
              <input
                type="text"
                value={formData.countryOfResidence}
                onChange={(e) => handleChange('countryOfResidence', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            {/* Nationality */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nationality as per Passport</label>
              <input
                type="text"
                value={formData.nationality}
                onChange={(e) => handleChange('nationality', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            {/* Passport Number */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Passport Number</label>
              <input
                type="text"
                value={formData.passportNumber}
                onChange={(e) => handleChange('passportNumber', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            {/* Email Address */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
              <input
                type="email"
                value={formData.emailAddress}
                onChange={(e) => handleChange('emailAddress', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
          </div>
        </form>

        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit as any}
            disabled={isSaving}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center space-x-2 disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            <span>{isSaving ? 'Saving...' : 'Add Guest'}</span>
          </button>
        </div>
      </div>
    </div>
  )
}



