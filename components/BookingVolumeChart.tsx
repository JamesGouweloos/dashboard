'use client'

import { useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { motion } from 'framer-motion'
import { Calendar } from 'lucide-react'

interface RevenueTrends {
	[key: string]: {
		revenue: number
		bookings: number
		bed_nights: number
	}
}

interface BookingVolumeChartProps {
	data: RevenueTrends
}

export default function BookingVolumeChart({ data }: BookingVolumeChartProps) {
	const chartData = useMemo(() => {
		if (!data || typeof data !== 'object') return []

		return Object.entries(data)
			.map(([key, values]) => {
				const [year, month] = key.split('-')
				return {
					period: key,
					label: `${year}-${month}`,
					year: parseInt(year, 10),
					month: parseInt(month, 10),
					bookings: values?.bookings || 0,
					bed_nights: values?.bed_nights || 0,
				}
			})
			.filter(d => !isNaN(d.year) && !isNaN(d.month))
			.sort((a, b) => {
				if (a.year !== b.year) return a.year - b.year
				return a.month - b.month
			})
	}, [data])

	const totalBookings = chartData.reduce((sum, d) => sum + d.bookings, 0)
	const totalBedNights = chartData.reduce((sum, d) => sum + d.bed_nights, 0)

	return (
		<motion.div
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ delay: 0.2 }}
			className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
		>
			<div className="flex items-center space-x-2 mb-6">
				<Calendar className="h-5 w-5 text-primary-600" />
				<h2 className="text-xl font-semibold text-gray-900">Booking Volume Trends</h2>
			</div>

			<div className="grid grid-cols-2 gap-4 mb-6">
				<div className="p-4 bg-gradient-to-r from-primary-50 to-blue-50 rounded-lg">
					<div className="text-sm text-gray-600 mb-1">Total Bookings</div>
					<div className="text-2xl font-bold text-gray-900">{totalBookings.toLocaleString()}</div>
				</div>
				<div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg">
					<div className="text-sm text-gray-600 mb-1">Total Bed Nights</div>
					<div className="text-2xl font-bold text-gray-900">{totalBedNights.toLocaleString()}</div>
				</div>
			</div>

			<ResponsiveContainer width="100%" height={400}>
				<BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 60 }}>
					<CartesianGrid strokeDasharray="3 3" />
					<XAxis 
						dataKey="label" 
						angle={-45}
						textAnchor="end"
						height={80}
						tick={{ fill: '#6B7280', fontSize: 11 }}
					/>
					<YAxis 
						tick={{ fill: '#6B7280', fontSize: 12 }}
					/>
					<Tooltip 
						contentStyle={{ borderRadius: '8px' }}
						formatter={(value: number, name: string) => {
							if (name === 'bookings') return [value.toLocaleString(), 'Bookings']
							if (name === 'bed_nights') return [value.toLocaleString(), 'Bed Nights']
							return [value, name]
						}}
					/>
					<Legend />
					<Bar 
						dataKey="bookings" 
						fill="#3b82f6" 
						name="Bookings"
						radius={[4, 4, 0, 0]}
					/>
					<Bar 
						dataKey="bed_nights" 
						fill="#22c55e" 
						name="Bed Nights"
						radius={[4, 4, 0, 0]}
					/>
				</BarChart>
			</ResponsiveContainer>
		</motion.div>
	)
}

