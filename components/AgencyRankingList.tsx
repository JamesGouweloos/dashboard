'use client'

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { Building2, Users } from 'lucide-react'

type AgencyType = 'Agent' | 'Direct'

interface AgencyRankingListProps {
	data: any
	selectedYears: number[]
	availableYears: number[]
	metric: 'revenue' | 'bed_nights'
	viewMode: 'Agent' | 'Direct'
	agencyConfig: { agentToType: Record<string, AgencyType> } | null
	statusFilter: string
	classFilter: string
}

interface AgencyRank {
	agent: string
	revenue: number
	bed_nights: number
	bookings: number
	rank: number
	yearlyData: Record<number, { revenue: number; bed_nights: number; bookings: number }>
}

export default function AgencyRankingList({ data, selectedYears, availableYears, metric, viewMode, agencyConfig, statusFilter, classFilter }: AgencyRankingListProps) {
	// Process agency data with performance over time
	const rankedAgencies = useMemo(() => {
		if (!data || !data.monthly_bookings) return []

		let agencies: Record<string, AgencyRank> = {}
		const yearsToUse = selectedYears.length > 0 ? selectedYears : availableYears

		// Helper function to get agency type (defaults to 'Agent')
		const getAgentType = (agent: string): AgencyType => {
			if (!agencyConfig || !agencyConfig.agentToType) return 'Agent'
			return agencyConfig.agentToType[agent] || 'Agent'
		}

		// Process all years to get yearly breakdown
		Object.entries(data.monthly_bookings).forEach(([yearStr, yearData]: [string, any]) => {
			const year = parseInt(yearStr)
			if (isNaN(year)) return

			if (yearData && typeof yearData === 'object') {
				Object.values(yearData).forEach((monthBookings: any) => {
					if (!Array.isArray(monthBookings)) return
					monthBookings.forEach((booking: any) => {
						// Apply status filter
						if (statusFilter !== 'All') {
							const status = booking.Status || booking.status || booking['Booking Status']
							if (status !== statusFilter) return
						}

						// Apply class filter
						if (classFilter !== 'All') {
							const bookingClass = booking['Booking Class'] || booking.booking_class || booking.Booking_Class
							if (bookingClass !== classFilter) return
						}

						const agent = booking.Agent || booking.agent || 'Unknown'
						if (agent === 'Unknown') return // Skip unknown agents
						
						// Filter by view mode (Agent or Direct)
						const agentType = getAgentType(agent)
						if (agentType !== viewMode) return
						
						if (!agencies[agent]) {
							agencies[agent] = {
								agent,
								revenue: 0,
								bed_nights: 0,
								bookings: 0,
								rank: 0,
								yearlyData: {}
							}
						}
						if (!agencies[agent].yearlyData[year]) {
							agencies[agent].yearlyData[year] = {
								revenue: 0,
								bed_nights: 0,
								bookings: 0
							}
						}
						
						const revenue = parseFloat(booking['Revenue Total'] || booking.revenue_total || 0) || 0
						const bedNights = parseFloat(booking['Bed nights'] || booking.bed_nights || 0) || 0
						
						agencies[agent].yearlyData[year].revenue += revenue
						agencies[agent].yearlyData[year].bed_nights += bedNights
						agencies[agent].yearlyData[year].bookings += 1
						
						// Only add to totals if year is selected
						if (yearsToUse.includes(year)) {
							agencies[agent].revenue += revenue
							agencies[agent].bed_nights += bedNights
							agencies[agent].bookings += 1
						}
					})
				})
			}
		})

		// Convert to array and sort by selected metric
		const ranked = Object.values(agencies)
			.sort((a, b) => {
				const valueA = metric === 'revenue' ? a.revenue : a.bed_nights
				const valueB = metric === 'revenue' ? b.revenue : b.bed_nights
				return valueB - valueA
			})
			.map((agency, index) => ({
				...agency,
				rank: index + 1
			}))

		return ranked
	}, [data, selectedYears, availableYears, metric, viewMode, agencyConfig, statusFilter, classFilter])


	return (
		<motion.div
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ delay: 0.1 }}
			className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
		>
		<div className="flex items-center justify-between mb-6">
			<div className="flex items-center space-x-2">
				<Building2 className="h-5 w-5 text-primary-600" />
				<h2 className="text-xl font-semibold text-gray-900">Agency Rankings</h2>
			</div>
		</div>

			{/* Scrollable Ranking List */}
			<div className="border border-gray-200 rounded-lg overflow-hidden">
				<div className="max-h-[600px] overflow-y-auto">
					<table className="w-full">
						<thead className="bg-gray-50 sticky top-0 z-10">
							<tr>
								<th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider w-16">
									Rank
								</th>
								<th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
									Agency
								</th>
								<th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
									Total {metric === 'revenue' ? 'Revenue' : 'Bed Nights'}
								</th>
								<th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
									Bookings
								</th>
								<th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
									{metric === 'revenue' ? 'Avg/Booking' : 'Avg/Night'}
								</th>
								{/* Performance over time columns */}
								{availableYears.sort((a, b) => a - b).map(year => (
									<th key={year} className="px-3 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
										{year}
									</th>
								))}
							</tr>
						</thead>
						<tbody className="bg-white divide-y divide-gray-200">
							{rankedAgencies.length === 0 ? (
								<tr>
									<td colSpan={5 + availableYears.length} className="px-4 py-8 text-center text-gray-500">
										No agency data available
									</td>
								</tr>
							) : (
								rankedAgencies.map((agency, index) => {
									const value = metric === 'revenue' ? agency.revenue : agency.bed_nights
									const avgValue = agency.bookings > 0
										? metric === 'revenue'
											? agency.revenue / agency.bookings
											: agency.bed_nights / agency.bookings
										: 0

									return (
										<tr
											key={agency.agent}
											className={`hover:bg-gray-50 transition-colors ${
												index < 3 ? 'bg-gradient-to-r from-yellow-50 to-transparent' : ''
											}`}
										>
											<td className="px-4 py-3 whitespace-nowrap">
												<div className="flex items-center">
													{index < 3 && (
														<span className="mr-2">
															{index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
														</span>
													)}
													<span className="text-sm font-semibold text-gray-900">
														#{agency.rank}
													</span>
												</div>
											</td>
											<td className="px-4 py-3">
												<div className="text-sm font-medium text-gray-900">
													{agency.agent || 'Unknown'}
												</div>
											</td>
											<td className="px-4 py-3 whitespace-nowrap text-right">
												<span className="text-sm font-semibold text-gray-900">
													{metric === 'revenue'
														? `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
														: value.toLocaleString('en-US')}
												</span>
											</td>
											<td className="px-4 py-3 whitespace-nowrap text-right">
												<div className="flex items-center justify-end space-x-1">
													<Users className="h-4 w-4 text-gray-400" />
													<span className="text-sm text-gray-700">{agency.bookings}</span>
												</div>
											</td>
											<td className="px-4 py-3 whitespace-nowrap text-right">
												<span className="text-sm text-gray-600">
													{metric === 'revenue'
														? `$${avgValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
														: avgValue.toFixed(1)}
												</span>
											</td>
											{/* Performance over time columns */}
											{availableYears.sort((a, b) => a - b).map(year => {
												const yearData = agency.yearlyData[year] || { revenue: 0, bed_nights: 0, bookings: 0 }
												const yearValue = metric === 'revenue' ? yearData.revenue : yearData.bed_nights
												const isYearSelected = selectedYears.length === 0 || selectedYears.includes(year)
												return (
													<td key={year} className={`px-3 py-3 whitespace-nowrap text-right ${isYearSelected ? 'text-gray-900 font-medium' : 'text-gray-400'}`}>
														<span className="text-xs">
															{metric === 'revenue'
																? `$${yearValue.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
																: yearValue.toLocaleString('en-US')}
														</span>
													</td>
												)
											})}
										</tr>
									)
								})
							)}
						</tbody>
					</table>
				</div>
			</div>

			{rankedAgencies.length > 0 && (
				<div className="mt-4 flex items-center justify-between text-xs text-gray-500">
					<span>Showing {rankedAgencies.length} agencies</span>
					<span>
						Total: {metric === 'revenue' ? (
							`$${rankedAgencies.reduce((sum, a) => sum + a.revenue, 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`
						) : (
							rankedAgencies.reduce((sum, a) => sum + a.bed_nights, 0).toLocaleString('en-US')
						)}
					</span>
				</div>
			)}
		</motion.div>
	)
}

