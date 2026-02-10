'use client'

import { useMemo } from 'react'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { motion } from 'framer-motion'
import { DollarSign } from 'lucide-react'

interface DashboardData {
	by_status?: {
		[key: string]: {
			revenue_total?: number
			bed_nights?: number
			count?: number
		}
	}
	[key: string]: any
}

interface RevenueByStatusChartProps {
	data: DashboardData
}

const COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

export default function RevenueByStatusChart({ data }: RevenueByStatusChartProps) {
	const pieData = useMemo(() => {
		if (!data?.by_status) return []

		return Object.entries(data.by_status)
			.map(([status, stats]: [string, any]) => ({
				name: status,
				value: stats?.revenue_total || 0,
				count: stats?.count || 0,
				bed_nights: stats?.bed_nights || 0,
			}))
			.filter(item => item.value > 0)
			.sort((a, b) => b.value - a.value)
	}, [data])

	const barData = useMemo(() => {
		if (!data?.by_status) return []

		return Object.entries(data.by_status)
			.map(([status, stats]: [string, any]) => ({
				status,
				revenue: stats?.revenue_total || 0,
				bookings: stats?.count || 0,
				bed_nights: stats?.bed_nights || 0,
			}))
			.filter(item => item.revenue > 0)
			.sort((a, b) => b.revenue - a.revenue)
	}, [data])

	const totalRevenue = pieData.reduce((sum, d) => sum + d.value, 0)

	return (
		<motion.div
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ delay: 0.3 }}
			className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
		>
			<div className="flex items-center space-x-2 mb-6">
				<DollarSign className="h-5 w-5 text-primary-600" />
				<h2 className="text-xl font-semibold text-gray-900">Revenue by Status</h2>
			</div>

			<div className="mb-4 p-4 bg-gradient-to-r from-primary-50 to-blue-50 rounded-lg">
				<div className="flex items-center justify-between">
					<div className="flex items-center space-x-2">
						<DollarSign className="h-5 w-5 text-primary-600" />
						<span className="text-sm text-gray-600">Total Revenue</span>
					</div>
					<span className="text-2xl font-bold text-gray-900">
						${totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
					</span>
				</div>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				{/* Pie Chart */}
				<div>
					<h3 className="text-sm font-medium text-gray-700 mb-4 text-center">Revenue Distribution</h3>
					<ResponsiveContainer width="100%" height={300}>
						<PieChart>
							<Pie
								data={pieData}
								cx="50%"
								cy="50%"
								labelLine={false}
								label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
								outerRadius={100}
								fill="#8884d8"
								dataKey="value"
							>
								{pieData.map((entry, index) => (
									<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
								))}
							</Pie>
							<Tooltip 
								formatter={(value: number) => `$${value.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
							/>
						</PieChart>
					</ResponsiveContainer>
				</div>

				{/* Bar Chart */}
				<div>
					<h3 className="text-sm font-medium text-gray-700 mb-4 text-center">Revenue by Status</h3>
					<ResponsiveContainer width="100%" height={300}>
						<BarChart data={barData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
							<CartesianGrid strokeDasharray="3 3" />
							<XAxis 
								dataKey="status" 
								tick={{ fill: '#6B7280', fontSize: 11 }}
								angle={-45}
								textAnchor="end"
								height={60}
							/>
							<YAxis 
								tick={{ fill: '#6B7280', fontSize: 12 }}
								tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
							/>
							<Tooltip 
								contentStyle={{ borderRadius: '8px' }}
								formatter={(value: number, name: string) => {
									if (name === 'revenue') return [`$${value.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 'Revenue']
									if (name === 'bookings') return [value.toLocaleString(), 'Bookings']
									if (name === 'bed_nights') return [value.toLocaleString(), 'Bed Nights']
									return [value, name]
								}}
							/>
							<Legend />
							<Bar 
								dataKey="revenue" 
								fill="#3b82f6" 
								name="Revenue"
								radius={[4, 4, 0, 0]}
							/>
						</BarChart>
					</ResponsiveContainer>
				</div>
			</div>
		</motion.div>
	)
}

