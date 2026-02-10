 'use client'

import DashboardLayout from '@/components/DashboardLayout'

export default function TemplePage() {
  return (
    <DashboardLayout>
      <div className="h-full min-h-[calc(100vh-6rem)] bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <iframe
          src="https://temple.agencyanalytics.app/client/1433209/dashboards"
          title="Temple Dashboard"
          className="w-full h-full"
          loading="lazy"
          allowFullScreen
        />
      </div>
    </DashboardLayout>
  )
}

