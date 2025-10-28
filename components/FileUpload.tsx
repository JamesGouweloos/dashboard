'use client'

import { useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { Upload, FileText, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react'

interface FileUploadProps {
  onUploadComplete: () => void
}

export default function FileUpload({ onUploadComplete }: FileUploadProps) {
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

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()

      if (response.ok) {
        setUploadStatus('success')
        setMessage(result.message || 'File uploaded and processed successfully!')
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
        <Upload className="h-5 w-5 text-primary-600" />
        <h2 className="text-xl font-semibold text-gray-900">Upload New Dataset</h2>
      </div>

      <div className="mb-4">
        <p className="text-sm text-gray-600 mb-2">
          Upload a new CSV file to update the dashboard with fresh data. The file should have the same format as the current dataset.
        </p>
        <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded-lg">
          <strong>Expected format:</strong> CSV file with booking data including columns for Property, Reservation #, Reservation name, Status, Agent, Source, etc.
        </div>
      </div>

      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center transition-colors
          ${uploadStatus === 'success' ? 'border-green-300 bg-green-50' : 
            uploadStatus === 'error' ? 'border-red-300 bg-red-50' : 
            'border-gray-300 hover:border-primary-400 hover:bg-primary-50'}
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={handleFileUpload}
          className="hidden"
          disabled={isUploading}
        />

        {isUploading ? (
          <div className="flex flex-col items-center space-y-3">
            <RefreshCw className="h-8 w-8 text-primary-600 animate-spin" />
            <p className="text-sm text-gray-600">Processing file...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center space-y-3">
            <FileText className="h-8 w-8 text-gray-400" />
            <div>
              <p className="text-sm text-gray-600">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="text-primary-600 hover:text-primary-700 font-medium"
                >
                  Click to upload
                </button>
                {' '}or drag and drop
              </p>
              <p className="text-xs text-gray-500 mt-1">CSV files only</p>
            </div>
          </div>
        )}
      </div>

      {message && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`mt-4 p-3 rounded-lg flex items-center space-x-2 ${
            uploadStatus === 'success' ? 'bg-green-50 text-green-800' :
            uploadStatus === 'error' ? 'bg-red-50 text-red-800' :
            'bg-blue-50 text-blue-800'
          }`}
        >
          {uploadStatus === 'success' ? (
            <CheckCircle className="h-4 w-4" />
          ) : uploadStatus === 'error' ? (
            <AlertCircle className="h-4 w-4" />
          ) : null}
          <span className="text-sm">{message}</span>
        </motion.div>
      )}

      <div className="mt-4 text-xs text-gray-500">
        <p><strong>Note:</strong> Uploading a new file will replace the current dataset and reprocess all data.</p>
      </div>
    </motion.div>
  )
}

