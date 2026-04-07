import { NextResponse } from 'next/server'
import { getAdminDb } from '@/lib/firebase-admin'

export const dynamic = 'force-dynamic'
export const revalidate = 0

type Category = 'Accommodation' | 'Park Fees & Levies' | 'Travel' | 'Activities' | 'Bar' | 'Shop'
type IncomeType = 'Income' | 'Disbursements'

interface RevenueConfig {
  itemToCategory: Record<string, Category>
  categoryToType: Record<Category, IncomeType>
  lastUpdated: string | null
}

const defaultConfig: RevenueConfig = {
  itemToCategory: {},
  categoryToType: {
    'Accommodation': 'Income',
    'Park Fees & Levies': 'Disbursements',
    'Travel': 'Income',
    'Activities': 'Income',
    'Bar': 'Income',
    'Shop': 'Income'
  },
  lastUpdated: null
}

function normalizeConfig(data: any): RevenueConfig {
  if (!data || typeof data !== 'object') {
    return defaultConfig
  }

  const validCategories: Category[] = [
    'Accommodation',
    'Park Fees & Levies',
    'Travel',
    'Activities',
    'Bar',
    'Shop'
  ]
  const validTypes: IncomeType[] = ['Income', 'Disbursements']

  const rawItemMap = data.itemToCategory && typeof data.itemToCategory === 'object'
    ? data.itemToCategory
    : {}

  const itemToCategory: Record<string, Category> = {}
  Object.entries(rawItemMap).forEach(([item, category]) => {
    if (typeof item === 'string' && validCategories.includes(category as Category)) {
      itemToCategory[item] = category as Category
    }
  })

  const categoryToType: Record<Category, IncomeType> = { ...defaultConfig.categoryToType }
  if (data.categoryToType && typeof data.categoryToType === 'object') {
    Object.entries(data.categoryToType).forEach(([category, type]) => {
      if (validCategories.includes(category as Category) && validTypes.includes(type as IncomeType)) {
        categoryToType[category as Category] = type as IncomeType
      }
    })
  }

  return {
    itemToCategory,
    categoryToType,
    lastUpdated: typeof data.lastUpdated === 'string' ? data.lastUpdated : null
  }
}

export async function GET() {
  try {
    const db = getAdminDb()
    const snap = await db.doc('revenue_config/categorization').get()
    
    if (snap.exists) {
      return NextResponse.json(normalizeConfig(snap.data()), {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
      })
    } else {
      return NextResponse.json(defaultConfig, {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
      })
    }
  } catch (error) {
    console.error('Error fetching revenue config:', error)
    // Return defaults instead of failing the UI if backend read is unavailable.
    return NextResponse.json(defaultConfig, {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
    })
  }
}



