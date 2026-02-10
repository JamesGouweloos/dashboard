'use client'

import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/DashboardLayout'
import FileUpload from '@/components/FileUpload'
import OccupancyFileUpload from '@/components/OccupancyFileUpload'
import GuestFileUpload from '@/components/GuestFileUpload'
import GuestFeedbackFileUpload from '@/components/GuestFeedbackFileUpload'
import ReprocessData from '@/components/ReprocessData'
import BrandAssetUpload from '@/components/BrandAssetUpload'
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

        <OccupancyFileUpload onUploadComplete={handleUploadComplete} />

        <GuestFileUpload onUploadComplete={handleUploadComplete} />

        <GuestFeedbackFileUpload onUploadComplete={handleUploadComplete} />

        <BrandAssetUpload />

        <ReprocessData />
      </div>
    </DashboardLayout>
  )
}

