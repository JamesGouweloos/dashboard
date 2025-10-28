'use client'

import { useState } from 'react'
import { RefreshCw, CheckCircle, AlertCircle } from 'lucide-react'

export default function ReprocessData() {
  const [isProcessing, setIsProcessing] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)

  const handleReprocess = async () => {
    setIsProcessing(true)
    setResult(null)

    try {
      const response = await fetch('/api/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()

      if (response.ok) {
        setResult({ success: true, message: data.message })
        // Trigger data refresh across the app
        window.dispatchEvent(new CustomEvent('dataRefresh'))
      } else {
        setResult({ success: false, message: data.error || 'Processing failed' })
      }
    } catch (error) {
      setResult({ 
        success: false, 
        message: error instanceof Error ? error.message : 'Network error' 
      })
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Reprocess Data</h3>
        <button
          onClick={handleReprocess}
          disabled={isProcessing}
          className={`flex items-center space-x-2 px-4 py-2 rounded-md font-medium transition-colors ${
            isProcessing
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          <RefreshCw className={`h-4 w-4 ${isProcessing ? 'animate-spin' : ''}`} />
          <span>{isProcessing ? 'Processing...' : 'Reprocess Data'}</span>
        </button>
      </div>

      <p className="text-sm text-gray-600 mb-4">
        Reprocess the stored booking data with updated business rules and calculations.
        This will update all dashboard visualizations without requiring a new file upload.
      </p>

      {result && (
        <div className={`flex items-center space-x-2 p-3 rounded-md ${
          result.success 
            ? 'bg-green-50 text-green-800 border border-green-200' 
            : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {result.success ? (
            <CheckCircle className="h-5 w-5 text-green-600" />
          ) : (
            <AlertCircle className="h-5 w-5 text-red-600" />
          )}
          <span className="text-sm font-medium">{result.message}</span>
        </div>
      )}
    </div>
  )
}
