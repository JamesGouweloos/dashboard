'use client'

import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/DashboardLayout'
import FileUpload from '@/components/FileUpload'
import { useRealtimeData } from '@/lib/useRealtimeData'

export default function UploadPage() {
  const { data, loading, lastUpdated } = useRealtimeData()

  const handleUploadComplete = () => {
    // Show success message
    setTimeout(() => {
      alert('Dataset updated successfully! All pages will now show the new data.')
    }, 1000)
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Data Management</h1>
          <p className="text-gray-600">
            Upload new datasets to update the dashboard with fresh booking data
          </p>
          
          {/* Data Status */}
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Current Data Status</h3>
            {loading ? (
              <p className="text-gray-600">Loading data status...</p>
            ) : data ? (
              <div className="space-y-2">
                <p className="text-sm text-gray-600">
                  <strong>Total Bookings:</strong> {(data as any).summary?.total_bookings || 'N/A'}
                </p>
                <p className="text-sm text-gray-600">
                  <strong>Total Revenue:</strong> ${(data as any).summary?.total_revenue?.toLocaleString() || 'N/A'}
                </p>
                <p className="text-sm text-gray-600">
                  <strong>Last Updated:</strong> {lastUpdated ? new Date(lastUpdated).toLocaleString() : 'N/A'}
                </p>
              </div>
            ) : (
              <p className="text-red-600">No data available. Please upload a CSV file.</p>
            )}
          </div>
        </div>

        <FileUpload onUploadComplete={handleUploadComplete} />

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">Upload Process</h3>
          <ol className="text-sm text-blue-800 space-y-1">
            <li>1. Select or drag your CSV file</li>
            <li>2. File is validated and saved as bookingData.csv</li>
            <li>3. Python script processes the data and applies business rules</li>
            <li>4. New dashboard_data.json is generated</li>
            <li>5. All dashboard pages automatically refresh with new data</li>
          </ol>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-yellow-900 mb-2">Important Notes</h3>
          <ul className="text-sm text-yellow-800 space-y-1">
            <li>• The CSV file must have the same format as the current dataset</li>
            <li>• Uploading will replace all current data</li>
            <li>• Processing may take 10-30 seconds depending on file size</li>
            <li>• All business rules will be applied to the new data</li>
            <li>• Charts and tables will update automatically</li>
          </ul>
        </div>
      </div>
    </DashboardLayout>
  )
}

