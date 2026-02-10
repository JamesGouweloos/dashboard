'use client'

import { useMemo, useState, useEffect } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { motion } from 'framer-motion'
import { TrendingUp } from 'lucide-react'

interface RevenueTrends {
	[key: string]: {
		revenue: number
		bookings: number
		bed_nights: number
	}
}

interface RevenueEfficiencyChartProps {
	revenueTrends: RevenueTrends
}

export default function RevenueEfficiencyChart({ 
	revenueTrends 
}: RevenueEfficiencyChartProps) {
	const [metric, setMetric] = useState<'per_booking' | 'per_night'>('per_booking')
	const [showDetails, setShowDetails] = useState(false)

	// Ensure data is always an object
	const safeData = useMemo(() => {
		if (!revenueTrends || typeof revenueTrends !== 'object') {
			return {}
		}
		return revenueTrends
	}, [revenueTrends])

	// Extract available years from data
	const availableYears = useMemo(() => {
		if (!safeData || typeof safeData !== 'object' || Object.keys(safeData).length === 0) {
			return []
		}
		const yearSet = new Set<number>()
		Object.keys(safeData).forEach(key => {
			const [y] = key.split('-')
			const yi = parseInt(y, 10)
			if (!isNaN(yi)) yearSet.add(yi)
		})
		return Array.from(yearSet).sort((a, b) => a - b)
	}, [safeData])

	const [selectedYears, setSelectedYears] = useState<number[]>([])

	// Initialize selectedYears when availableYears changes
	useEffect(() => {
		if (availableYears.length > 0 && selectedYears.length === 0) {
			setSelectedYears([...availableYears])
		}
	}, [availableYears])

	// Build efficiency data by year and month
	const efficiencyData = useMemo(() => {
		if (!safeData || typeof safeData !== 'object' || Object.keys(safeData).length === 0) {
			const base = Array.from({ length: 12 }, (_, i) => ({ month: i + 1 }))
			return base.map(r => {
				const row: any = { month: r.month }
				selectedYears.forEach(y => { row[y] = 0 })
				return row
			})
		}
		const byYear: Record<number, Record<number, { efficiency: number }>> = {}
		
		Object.entries(safeData).forEach(([key, values]) => {
			if (!values || typeof values !== 'object') return
			const [y, m] = key.split('-')
			const yi = parseInt(y, 10)
			const mi = parseInt(m, 10)
			
			if (!isNaN(yi) && !isNaN(mi)) {
				if (!byYear[yi]) byYear[yi] = {}
				
				let efficiency = 0
				if (metric === 'per_booking') {
					efficiency = (values.bookings || 0) > 0 ? (values.revenue || 0) / (values.bookings || 1) : 0
				} else {
					efficiency = (values.bed_nights || 0) > 0 ? (values.revenue || 0) / (values.bed_nights || 1) : 0
				}
				
				byYear[yi][mi] = { efficiency }
			}
		})
		
		// Create chart rows: one row per month, with efficiency values for each selected year
		const base = Array.from({ length: 12 }, (_, i) => ({ month: i + 1 }))
		const rows = base.map(r => {
			const row: any = { month: r.month }
			selectedYears.forEach(y => {
				const v = byYear[y]?.[r.month]
				row[y] = v ? parseFloat(v.efficiency.toFixed(2)) : 0
			})
			return row
		})
		
		return rows
	}, [safeData, selectedYears, metric])

	const toggleYear = (y: number) => {
		setSelectedYears(prev => prev.includes(y) ? prev.filter(v => v !== y) : [...prev, y].sort((a,b)=>a-b))
	}

	const COLORS = ['#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#14b8a6', '#ec4899', '#06b6d4']

	return (
		<motion.div
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
		>
			<div className="flex items-center justify-between mb-6">
				<div className="flex items-center space-x-2">
					<TrendingUp className="h-5 w-5 text-primary-600" />
					<h2 className="text-xl font-semibold text-gray-900">Revenue Efficiency</h2>
				</div>
				<div className="flex items-center gap-2">
					<div className="inline-flex rounded-md shadow-sm border border-gray-200 overflow-hidden" role="group">
						<button
							className={`px-3 py-1 text-sm ${metric==='per_booking' ? 'bg-primary-600 text-white' : 'bg-white text-gray-700'}`}
							onClick={() => setMetric('per_booking')}
						>Per Booking</button>
						<button
							className={`px-3 py-1 text-sm border-l border-gray-200 ${metric==='per_night' ? 'bg-primary-600 text-white' : 'bg-white text-gray-700'}`}
							onClick={() => setMetric('per_night')}
						>Per Night</button>
					</div>
					<button
						className="ml-2 px-3 py-1 text-sm rounded border border-gray-300 text-gray-700 hover:bg-gray-50"
						onClick={() => setShowDetails(true)}
					>
						Show details
					</button>
				</div>
			</div>

			{/* Year Filters */}
			<div className="mb-4">
				<div className="text-sm font-medium text-gray-700 mb-2">Years</div>
				<div className="flex flex-wrap gap-2">
					{availableYears.map(y => (
						<button
							key={y}
							className={`px-2 py-1 text-xs rounded border ${selectedYears.includes(y) ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-gray-700 border-gray-300'}`}
							onClick={() => toggleYear(y)}
						>{y}</button>
					))}
				</div>
			</div>

			<ResponsiveContainer width="100%" height={500}>
				<LineChart data={efficiencyData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
					<CartesianGrid strokeDasharray="3 3" />
					<XAxis 
						dataKey="month" 
						tick={{ fill: '#6B7280', fontSize: 12 }}
						tickFormatter={(m) => new Date(2000, (m as number)-1, 1).toLocaleString('en', { month: 'short' })}
					/>
					<YAxis 
						tick={{ fill: '#6B7280', fontSize: 12 }}
						width={80}
						tickFormatter={(v) => `$${(v as number).toLocaleString()}`}
					/>
					<Tooltip 
						contentStyle={{ borderRadius: '8px' }}
						formatter={(value: number, name: string) => [`$${value.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, name]}
						labelFormatter={(m) => new Date(2000, (m as number)-1, 1).toLocaleString('en', { month: 'long' })}
					/>
					<Legend />
					{selectedYears.map((y, idx) => (
						<Line
							key={y}
							type="monotone"
							dataKey={String(y)}
							stroke={COLORS[idx % COLORS.length]}
							strokeWidth={2}
							dot={false}
							name={String(y)}
						/>
					))}
				</LineChart>
			</ResponsiveContainer>

			{/* Details Modal */}
			{showDetails && (
				<div className="fixed inset-0 z-50 flex items-center justify-center">
					<div className="absolute inset-0 bg-black/30" onClick={() => setShowDetails(false)} />
					<div className="relative bg-white rounded-lg shadow-xl w-full max-w-5xl mx-4">
						<div className="flex items-center justify-between px-4 py-3 border-b">
							<h3 className="text-lg font-semibold text-gray-900">Data details</h3>
							<button className="text-gray-500 hover:text-gray-700" onClick={() => setShowDetails(false)}>✕</button>
						</div>
						<div className="p-4 overflow-auto max-h-[70vh]">
							<table className="min-w-full text-sm">
								<thead className="bg-gray-50">
									<tr>
										<th className="text-left px-3 py-2 font-medium text-gray-700">Month</th>
										{selectedYears.map(y => (
											<th key={y} className="text-right px-3 py-2 font-medium text-gray-700">{y}</th>
										))}
									</tr>
								</thead>
								<tbody>
									{efficiencyData.map((row: any) => (
										<tr key={row.month} className="border-t">
											<td className="px-3 py-1.5 text-gray-800">{new Date(2000, row.month-1, 1).toLocaleString('en', { month: 'short' })}</td>
											{selectedYears.map(y => (
												<td key={y} className="px-3 py-1.5 text-right tabular-nums">${(row[y] || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
											))}
										</tr>
									))}
								</tbody>
								<tfoot>
									<tr className="border-t bg-gray-50">
										<td className="px-3 py-1.5 font-semibold text-gray-900">Average</td>
										{selectedYears.map(y => {
											const yearValues = efficiencyData.map((r: any) => r[y] || 0).filter((v: number) => v > 0)
											const avg = yearValues.length > 0 
												? yearValues.reduce((s: number, v: number) => s + v, 0) / yearValues.length 
												: 0
											return (
												<td key={y} className="px-3 py-1.5 text-right font-semibold text-gray-900 tabular-nums">
													${avg.toLocaleString('en-US', { minimumFractionDigits: 2 })}
												</td>
											)
										})}
									</tr>
								</tfoot>
							</table>
						</div>
						<div className="px-4 py-3 border-t flex justify-end">
							<button className="px-3 py-1.5 text-sm rounded bg-gray-100 text-gray-800 hover:bg-gray-200" onClick={() => setShowDetails(false)}>Close</button>
						</div>
					</div>
				</div>
			)}
		</motion.div>
	)
}
