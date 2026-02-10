'use client'

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { motion } from 'framer-motion'
import { TrendingUp } from 'lucide-react'
import { useMemo, useState } from 'react'

interface RevenueTrends {
	[key: string]: {
		revenue: number
		bookings: number
		bed_nights: number
	}
}

export default function RevenueChart({ data }: { data: RevenueTrends }) {
	const [mode, setMode] = useState<'single' | 'yoy'>('single')
	const [comparisonMode, setComparisonMode] = useState<'period' | 'ytd' | 'mom'>('period')
	const [metric, setMetric] = useState<'revenue' | 'bed_nights'>('revenue')
	const [showDetails, setShowDetails] = useState(false)

	// Ensure data is always an object
	const safeData = useMemo(() => {
		if (!data || typeof data !== 'object') {
			return {}
		}
		return data
	}, [data])

	// Derive available years and months from keys like "YYYY-MM"
	const { years, months } = useMemo(() => {
		if (!safeData || typeof safeData !== 'object' || Object.keys(safeData).length === 0) {
			return { years: [], months: [1,2,3,4,5,6,7,8,9,10,11,12] }
		}
		const yearSet = new Set<number>()
		const monthSet = new Set<number>()
		Object.keys(safeData).forEach(key => {
			const [y, m] = key.split('-')
			const yi = parseInt(y, 10)
			const mi = parseInt(m, 10)
			if (!isNaN(yi)) yearSet.add(yi)
			if (!isNaN(mi)) monthSet.add(mi)
		})
		const ys = Array.from(yearSet).sort((a, b) => a - b)
		const ms = Array.from(monthSet).sort((a, b) => a - b)
		return { years: ys, months: ms.length ? ms : [1,2,3,4,5,6,7,8,9,10,11,12] }
	}, [safeData])

	const [selectedYears, setSelectedYears] = useState<number[]>(years)
	const [selectedMonths, setSelectedMonths] = useState<number[]>(months)

	// Historical single-line series (chronological)
	const singleSeries = useMemo(() => {
		if (!safeData || typeof safeData !== 'object' || Object.keys(safeData).length === 0) {
			return []
		}
		let baseData = Object.entries(safeData)
			.map(([key, values]) => {
				if (!values || typeof values !== 'object') {
					return null
				}
				const [y, m] = key.split('-')
				const year = parseInt(y, 10)
				const month = parseInt(m, 10)
				return {
					key,
					label: `${y}-${m.padStart(2, '0')}`,
					year,
					month,
					revenue: values?.revenue || 0,
					bed_nights: values?.bed_nights || 0,
				}
			})
			.filter(d => d !== null && selectedYears.includes(d.year) && selectedMonths.includes(d.month))
			.sort((a, b) => {
				if (a!.year !== b!.year) return a!.year - b!.year
				return a!.month - b!.month
			}) as Array<{key: string, label: string, year: number, month: number, revenue: number, bed_nights: number}>
		
		// Apply YTD or MoM transformation if needed
		if (comparisonMode === 'ytd') {
			// Calculate Year-to-Date cumulative values
			const ytdData: typeof baseData = []
			const yearTotals: Record<number, number> = {}
			
			baseData.forEach((item) => {
				if (!yearTotals[item.year]) yearTotals[item.year] = 0
				yearTotals[item.year] += item[metric]
				ytdData.push({
					...item,
					[metric]: yearTotals[item.year],
				})
			})
			return ytdData
		} else if (comparisonMode === 'mom') {
			// Calculate Month-on-Month change
			const momData: typeof baseData = []
			const prevValues: Record<number, number> = {} // Track previous value by year
			
			baseData.forEach((item) => {
				const prevValue = prevValues[item.year] || 0
				const currentValue = item[metric]
				const change = prevValue > 0 ? currentValue - prevValue : 0
				
				momData.push({
					...item,
					[metric]: change,
				})
				prevValues[item.year] = currentValue
			})
			return momData
		}
		
		return baseData
	}, [safeData, selectedYears, selectedMonths, comparisonMode, metric])

	// YoY comparative: one line per selected year; x-axis months 1..12
	const yoySeries = useMemo(() => {
		if (!safeData || typeof safeData !== 'object' || Object.keys(safeData).length === 0) {
			const base = Array.from({ length: 12 }, (_, i) => ({ month: i + 1 }))
			return base.map(r => {
				const row: any = { month: r.month }
				selectedYears.forEach(y => { row[y] = 0 })
				return row
			})
		}
		const base = Array.from({ length: 12 }, (_, i) => ({ month: i + 1 }))
		const byYear: Record<number, Record<number, { revenue: number; bed_nights: number }>> = {}
		Object.entries(safeData).forEach(([key, values]) => {
			if (!values || typeof values !== 'object') return
			const [y, m] = key.split('-')
			const yi = parseInt(y, 10)
			const mi = parseInt(m, 10)
			if (!byYear[yi]) byYear[yi] = {}
			byYear[yi][mi] = { revenue: values?.revenue || 0, bed_nights: values?.bed_nights || 0 }
		})
		let rows = base
			.filter(r => selectedMonths.includes(r.month))
			.map(r => {
				const row: any = { month: r.month }
				selectedYears.forEach(y => {
					const v = byYear[y]?.[r.month]
					row[y] = v ? v[metric] : 0
				})
				return row
			})
		
		// Apply YTD transformation if needed
		if (comparisonMode === 'ytd') {
			const ytdRows: typeof rows = []
			const yearTotals: Record<number, number> = {}
			
			rows.forEach(row => {
				const newRow: any = { month: row.month }
				selectedYears.forEach(y => {
					if (!yearTotals[y]) yearTotals[y] = 0
					yearTotals[y] += row[y] || 0
					newRow[y] = yearTotals[y]
				})
				ytdRows.push(newRow)
			})
			return ytdRows
		}
		
		return rows
	}, [safeData, selectedYears, selectedMonths, metric, comparisonMode])

	const toggleYear = (y: number) => {
		setSelectedYears(prev => prev.includes(y) ? prev.filter(v => v !== y) : [...prev, y].sort((a,b)=>a-b))
	}
	const toggleMonth = (m: number) => {
		setSelectedMonths(prev => prev.includes(m) ? prev.filter(v => v !== m) : [...prev, m].sort((a,b)=>a-b))
	}

	return (
		<motion.div
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
		>
			<div className="flex items-center justify-between mb-6">
				<div className="flex items-center space-x-2">
					<TrendingUp className="h-5 w-5 text-primary-600" />
					<h2 className="text-xl font-semibold text-gray-900">Revenue Trends</h2>
				</div>
				<div className="flex flex-wrap items-center gap-2">
					<div className="inline-flex rounded-md shadow-sm border border-gray-200 overflow-hidden" role="group">
						<button
							className={`px-3 py-1 text-sm ${mode==='single' ? 'bg-primary-600 text-white' : 'bg-white text-gray-700'}`}
							onClick={() => setMode('single')}
						>Historical</button>
						<button
							className={`px-3 py-1 text-sm border-l border-gray-200 ${mode==='yoy' ? 'bg-primary-600 text-white' : 'bg-white text-gray-700'}`}
							onClick={() => setMode('yoy')}
						>Year-on-Year</button>
					</div>
					<div className="inline-flex rounded-md shadow-sm border border-gray-200 overflow-hidden ml-2" role="group">
						{mode === 'single' ? (
							<>
								<button
									className={`px-3 py-1 text-sm ${comparisonMode==='period' ? 'bg-primary-50 text-primary-700' : 'bg-white text-gray-700'}`}
									onClick={() => setComparisonMode('period')}
								>Period</button>
								<button
									className={`px-3 py-1 text-sm border-l border-gray-200 ${comparisonMode==='ytd' ? 'bg-primary-50 text-primary-700' : 'bg-white text-gray-700'}`}
									onClick={() => setComparisonMode('ytd')}
								>YTD</button>
								<button
									className={`px-3 py-1 text-sm border-l border-gray-200 ${comparisonMode==='mom' ? 'bg-primary-50 text-primary-700' : 'bg-white text-gray-700'}`}
									onClick={() => setComparisonMode('mom')}
								>MoM</button>
							</>
						) : (
							<>
								<button
									className={`px-3 py-1 text-sm ${comparisonMode==='period' ? 'bg-primary-50 text-primary-700' : 'bg-white text-gray-700'}`}
									onClick={() => setComparisonMode('period')}
								>Period</button>
								<button
									className={`px-3 py-1 text-sm border-l border-gray-200 ${comparisonMode==='ytd' ? 'bg-primary-50 text-primary-700' : 'bg-white text-gray-700'}`}
									onClick={() => setComparisonMode('ytd')}
								>YTD</button>
							</>
						)}
					</div>
					<div className="inline-flex rounded-md shadow-sm border border-gray-200 overflow-hidden ml-2" role="group">
						<button
							className={`px-3 py-1 text-sm ${metric==='revenue' ? 'bg-primary-50 text-primary-700' : 'bg-white text-gray-700'}`}
							onClick={() => setMetric('revenue')}
						>Revenue</button>
						<button
							className={`px-3 py-1 text-sm border-l border-gray-200 ${metric==='bed_nights' ? 'bg-primary-50 text-primary-700' : 'bg-white text-gray-700'}`}
							onClick={() => setMetric('bed_nights')}
						>Bed nights</button>
					</div>
					<button
						className="ml-2 px-3 py-1 text-sm rounded border border-gray-300 text-gray-700 hover:bg-gray-50"
						onClick={() => setShowDetails(true)}
					>
						Show details
					</button>
				</div>
			</div>

			{/* Filters */}
			<div className="mb-4 grid grid-cols-1 lg:grid-cols-2 gap-3">
				<div>
					<div className="text-sm font-medium text-gray-700 mb-2">Years</div>
					<div className="flex flex-wrap gap-2">
						{years.map(y => (
							<button
								key={y}
								className={`px-2 py-1 text-xs rounded border ${selectedYears.includes(y) ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-gray-700 border-gray-300'}`}
								onClick={() => toggleYear(y)}
							>{y}</button>
						))}
					</div>
				</div>
				<div>
					<div className="text-sm font-medium text-gray-700 mb-2">Months</div>
					<div className="flex flex-wrap gap-2">
						{[1,2,3,4,5,6,7,8,9,10,11,12].map(m => (
							<button
								key={m}
								className={`px-2 py-1 text-xs rounded border ${selectedMonths.includes(m) ? 'bg-primary-50 text-primary-700 border-primary-200' : 'bg-white text-gray-700 border-gray-300'}`}
								onClick={() => toggleMonth(m)}
							>{new Date(2000, m-1, 1).toLocaleString('en', { month: 'short' })}</button>
						))}
					</div>
				</div>
			</div>

			{mode === 'single' ? (
				<ResponsiveContainer width="100%" height={320}>
					<LineChart data={singleSeries} margin={{ top: 5, right: 30, left: 20, bottom: 40 }}>
						<CartesianGrid strokeDasharray="3 3" />
						<XAxis 
							dataKey="label" 
							tick={{ fill: '#6B7280', fontSize: 11 }}
							angle={-45}
							textAnchor="end"
							height={60}
							interval="preserveStartEnd"
						/>
						<YAxis 
							tick={{ fill: '#6B7280', fontSize: 12 }}
							width={80}
							tickFormatter={(value) => metric === 'revenue' ? `$${(value as number).toLocaleString()}` : `${value}`}
						/>
						<Tooltip 
							contentStyle={{ borderRadius: '8px' }}
							formatter={(value: number) => {
								const formatted = metric === 'revenue' ? `$${value.toLocaleString()}` : value
								if (comparisonMode === 'ytd') {
									return [`${formatted} (YTD)`, metric === 'revenue' ? 'Revenue' : 'Bed nights']
								} else if (comparisonMode === 'mom') {
									return [`${value >= 0 ? '+' : ''}${formatted}`, 'Month-on-Month Change']
								}
								return formatted
							}}
							labelFormatter={(l) => `Month: ${l}`}
						/>
						<Legend />
						<Line 
							type="monotone" 
							dataKey={metric}
							stroke="#0ea5e9" 
							strokeWidth={2}
							dot={{ r: 3 }}
							name={
								comparisonMode === 'ytd' 
									? (metric === 'revenue' ? 'Revenue (YTD)' : 'Bed nights (YTD)')
									: comparisonMode === 'mom'
									? (metric === 'revenue' ? 'Revenue Change (MoM)' : 'Bed nights Change (MoM)')
									: (metric === 'revenue' ? 'Revenue' : 'Bed nights')
							}
						/>
					</LineChart>
				</ResponsiveContainer>
			) : (
				<ResponsiveContainer width="100%" height={320}>
					<LineChart data={yoySeries} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
						<CartesianGrid strokeDasharray="3 3" />
						<XAxis 
							dataKey="month" 
							tick={{ fill: '#6B7280' }}
							style={{ fontSize: '12px' }}
							tickFormatter={(m) => new Date(2000, (m as number)-1, 1).toLocaleString('en', { month: 'short' })}
						/>
						<YAxis 
							tick={{ fill: '#6B7280', fontSize: 12 }}
							width={80}
							tickFormatter={(value) => metric === 'revenue' ? `$${(value as number).toLocaleString()}` : `${value}`}
						/>
						<Tooltip 
							contentStyle={{ borderRadius: '8px' }}
							formatter={(value: number, name: string) => {
								const formatted = metric === 'revenue' ? `$${value.toLocaleString()}` : value
								if (comparisonMode === 'ytd') {
									return [`${formatted} (YTD)`, name]
								}
								return [formatted, name]
							}}
							labelFormatter={(m) => new Date(2000, (m as number)-1, 1).toLocaleString('en', { month: 'long' })}
						/>
						<Legend />
						{selectedYears.map((y, idx) => (
							<Line
								key={y}
								type="monotone"
								dataKey={String(y)}
								stroke={['#0ea5e9','#10b981','#f59e0b','#ef4444','#8b5cf6','#14b8a6'][idx % 6]}
								strokeWidth={2}
								dot={false}
								name={comparisonMode === 'ytd' ? `${y} (YTD)` : String(y)}
							/>
						))}
					</LineChart>
				</ResponsiveContainer>
			)}

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
							{mode === 'single' ? (
							<table className="min-w-full text-sm">
									<thead className="bg-gray-50">
										<tr>
											<th className="text-left px-3 py-2 font-medium text-gray-700">Period</th>
											<th className="text-right px-3 py-2 font-medium text-gray-700">
												{comparisonMode === 'ytd' 
													? (metric === 'revenue' ? 'Revenue (YTD)' : 'Bed nights (YTD)')
													: comparisonMode === 'mom'
													? (metric === 'revenue' ? 'Revenue Change (MoM)' : 'Bed nights Change (MoM)')
													: (metric === 'revenue' ? 'Revenue' : 'Bed nights')
												}
											</th>
										</tr>
									</thead>
									<tbody>
										{singleSeries.map((r) => (
											<tr key={r.key} className="border-t">
												<td className="px-3 py-1.5 text-gray-800">{r.label}</td>
												<td className="px-3 py-1.5 text-right tabular-nums">
													{comparisonMode === 'mom' && (r[metric] >= 0 ? '+' : '')}
													{metric === 'revenue' ? `$${(r[metric]).toLocaleString()}` : r[metric]}
												</td>
											</tr>
										))}
									</tbody>
									{comparisonMode === 'period' && (
									<tfoot>
										<tr className="border-t bg-gray-50">
											<td className="px-3 py-1.5 font-semibold text-gray-900">Total</td>
											<td className="px-3 py-1.5 text-right font-semibold text-gray-900 tabular-nums">
												{metric === 'revenue'
													? '$' + singleSeries.reduce((s, r) => s + (r.revenue || 0), 0).toLocaleString()
													: singleSeries.reduce((s, r) => s + (r.bed_nights || 0), 0)}
											</td>
										</tr>
									</tfoot>
									)}
								</table>
							) : (
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
										{yoySeries.map((row: any) => (
											<tr key={row.month} className="border-t">
												<td className="px-3 py-1.5 text-gray-800">{new Date(2000, row.month-1, 1).toLocaleString('en', { month: 'short' })}</td>
												{selectedYears.map(y => (
													<td key={y} className="px-3 py-1.5 text-right tabular-nums">{metric === 'revenue' ? `$${(row[y] || 0).toLocaleString()}` : (row[y] || 0)}</td>
												))}
											</tr>
										))}
									</tbody>
									<tfoot>
										<tr className="border-t bg-gray-50">
											<td className="px-3 py-1.5 font-semibold text-gray-900">Total</td>
											{selectedYears.map(y => (
												<td key={y} className="px-3 py-1.5 text-right font-semibold text-gray-900 tabular-nums">
													{(() => {
														const total = yoySeries.reduce((s: number, row: any) => s + (row[y] || 0), 0)
														return metric === 'revenue' ? `$${total.toLocaleString()}` : total
													})()}
												</td>
											))}
										</tr>
									</tfoot>
								</table>
							)}
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

