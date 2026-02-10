'use client'

import { useEffect, useMemo, useState } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { motion } from 'framer-motion'
import { Flag } from 'lucide-react'
import { initializeApp, getApps } from 'firebase/app'
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore'

type RevenueTrends = {
	[key: string]: { revenue: number; bed_nights: number; bookings: number }
}

export default function TargetVsActualChart({ data }: { data: { revenue_trends: RevenueTrends } }) {
	const trends = data?.revenue_trends || {}

	// Debug: Log data received
	useEffect(() => {
		if (Object.keys(trends).length > 0) {
			const year2026Keys = Object.keys(trends).filter(k => k.startsWith('2026'))
			console.log('TargetVsActual: Received trends data, 2026 keys:', year2026Keys.length, year2026Keys.slice(0, 5))
			if (year2026Keys.length > 0) {
				console.log('TargetVsActual: Sample 2026 data:', year2026Keys.slice(0, 3).map(k => ({ key: k, value: trends[k] })))
			}
		} else {
			console.log('TargetVsActual: No trends data received', { data, trends })
		}
	}, [trends, data])

	// Firebase initialization
	const firebaseConfig = {
		apiKey: "AIzaSyD70vqTEpkDoxHrA1b0C3uJhESLti8k0uI",
		authDomain: "dashboard-baines.firebaseapp.com",
		projectId: "dashboard-baines",
		storageBucket: "dashboard-baines.firebasestorage.app",
		messagingSenderId: "490088692843",
		appId: "1:490088692843:web:87523298f218fa3570c52e"
	}
	const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig)
	const db = getFirestore(app)

	// Ensure trends is always an object
	const safeTrends = useMemo(() => {
		if (!trends || typeof trends !== 'object') {
			return {}
		}
		return trends
	}, [trends])

	// Extract years present in data
	const availableYears = useMemo(() => {
		if (!safeTrends || typeof safeTrends !== 'object' || Object.keys(safeTrends).length === 0) {
			return []
		}
		const ys = new Set<number>()
		Object.keys(safeTrends).forEach(k => {
			const [y] = k.split('-')
			const yi = parseInt(y, 10)
			if (!isNaN(yi)) ys.add(yi)
		})
		return Array.from(ys).sort((a,b)=>a-b)
	}, [safeTrends])

	const [year, setYear] = useState<number>(availableYears.includes(2025) ? 2025 : (availableYears[availableYears.length-1] || new Date().getFullYear()))
	const [metric, setMetric] = useState<'revenue' | 'bed_nights'>('revenue')
	const [comparisonMode, setComparisonMode] = useState<'period' | 'ytd'>('period')
	const [annualTarget, setAnnualTarget] = useState<number>(0)
	const [monthlyTargets, setMonthlyTargets] = useState<Record<number, number>>({})
	const [showAllocator, setShowAllocator] = useState(false)
	const [isLoading, setIsLoading] = useState(true)

	// Load saved targets from Firestore when year or metric changes
	useEffect(() => {
		setIsLoading(true)
		let active = true
		;(async () => {
			try {
				const ref = doc(db, 'targets', `${year}_${metric}`)
				const snap = await getDoc(ref)
				if (!active) return
				if (snap.exists()) {
					const v: any = snap.data() || {}
					if (active) {
						setAnnualTarget(typeof v.annualTarget === 'number' ? v.annualTarget : 0)
						setMonthlyTargets(v.monthlyTargets || {})
						setIsLoading(false)
					}
				} else {
					if (active) {
						setAnnualTarget(0)
						setMonthlyTargets({})
						setIsLoading(false)
					}
				}
			} catch (err) {
				console.error('Error loading targets:', err)
				if (active) {
					setAnnualTarget(0)
					setMonthlyTargets({})
					setIsLoading(false)
				}
			}
		})()
		return () => { active = false }
	}, [db, year, metric])

	// Save function (defined early for use in useEffect)
	const saveTargets = async () => {
		try {
			await setDoc(doc(db, 'targets', `${year}_${metric}`), {
				year,
				metric,
				annualTarget,
				monthlyTargets,
				updatedAt: new Date().toISOString()
			}, { merge: true })
			console.log('Targets saved successfully')
		} catch (err) {
			console.error('Error saving targets:', err)
		}
	}

	// Auto-save when targets change (but not while loading)
	useEffect(() => {
		if (!isLoading && (annualTarget > 0 || Object.keys(monthlyTargets).length > 0)) {
			const timer = setTimeout(() => {
				saveTargets()
			}, 1000) // Debounce: save 1 second after last change
			return () => clearTimeout(timer)
		}
	}, [annualTarget, monthlyTargets, isLoading, year, metric, db])

	// Build monthly actuals for selected year
	const monthlyActuals = useMemo(() => {
		if (!safeTrends || typeof safeTrends !== 'object') {
			console.warn('TargetVsActual: safeTrends is empty or invalid', safeTrends)
			return {}
		}
		const out: Record<number, number> = {}
		let found2026Data = false
		let processedCount = 0
		let matchedCount = 0
		
		Object.entries(safeTrends).forEach(([k,v]) => {
			if (!v || typeof v !== 'object') return
			processedCount++
			const [y,m] = k.split('-')
			const yi = parseInt(y,10)
			const mi = parseInt(m,10)
			
			if (isNaN(yi) || isNaN(mi)) {
				console.warn('TargetVsActual: Invalid key format:', k, { y, m, yi, mi })
				return
			}
			
			if (yi === year) {
				matchedCount++
				const value = metric === 'revenue' ? (v?.revenue || 0) : (v?.bed_nights || 0)
				out[mi] = (out[mi] || 0) + value
				if (year === 2026 && value > 0) {
					found2026Data = true
					console.log(`TargetVsActual: Found 2026 data for month ${mi}:`, { key: k, value, metric, revenue: v?.revenue, bed_nights: v?.bed_nights })
				}
			}
		})
		
		if (year === 2026) {
			console.log('TargetVsActual: ===== 2026 DATA EXTRACTION =====')
			console.log('TargetVsActual: Selected year:', year)
			console.log('TargetVsActual: Total entries processed:', processedCount)
			console.log('TargetVsActual: Entries matching year 2026:', matchedCount)
			console.log('TargetVsActual: 2026 monthlyActuals result:', out)
			console.log('TargetVsActual: Found 2026 data with values > 0:', found2026Data)
			const year2026Keys = Object.keys(safeTrends).filter(k => k.startsWith('2026'))
			console.log('TargetVsActual: Total 2026 keys in safeTrends:', year2026Keys.length)
			console.log('TargetVsActual: Sample 2026 keys:', year2026Keys.slice(0, 10))
			if (year2026Keys.length > 0) {
				console.log('TargetVsActual: Sample 2026 data:', year2026Keys.slice(0, 5).map(k => ({ key: k, data: safeTrends[k] })))
			}
			console.log('TargetVsActual: =================================')
		}
		return out
	}, [safeTrends, year, metric])

	// Compute distribution weights from historical years (2022-2025 only): average monthly share per year, then across those years
	const distributionWeights = useMemo(() => {
		if (!safeTrends || typeof safeTrends !== 'object') {
			return {}
		}
		const yearToMonthShare: Record<number, Record<number, number>> = {}
		// Aggregate per year totals and per month
		const yearTotals: Record<number, number> = {}
		Object.entries(safeTrends).forEach(([k,v]) => {
			if (!v || typeof v !== 'object') return
			const [y,m] = k.split('-')
			const yi = parseInt(y,10)
			const mi = parseInt(m,10)
			// Consider only 2022-2025 for distribution ratios
			if (yi >= 2022 && yi <= 2025) {
				const value = metric === 'revenue' ? (v?.revenue || 0) : (v?.bed_nights || 0)
				yearTotals[yi] = (yearTotals[yi] || 0) + value
				if (!yearToMonthShare[yi]) yearToMonthShare[yi] = {}
				yearToMonthShare[yi][mi] = (yearToMonthShare[yi][mi] || 0) + value
			}
		})
		// Convert to shares per year
		Object.keys(yearToMonthShare).forEach(yStr => {
			const yi = parseInt(yStr,10)
			const total = yearTotals[yi] || 1
			for (let m=1;m<=12;m++) {
				const val = yearToMonthShare[yi][m] || 0
				yearToMonthShare[yi][m] = total > 0 ? val / total : 0
			}
		})
		// Average share across 2022-2025
		const months: Record<number, number> = {}
		for (let m=1;m<=12;m++) {
			let sum = 0
			let cnt = 0
			;[2022, 2023, 2024, 2025].forEach(yi => {
				if (yearToMonthShare[yi] && typeof yearToMonthShare[yi][m] === 'number') {
					sum += yearToMonthShare[yi][m]
					cnt += 1
				}
			})
			months[m] = cnt > 0 ? (sum / cnt) : (1/12)
		}
		// Normalize to 1
		const totalW = Object.values(months).reduce((s,v)=>s+v,0) || 1
		for (let m=1;m<=12;m++) months[m] = months[m] / totalW
		return months
	}, [safeTrends, metric])

	// Lines
	const planDistributed = useMemo(() => {
		const rows: any[] = []
		let cumulative = 0
		for (let m=1;m<=12;m++) {
			const monthly = Math.round((annualTarget || 0) * (distributionWeights[m] || 0))
			if (comparisonMode === 'ytd') {
				cumulative += monthly
				rows.push({ month: m, planDist: cumulative })
			} else {
				rows.push({ month: m, planDist: monthly })
			}
		}
		return rows
	}, [annualTarget, distributionWeights, comparisonMode])

	const planMonthly = useMemo(() => {
		const rows: any[] = []
		let cumulative = 0
		for (let m=1;m<=12;m++) {
			const monthly = monthlyTargets[m] || 0
			if (comparisonMode === 'ytd') {
				cumulative += monthly
				rows.push({ month: m, planMonth: cumulative })
			} else {
				rows.push({ month: m, planMonth: monthly })
			}
		}
		return rows
	}, [monthlyTargets, comparisonMode])

	const actualYTD = useMemo(() => {
		const rows: any[] = []
		const now = new Date()
		const currentYear = now.getFullYear()
		const currentMonth = now.getMonth() + 1
		
		// Determine which months to show actual data for
		// For any year (past, current, or future), show all 12 months
		// The data itself will be 0 for months without data
		const limitMonth = 12
		
		let cumulative = 0
		for (let m=1;m<=12;m++) {
			// Show actual data for all months - if data exists, use it; otherwise 0
			const monthly = monthlyActuals[m] || 0
			if (comparisonMode === 'ytd') {
				cumulative += monthly
				rows.push({ month: m, actual: cumulative })
			} else {
				rows.push({ month: m, actual: monthly })
			}
		}
		
		// Debug logging for 2026
		if (year === 2026) {
			console.log('TargetVsActual: ===== 2026 actualYTD CALCULATION =====')
			console.log('TargetVsActual: Current year:', currentYear, 'Current month:', currentMonth)
			console.log('TargetVsActual: Selected year:', year)
			console.log('TargetVsActual: Limit month:', limitMonth)
			console.log('TargetVsActual: monthlyActuals input:', monthlyActuals)
			console.log('TargetVsActual: comparisonMode:', comparisonMode)
			console.log('TargetVsActual: actualYTD rows output:', rows)
			console.log('TargetVsActual: Sample rows (first 3):', rows.slice(0, 3))
			console.log('TargetVsActual: =======================================')
		}
		
		return rows
	}, [monthlyActuals, year, comparisonMode])

	// Merge rows for chart
	const chartRows = useMemo(() => {
		const out: Record<number, any> = {}
		for (let m=1;m<=12;m++) out[m] = { month: m }
		planDistributed.forEach(r => { out[r.month].planDist = r.planDist })
		planMonthly.forEach(r => { out[r.month].planMonth = r.planMonth })
		actualYTD.forEach(r => { out[r.month].actual = r.actual })
		const result = Object.values(out).filter(r => typeof r.month === 'number')
		
		// Debug logging for 2026
		if (year === 2026) {
			console.log('TargetVsActual: ===== 2026 CHART ROWS =====')
			console.log('TargetVsActual: Final chartRows:', result)
			console.log('TargetVsActual: Sample rows with actual values:', result.filter(r => r.actual > 0).slice(0, 5))
			console.log('TargetVsActual: All actual values:', result.map(r => ({ month: r.month, actual: r.actual })))
			console.log('TargetVsActual: ===========================')
		}
		
		return result
	}, [planDistributed, planMonthly, actualYTD, year])

	const openAllocator = () => setShowAllocator(true)
	const closeAllocator = async () => {
		await saveTargets()
		setShowAllocator(false)
	}

	const autoAllocateFromAnnual = () => {
		// Distribute annualTarget according to distributionWeights
		const next: Record<number, number> = {}
		for (let m=1;m<=12;m++) {
			next[m] = Math.round((annualTarget || 0) * (distributionWeights[m] || 0))
		}
		setMonthlyTargets(next)
	}

	return (
		<motion.div
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
		>
			<div className="flex items-center justify-between mb-6">
				<div className="flex items-center space-x-2">
					<Flag className="h-5 w-5 text-primary-600" />
					<h2 className="text-xl font-semibold text-gray-900">Target vs Actual</h2>
				</div>
				<div className="flex items-center gap-2">
					<div className="inline-flex rounded-md shadow-sm border border-gray-200 overflow-hidden" role="group">
						<button className={`px-3 py-1 text-sm ${year===2025?'bg-primary-600 text-white':'bg-white text-gray-700'}`} onClick={()=>setYear(2025)}>2025</button>
						<button className={`px-3 py-1 text-sm border-l border-gray-200 ${year===2026?'bg-primary-600 text-white':'bg-white text-gray-700'}`} onClick={()=>setYear(2026)}>2026</button>
					</div>
					<div className="inline-flex rounded-md shadow-sm border border-gray-200 overflow-hidden ml-2" role="group">
						<button
							className={`px-3 py-1 text-sm ${comparisonMode==='period' ? 'bg-primary-50 text-primary-700' : 'bg-white text-gray-700'}`}
							onClick={() => setComparisonMode('period')}
						>Period</button>
						<button
							className={`px-3 py-1 text-sm border-l border-gray-200 ${comparisonMode==='ytd' ? 'bg-primary-50 text-primary-700' : 'bg-white text-gray-700'}`}
							onClick={() => setComparisonMode('ytd')}
						>YTD</button>
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
					<button className="px-3 py-1 text-sm rounded border border-gray-300 text-gray-700 hover:bg-gray-50 ml-2" onClick={openAllocator}>Allocate targets</button>
				</div>
			</div>

			<ResponsiveContainer width="100%" height={320}>
				<LineChart data={chartRows} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
					<CartesianGrid strokeDasharray="3 3" />
					<XAxis dataKey="month" tick={{ fill: '#6B7280' }} style={{ fontSize: '12px' }} tickFormatter={(m)=> new Date(2000,(m as number)-1,1).toLocaleString('en',{month:'short'})} />
					<YAxis 
						tick={{ fill: '#6B7280', fontSize: 12 }} 
						width={80}
						tickFormatter={(v) => metric === 'revenue' ? `$${(v as number).toLocaleString()}` : `${v}`} 
					/>
					<Tooltip 
						contentStyle={{ borderRadius: '8px' }} 
						formatter={(v:number, n:string) => {
							const formatted = metric === 'revenue' ? `$${v.toLocaleString()}` : v.toLocaleString()
							if (comparisonMode === 'ytd') {
								return [`${formatted} (YTD)`, n]
							}
							return [formatted, n]
						}} 
						labelFormatter={(m)=> new Date(2000,(m as number)-1,1).toLocaleString('en',{month:'long'})} 
					/>
					<Legend />
					<Line 
						type="monotone" 
						dataKey="planDist" 
						stroke="#8b5cf6" 
						strokeWidth={2} 
						dot={false} 
						name={comparisonMode === 'ytd' ? "Plan (annual distribution, YTD)" : "Plan (annual distribution)"} 
					/>
					<Line 
						type="monotone" 
						dataKey="planMonth" 
						stroke="#f59e0b" 
						strokeWidth={2} 
						dot={false} 
						name={comparisonMode === 'ytd' ? "Plan (monthly, YTD)" : "Plan (monthly)"} 
					/>
					<Line 
						type="monotone" 
						dataKey="actual" 
						stroke="#10b981" 
						strokeWidth={2} 
						dot={{ r: 2 }} 
						name={comparisonMode === 'ytd' ? "Actual (YTD)" : "Actual"} 
					/>
				</LineChart>
			</ResponsiveContainer>

			{showAllocator && (
				<div className="fixed inset-0 z-50 flex items-center justify-center">
					<div className="absolute inset-0 bg-black/30" onClick={closeAllocator} />
					<div className="relative bg-white rounded-lg shadow-xl w-full max-w-3xl mx-4">
						<div className="flex items-center justify-between px-4 py-3 border-b">
							<h3 className="text-lg font-semibold text-gray-900">Allocate targets</h3>
							<button className="text-gray-500 hover:text-gray-700" onClick={closeAllocator}>✕</button>
						</div>
						<div className="p-4 space-y-4">
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">Annual target ({year}) - {metric === 'revenue' ? 'Revenue' : 'Bed nights'}</label>
								<input
									type="number"
									value={annualTarget}
									onChange={(e)=> setAnnualTarget(parseFloat(e.target.value || '0'))}
									className="w-full border rounded px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary-200"
								/>
								<div className="mt-2">
									<button className="px-3 py-1.5 text-sm rounded border border-gray-300 text-gray-700 hover:bg-gray-50" onClick={autoAllocateFromAnnual}>Auto-allocate by historical distribution</button>
								</div>
							</div>

							<div>
								<div className="text-sm font-medium text-gray-700 mb-2">Monthly targets</div>
								<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
									{Array.from({length:12},(_,i)=>i+1).map(m => (
										<div key={m} className="flex items-center">
											<label className="w-16 text-sm text-gray-600">{new Date(2000,m-1,1).toLocaleString('en',{month:'short'})}</label>
											<input
												type="number"
												value={monthlyTargets[m] || 0}
												onChange={(e)=> setMonthlyTargets(prev => ({ ...prev, [m]: parseFloat(e.target.value || '0') }))}
												className="flex-1 border rounded px-2 py-1 ml-2 focus:outline-none focus:ring-2 focus:ring-primary-200"
											/>
										</div>
									))}
								</div>
							</div>
						</div>
						<div className="px-4 py-3 border-t flex justify-end">
							<button className="px-3 py-1.5 text-sm rounded bg-primary-600 text-white hover:bg-primary-700" onClick={closeAllocator}>Done</button>
						</div>
					</div>
				</div>
			)}
		</motion.div>
	)
}


