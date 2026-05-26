'use client'

import { Fragment, useEffect, useState } from 'react'
import DashboardLayout from '@/components/DashboardLayout'
import AuthGuard from '@/components/AuthGuard'
import { ChevronDown, ChevronUp, Download } from 'lucide-react'

type WeeklyBooking = {
  ref: string
  name: string
  status: string
  bookingClass: string
  arrivalDate: string
  totalExclVat: number
  agent: string
  source: string
}

type WeeklyReport = {
  id: string
  week_key: string
  generated_at: string | null
  baseline_snapshot_week: string | null
  updates_count: number
  drop_off_count: number
  total_current_bookings: number
  snapshot_finalized: boolean
  updates: Array<WeeklyBooking & { category: string }>
  drop_off: Array<WeeklyBooking & { previousStatus: string }>
}

export default function WeeklyReportsPage() {
  const [reports, setReports] = useState<WeeklyReport[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedWeek, setExpandedWeek] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/weekly-reports', { cache: 'no-store' })
        if (!res.ok) throw new Error(`Failed to fetch weekly reports: ${res.status}`)
        const payload = await res.json()
        setReports(Array.isArray(payload?.reports) ? payload.reports : [])
      } catch (err: any) {
        setError(err?.message || 'Unknown error')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  return (
    <AuthGuard>
      <DashboardLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Weekly Sales Reports</h1>
            <p className="text-gray-600">
              Generated report snapshots by week, including updates and drop-offs.
            </p>
          </div>

          {loading && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 text-gray-600">
              Loading weekly reports...
            </div>
          )}

          {error && (
            <div className="bg-white rounded-xl shadow-sm border border-red-200 p-6 text-red-600">
              {error}
            </div>
          )}

          {!loading && !error && reports.length === 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 text-gray-600">
              No weekly reports available yet.
            </div>
          )}

          {!loading && !error && reports.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Week</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Generated</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Baseline</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Updates</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Drop-offs</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Bookings</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Status</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Download</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {reports.map((report) => {
                      const isExpanded = expandedWeek === report.week_key
                      return (
                        <Fragment key={report.id}>
                          <tr key={report.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm text-gray-900 font-medium">{report.week_key}</td>
                            <td className="px-4 py-3 text-sm text-gray-700">
                              {report.generated_at ? new Date(report.generated_at).toLocaleString() : 'N/A'}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-700">{report.baseline_snapshot_week || 'None'}</td>
                            <td className="px-4 py-3 text-sm text-right text-gray-900">{report.updates_count}</td>
                            <td className="px-4 py-3 text-sm text-right text-gray-900">{report.drop_off_count}</td>
                            <td className="px-4 py-3 text-sm text-right text-gray-900">{report.total_current_bookings}</td>
                            <td className="px-4 py-3 text-center text-sm">
                              <span
                                className={`px-2 py-1 rounded text-xs font-medium ${
                                  report.snapshot_finalized
                                    ? 'bg-green-100 text-green-700'
                                    : 'bg-yellow-100 text-yellow-700'
                                }`}
                              >
                                {report.snapshot_finalized ? 'Finalized' : 'In Progress'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <a
                                href={`/api/weekly-reports/${report.week_key}/excel`}
                                download
                                className="inline-flex items-center justify-center p-1 text-blue-600 hover:text-blue-800"
                                aria-label={`Download Excel for ${report.week_key}`}
                              >
                                <Download className="h-4 w-4" />
                              </a>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <button
                                onClick={() => setExpandedWeek(isExpanded ? null : report.week_key)}
                                className="inline-flex items-center justify-center p-1 text-gray-600 hover:text-gray-900"
                                aria-label={`Toggle details for ${report.week_key}`}
                              >
                                {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                              </button>
                            </td>
                          </tr>
                          {isExpanded && (
                            <tr>
                              <td colSpan={9} className="px-4 py-4 bg-gray-50">
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                  <div>
                                    <h3 className="text-sm font-semibold text-gray-900 mb-2">
                                      Updates ({report.updates.length})
                                    </h3>
                                    <div className="max-h-64 overflow-y-auto border border-gray-200 rounded bg-white">
                                      {report.updates.length === 0 ? (
                                        <p className="p-3 text-sm text-gray-600">No updates recorded.</p>
                                      ) : (
                                        <table className="w-full text-xs">
                                          <thead className="bg-gray-50 border-b border-gray-200">
                                            <tr>
                                              <th className="px-2 py-2 text-left">Category</th>
                                              <th className="px-2 py-2 text-left">Ref</th>
                                              <th className="px-2 py-2 text-left">Status</th>
                                              <th className="px-2 py-2 text-right">Total</th>
                                            </tr>
                                          </thead>
                                          <tbody className="divide-y divide-gray-100">
                                            {report.updates.slice(0, 200).map((u, idx) => (
                                              <tr key={`${u.ref}-${idx}`}>
                                                <td className="px-2 py-2">{u.category}</td>
                                                <td className="px-2 py-2">{u.ref}</td>
                                                <td className="px-2 py-2">{u.status}</td>
                                                <td className="px-2 py-2 text-right">
                                                  ${(u.totalExclVat || 0).toLocaleString()}
                                                </td>
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table>
                                      )}
                                    </div>
                                  </div>

                                  <div>
                                    <h3 className="text-sm font-semibold text-gray-900 mb-2">
                                      Drop-offs ({report.drop_off.length})
                                    </h3>
                                    <div className="max-h-64 overflow-y-auto border border-gray-200 rounded bg-white">
                                      {report.drop_off.length === 0 ? (
                                        <p className="p-3 text-sm text-gray-600">No drop-offs recorded.</p>
                                      ) : (
                                        <table className="w-full text-xs">
                                          <thead className="bg-gray-50 border-b border-gray-200">
                                            <tr>
                                              <th className="px-2 py-2 text-left">Ref</th>
                                              <th className="px-2 py-2 text-left">Prev Status</th>
                                              <th className="px-2 py-2 text-left">Arrival</th>
                                              <th className="px-2 py-2 text-right">Total</th>
                                            </tr>
                                          </thead>
                                          <tbody className="divide-y divide-gray-100">
                                            {report.drop_off.slice(0, 200).map((d, idx) => (
                                              <tr key={`${d.ref}-${idx}`}>
                                                <td className="px-2 py-2">{d.ref}</td>
                                                <td className="px-2 py-2">{d.previousStatus}</td>
                                                <td className="px-2 py-2">{d.arrivalDate || '-'}</td>
                                                <td className="px-2 py-2 text-right">
                                                  ${(d.totalExclVat || 0).toLocaleString()}
                                                </td>
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </DashboardLayout>
    </AuthGuard>
  )
}

