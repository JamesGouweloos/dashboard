'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import DashboardLayout from '@/components/DashboardLayout'
import { MessageSquare, Star, User, Mail, Trash2, TrendingUp, Award, Edit2, X, ArrowUpDown, ArrowUp, ArrowDown, Filter } from 'lucide-react'

type Rating = 'Poor' | 'Average' | 'Good' | 'Excellent'

interface GuestFeedback {
  id: string
  guestName: string
  emailAddress?: string
  checkoutDate: string
  service: Rating
  food: Rating
  activities: Rating
  lodgeStaff: Rating
  accommodation: Rating
  overallStay: Rating
  comments?: string
  timestamp: string
}

const RATING_OPTIONS: Rating[] = ['Poor', 'Average', 'Good', 'Excellent']
const RATING_COLORS = {
  'Poor': 'bg-red-100 text-red-800',
  'Average': 'bg-yellow-100 text-yellow-800',
  'Good': 'bg-blue-100 text-blue-800',
  'Excellent': 'bg-green-100 text-green-800',
}

const RATING_VALUES = {
  'Poor': 1,
  'Average': 2,
  'Good': 3,
  'Excellent': 4,
}

type SortField = 'date' | 'name' | null
type SortDirection = 'asc' | 'desc'

export default function GuestFeedbackPage() {
  const [feedback, setFeedback] = useState<GuestFeedback[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedFeedback, setExpandedFeedback] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [sortField, setSortField] = useState<SortField>('date')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [formData, setFormData] = useState({
    guestName: '',
    emailAddress: '',
    checkoutDate: new Date().toISOString().split('T')[0], // Default to today's date
    service: 'Excellent' as Rating,
    food: 'Excellent' as Rating,
    activities: 'Excellent' as Rating,
    lodgeStaff: 'Excellent' as Rating,
    accommodation: 'Excellent' as Rating,
    overallStay: 'Excellent' as Rating,
    comments: '',
  })

  useEffect(() => {
    fetchFeedback()
  }, [])

  const fetchFeedback = async () => {
    try {
      const response = await fetch('/api/guest-feedback')
      if (response.ok) {
        const data = await response.json()
        setFeedback(data)
      }
    } catch (error) {
      console.error('Error fetching feedback:', error)
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      guestName: '',
      emailAddress: '',
      checkoutDate: new Date().toISOString().split('T')[0], // Default to today's date
      service: 'Excellent',
      food: 'Excellent',
      activities: 'Excellent',
      lodgeStaff: 'Excellent',
      accommodation: 'Excellent',
      overallStay: 'Excellent',
      comments: '',
    })
    setEditingId(null)
  }

  const handleEdit = (item: GuestFeedback) => {
    // Extract date from timestamp (ISO string) or use checkoutDate if available
    let checkoutDate = item.checkoutDate || ''
    if (!checkoutDate && item.timestamp) {
      // Convert timestamp to date string (YYYY-MM-DD)
      checkoutDate = new Date(item.timestamp).toISOString().split('T')[0]
    }
    
    setFormData({
      guestName: item.guestName,
      emailAddress: item.emailAddress || '',
      checkoutDate: checkoutDate,
      service: item.service,
      food: item.food,
      activities: item.activities,
      lodgeStaff: item.lodgeStaff,
      accommodation: item.accommodation,
      overallStay: item.overallStay,
      comments: item.comments || '',
    })
    setEditingId(item.id)
    setExpandedFeedback(null)
  }

  const handleCancelEdit = () => {
    resetForm()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.guestName.trim()) {
      alert('Please enter guest name')
      return
    }

    try {
      const url = '/api/guest-feedback'
      const method = editingId ? 'PUT' : 'POST'
      const body = editingId 
        ? { id: editingId, ...formData }
        : formData

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      })

      if (response.ok) {
        const updatedFeedback = await response.json()
        
        if (editingId) {
          // Update existing feedback
          setFeedback(prev => prev.map(f => f.id === editingId ? { ...f, ...updatedFeedback } : f))
          alert('Feedback updated successfully!')
        } else {
          // Add new feedback
          setFeedback(prev => [...prev, updatedFeedback])
        alert('Feedback submitted successfully!')
        }
        
        resetForm()
        fetchFeedback() // Refresh to get latest data
      } else {
        const error = await response.json()
        alert(`Error: ${error.message || 'Failed to submit feedback'}`)
      }
    } catch (error) {
      console.error('Error submitting feedback:', error)
      alert('Failed to submit feedback. Please try again.')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this feedback? This action cannot be undone.')) {
      return
    }

    try {
      const response = await fetch(`/api/guest-feedback?id=${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setFeedback(prev => prev.filter(f => f.id !== id))
        alert('Feedback deleted successfully!')
      } else {
        const error = await response.json()
        alert(`Error: ${error.message || 'Failed to delete feedback'}`)
      }
    } catch (error) {
      console.error('Error deleting feedback:', error)
      alert('Failed to delete feedback. Please try again.')
    }
  }

  // Calculate statistics
  const stats = useMemo(() => {
    const total = feedback.length
    if (total === 0) {
      return {
        total,
        avgService: 0,
        avgFood: 0,
        avgActivities: 0,
        avgLodgeStaff: 0,
        avgAccommodation: 0,
        avgOverallStay: 0,
        excellentCount: 0,
        goodCount: 0,
        averageCount: 0,
        poorCount: 0,
      }
    }

    const sums = feedback.reduce((acc, f) => ({
      service: acc.service + RATING_VALUES[f.service],
      food: acc.food + RATING_VALUES[f.food],
      activities: acc.activities + RATING_VALUES[f.activities],
      lodgeStaff: acc.lodgeStaff + RATING_VALUES[f.lodgeStaff],
      accommodation: acc.accommodation + RATING_VALUES[f.accommodation],
      overallStay: acc.overallStay + RATING_VALUES[f.overallStay],
    }), {
      service: 0,
      food: 0,
      activities: 0,
      lodgeStaff: 0,
      accommodation: 0,
      overallStay: 0,
    })

    const excellentCount = feedback.filter(f => f.overallStay === 'Excellent').length
    const goodCount = feedback.filter(f => f.overallStay === 'Good').length
    const averageCount = feedback.filter(f => f.overallStay === 'Average').length
    const poorCount = feedback.filter(f => f.overallStay === 'Poor').length

    return {
      total,
      avgService: sums.service / total,
      avgFood: sums.food / total,
      avgActivities: sums.activities / total,
      avgLodgeStaff: sums.lodgeStaff / total,
      avgAccommodation: sums.accommodation / total,
      avgOverallStay: sums.overallStay / total,
      excellentCount,
      goodCount,
      averageCount,
      poorCount,
    }
  }, [feedback])

  const getRatingBadge = (rating: Rating) => {
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${RATING_COLORS[rating]}`}>
        {rating}
      </span>
    )
  }

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // Toggle direction if same field
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      // Set new field with default direction
      setSortField(field)
      setSortDirection(field === 'date' ? 'desc' : 'asc') // Date defaults to desc, name to asc
    }
  }

  // Sort and filter feedback
  const sortedFeedback = useMemo(() => {
    let sorted = [...feedback]

    if (sortField === 'date') {
      sorted.sort((a, b) => {
        const dateA = a.checkoutDate 
          ? new Date(a.checkoutDate + 'T00:00:00').getTime()
          : new Date(a.timestamp).getTime()
        const dateB = b.checkoutDate 
          ? new Date(b.checkoutDate + 'T00:00:00').getTime()
          : new Date(b.timestamp).getTime()
        
        return sortDirection === 'asc' ? dateA - dateB : dateB - dateA
      })
    } else if (sortField === 'name') {
      sorted.sort((a, b) => {
        const nameA = a.guestName.toLowerCase()
        const nameB = b.guestName.toLowerCase()
        const comparison = nameA.localeCompare(nameB)
        return sortDirection === 'asc' ? comparison : -comparison
      })
    } else {
      // Default: sort by timestamp (newest first)
      sorted.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    }

    return sorted
  }, [feedback, sortField, sortDirection])

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-4 w-4 ml-1 text-gray-400" />
    }
    return sortDirection === 'asc' 
      ? <ArrowUp className="h-4 w-4 ml-1 text-primary-600" />
      : <ArrowDown className="h-4 w-4 ml-1 text-primary-600" />
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading guest feedback data...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Guest Feedback</h1>
          <p className="text-gray-600">
            Capture and review guest feedback and comments
          </p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Feedback</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <MessageSquare className="h-8 w-8 text-primary-600" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Excellent Ratings</p>
                <p className="text-2xl font-bold text-gray-900">{stats.excellentCount}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {stats.total > 0 ? ((stats.excellentCount / stats.total) * 100).toFixed(1) : 0}%
                </p>
              </div>
              <Award className="h-8 w-8 text-green-600" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Average Overall</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.avgOverallStay > 0 ? stats.avgOverallStay.toFixed(2) : '0.00'}
                </p>
                <p className="text-xs text-gray-500 mt-1">out of 4.0</p>
              </div>
              <TrendingUp className="h-8 w-8 text-primary-600" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Good & Excellent</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.goodCount + stats.excellentCount}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {stats.total > 0 ? (((stats.goodCount + stats.excellentCount) / stats.total) * 100).toFixed(1) : 0}%
                </p>
              </div>
              <Star className="h-8 w-8 text-blue-600" />
            </div>
          </motion.div>
        </div>

        {/* Average Ratings by Category */}
        {stats.total > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
          >
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Average Ratings by Category</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-600 mb-1">Service</p>
                <p className="text-xl font-bold text-gray-900">{stats.avgService.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Food</p>
                <p className="text-xl font-bold text-gray-900">{stats.avgFood.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Activities</p>
                <p className="text-xl font-bold text-gray-900">{stats.avgActivities.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Lodge Staff</p>
                <p className="text-xl font-bold text-gray-900">{stats.avgLodgeStaff.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Accommodation</p>
                <p className="text-xl font-bold text-gray-900">{stats.avgAccommodation.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Overall Stay</p>
                <p className="text-xl font-bold text-gray-900">{stats.avgOverallStay.toFixed(2)}</p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Form and Table */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Form */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
          >
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              {editingId ? 'Edit Guest Feedback' : 'Submit Guest Feedback'}
            </h2>
            {editingId && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">You are editing an existing feedback entry.</p>
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Guest Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.guestName}
                  onChange={(e) => setFormData({ ...formData, guestName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Enter guest name"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address <span className="text-gray-500 text-xs">(optional)</span>
                </label>
                <input
                  type="email"
                  value={formData.emailAddress}
                  onChange={(e) => setFormData({ ...formData, emailAddress: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Enter email address (optional)"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Checkout Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.checkoutDate}
                  onChange={(e) => setFormData({ ...formData, checkoutDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  required
                />
              </div>

              {/* Rating Questions */}
              <div className="space-y-3 pt-2 border-t border-gray-200">
                <p className="text-sm font-medium text-gray-700 mb-2">Ratings</p>
                
                {[
                  { key: 'service', label: '(1) How do you rate our service?' },
                  { key: 'food', label: '(2) How do you rate our food?' },
                  { key: 'activities', label: '(3) How do you rate our activities?' },
                  { key: 'lodgeStaff', label: '(4) How do you rate our Lodge staff?' },
                  { key: 'accommodation', label: '(5) How do you rate the accommodation?' },
                  { key: 'overallStay', label: '(6) How do you rate your overall stay?' },
                ].map(({ key, label }) => (
                  <div key={key}>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      {label}
                    </label>
                    <div className="flex items-center space-x-3">
                      {RATING_OPTIONS.map((rating) => (
                        <label
                          key={rating}
                          className="flex items-center space-x-1 cursor-pointer"
                        >
                          <input
                            type="radio"
                            name={key}
                            value={rating}
                            checked={formData[key as keyof typeof formData] === rating}
                            onChange={(e) => setFormData({ ...formData, [key]: e.target.value as Rating })}
                            className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                            required
                          />
                          <span className="text-xs text-gray-700">{rating}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Comments
                </label>
                <textarea
                  value={formData.comments}
                  onChange={(e) => setFormData({ ...formData, comments: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Enter comments (optional)"
                  rows={3}
                />
              </div>

              <div className="flex space-x-2">
              <button
                type="submit"
                  className="flex-1 bg-primary-600 text-white py-2 px-4 rounded-lg hover:bg-primary-700 transition-colors flex items-center justify-center space-x-2"
              >
                <MessageSquare className="h-5 w-5" />
                  <span>{editingId ? 'Update Feedback' : 'Submit Feedback'}</span>
                </button>
                {editingId && (
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center space-x-2"
                  >
                    <X className="h-5 w-5" />
                    <span>Cancel</span>
              </button>
                )}
              </div>
            </form>
          </motion.div>

          {/* Table */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Feedback Submissions</h2>
              <div className="flex items-center space-x-2">
                <Filter className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-600">Sort by:</span>
                <button
                  onClick={() => handleSort('date')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center ${
                    sortField === 'date'
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Date
                  {getSortIcon('date')}
                </button>
                <button
                  onClick={() => handleSort('name')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center ${
                    sortField === 'name'
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Name
                  {getSortIcon('name')}
                </button>
              </div>
            </div>
            
            {feedback.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p>No feedback submitted yet. Use the form to start capturing feedback!</p>
              </div>
            ) : (
              <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium text-gray-700 w-12"></th>
                      <th 
                        className="px-3 py-2 text-left font-medium text-gray-700 cursor-pointer hover:bg-gray-100 select-none"
                        onClick={() => handleSort('date')}
                      >
                        <div className="flex items-center">
                          Checkout Date
                          {getSortIcon('date')}
                        </div>
                      </th>
                      <th 
                        className="px-3 py-2 text-left font-medium text-gray-700 cursor-pointer hover:bg-gray-100 select-none"
                        onClick={() => handleSort('name')}
                      >
                        <div className="flex items-center">
                          Guest
                          {getSortIcon('name')}
                        </div>
                      </th>
                      <th className="px-3 py-2 text-left font-medium text-gray-700">Email</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-700">Overall</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-700">Comments</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {sortedFeedback.map((item) => (
                        <React.Fragment key={item.id}>
                          <tr className="hover:bg-gray-50">
                            <td className="px-3 py-2">
                              <button
                                onClick={() => setExpandedFeedback(expandedFeedback === item.id ? null : item.id)}
                                className="text-primary-600 hover:text-primary-700"
                                title={expandedFeedback === item.id ? 'Collapse' : 'Expand'}
                              >
                                {expandedFeedback === item.id ? '−' : '+'}
                              </button>
                            </td>
                            <td className="px-3 py-2 text-gray-600">
                              {item.checkoutDate 
                                ? new Date(item.checkoutDate + 'T00:00:00').toLocaleDateString()
                                : new Date(item.timestamp).toLocaleDateString()}
                            </td>
                            <td className="px-3 py-2 text-gray-600">{item.guestName}</td>
                            <td className="px-3 py-2 text-gray-600">{item.emailAddress || '-'}</td>
                            <td className="px-3 py-2">
                              {getRatingBadge(item.overallStay)}
                            </td>
                            <td className="px-3 py-2 text-gray-600 max-w-xs truncate">
                              {item.comments || '-'}
                            </td>
                            <td className="px-3 py-2">
                              <div className="flex items-center space-x-2">
                                <button
                                  onClick={() => handleEdit(item)}
                                  disabled={editingId === item.id}
                                  className={`p-1 ${editingId === item.id ? 'text-gray-400 cursor-not-allowed' : 'text-blue-600 hover:text-blue-700'}`}
                                  title={editingId === item.id ? 'Currently editing' : 'Edit'}
                                >
                                  <Edit2 className="h-4 w-4" />
                                </button>
                              <button
                                onClick={() => handleDelete(item.id)}
                                  disabled={editingId === item.id}
                                  className={`p-1 ${editingId === item.id ? 'text-gray-400 cursor-not-allowed' : 'text-red-600 hover:text-red-700'}`}
                                  title={editingId === item.id ? 'Cannot delete while editing' : 'Delete'}
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                              </div>
                            </td>
                          </tr>
                          {expandedFeedback === item.id && (
                            <tr>
                              <td colSpan={7} className="px-3 py-4 bg-gray-50">
                                <div className="space-y-3">
                                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                    <div>
                                      <p className="text-xs font-medium text-gray-700 mb-1">Service</p>
                                      {getRatingBadge(item.service)}
                                    </div>
                                    <div>
                                      <p className="text-xs font-medium text-gray-700 mb-1">Food</p>
                                      {getRatingBadge(item.food)}
                                    </div>
                                    <div>
                                      <p className="text-xs font-medium text-gray-700 mb-1">Activities</p>
                                      {getRatingBadge(item.activities)}
                                    </div>
                                    <div>
                                      <p className="text-xs font-medium text-gray-700 mb-1">Lodge Staff</p>
                                      {getRatingBadge(item.lodgeStaff)}
                                    </div>
                                    <div>
                                      <p className="text-xs font-medium text-gray-700 mb-1">Accommodation</p>
                                      {getRatingBadge(item.accommodation)}
                                    </div>
                                    <div>
                                      <p className="text-xs font-medium text-gray-700 mb-1">Overall Stay</p>
                                      {getRatingBadge(item.overallStay)}
                                    </div>
                                  </div>
                                  {item.comments && (
                                    <div className="pt-2 border-t border-gray-200">
                                      <p className="text-xs font-medium text-gray-700 mb-1">Comments:</p>
                                      <p className="text-sm text-gray-600">{item.comments}</p>
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </DashboardLayout>
  )
}

