'use client'

import { useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { Upload, FileText, CheckCircle, AlertCircle, RefreshCw, MessageSquare } from 'lucide-react'

interface GuestFeedbackFileUploadProps {
  onUploadComplete: () => void
}

export default function GuestFeedbackFileUpload({ onUploadComplete }: GuestFeedbackFileUploadProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setUploadStatus('error')
      setMessage('Please upload a CSV file')
      return
    }

    setIsUploading(true)
    setUploadStatus('idle')
    setMessage('')

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/upload-guest-feedback', {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()

      if (response.ok) {
        setUploadStatus('success')
        setMessage(result.message || 'Guest feedback data uploaded and processed successfully!')
        onUploadComplete()
      } else {
        setUploadStatus('error')
        setMessage(result.error || 'Upload failed')
      }
    } catch (error) {
      setUploadStatus('error')
      setMessage('Network error. Please try again.')
    } finally {
      setIsUploading(false)
    }
  }

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault()
    const file = event.dataTransfer.files[0]
    if (file && fileInputRef.current) {
      const dataTransfer = new DataTransfer()
      dataTransfer.items.add(file)
      fileInputRef.current.files = dataTransfer.files
      handleFileUpload({ target: { files: dataTransfer.files } } as any)
    }
  }

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault()
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
    >
      <div className="flex items-center space-x-2 mb-4">
        <MessageSquare className="h-5 w-5 text-primary-600" />
        <h2 className="text-xl font-semibold text-gray-900">Upload Guest Feedback Data</h2>
      </div>

      <div className="mb-4">
        <p className="text-sm text-gray-600 mb-2">
          Upload a CSV file containing historical guest feedback data.
        </p>
        <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded-lg">
          <strong>Expected columns:</strong> Guest Name, Booking Dates Email (or Email), Service, Food, Activities, 
          Lodge Staff, Accommodation, Overall Stay, Comments<br />
          <strong>Optional columns:</strong> Checkout Date (or Date) - if not provided, will default to today's date<br />
          <strong>Rating values:</strong> Poor, Average, Good, Excellent<br />
          <strong>Note:</strong> All rating fields are required. Email will be extracted from the "Booking Dates Email" column if present. 
          If checkout date is missing, it will default to the upload date.
        </div>
      </div>

      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center transition-colors
          ${uploadStatus === 'success' ? 'border-green-300 bg-green-50' : 
            uploadStatus === 'error' ? 'border-red-300 bg-red-50' : 
            'border-gray-300 hover:border-primary-400 hover:bg-gray-50'}
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={handleFileUpload}
          className="hidden"
        />

        {isUploading ? (
          <div className="flex flex-col items-center">
            <RefreshCw className="h-12 w-12 text-primary-600 animate-spin mb-4" />
            <p className="text-gray-700 font-medium">Processing guest feedback data...</p>
            <p className="text-sm text-gray-500 mt-2">This may take a moment</p>
          </div>
        ) : uploadStatus === 'success' ? (
          <div className="flex flex-col items-center">
            <CheckCircle className="h-12 w-12 text-green-600 mb-4" />
            <p className="text-gray-700 font-medium">{message}</p>
          </div>
        ) : uploadStatus === 'error' ? (
          <div className="flex flex-col items-center">
            <AlertCircle className="h-12 w-12 text-red-600 mb-4" />
            <p className="text-gray-700 font-medium">{message}</p>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <FileText className="h-12 w-12 text-gray-400 mb-4" />
            <p className="text-gray-700 font-medium mb-2">
              Drag and drop your guest feedback CSV file here
            </p>
            <p className="text-sm text-gray-500 mb-4">or</p>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center space-x-2"
            >
              <Upload className="h-5 w-5" />
              <span>Select CSV File</span>
            </button>
          </div>
        )}
      </div>
    </motion.div>
  )
}

