'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Settings, Save, RefreshCw } from 'lucide-react'
import { initializeApp, getApps } from 'firebase/app'
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore'

// Complete list of invoiceable items from the dataset (from income_columns + other potential columns)
const DEFAULT_INVOICEABLE_ITEMS = [
  // Accommodation
  'Accommodation',
  'Accommodation at Baine\'s',
  'Baines\' River Camp',
  'Luxury Family Suite',
  'Luxury Double Suite',
  'Early Check-In / Late Check-Out',
  'Dual Property Booking - Baines\' and Matusadona - T',
  
  // Activities
  'Game Drive National Park',
  'Game Drive GMA',
  'Fishing National Park',
  'Fishing National Park full-day 26',
  'Fishing GMA',
  'Boat Cruises GMA',
  'Extra Activity in the GMA',
  'Private guide and vehicle',
  'Private guide and boat',
  
  // Park Fees & Levies
  'Park Fees',
  'Park Levies',
  'National Park Fees',
  'GMA Fees',
  'Fuel',
  
  // Travel (comprehensive list from table)
  'Travel',
  'Transfer',
  'Flight',
  'Airport Departure Tax',
  'Baines - Royal Zambezi',
  'Baines\' - Baine\'s - Gwabi one way (1-4 pax)',
  'Baines\' - Gwabi - Baine\'s one way (1-4 pax)',
  'Baines\' - Lusaka',
  'Chirundu - Marine',
  'Departure Taxes',
  'Empty Leg',
  'Gwabi - Chirundu',
  'Harbour or local hotels to Siavonga Border',
  'International',
  'Jeki - Livingstone',
  'Karib Air - Marine',
  'Karib Air - Marine (3+ pax: Price pp)',
  'Kariba - Lusaka',
  'LUN - LVI',
  'LUN - MFU',
  'LUN - RYL',
  'LVI - LUN',
  'LVI - RYL (2024)',
  'Lusaka - Baines\'',
  'Lusaka - Gwabi',
  'Lusaka - Royal Return',
  'Lusaka to Kariba - 7 pax',
  'Lusaka to Royal',
  'MFU - LUN',
  'MFU - RYL',
  'R: Airport Assistance',
  'R: Departure Tax: Livingstone - Royal',
  'R: Lusaka - Royal 2025',
  'R:Departure Tax: Lusaka - Royal',
  'R:Royal - Lusaka 2025',
  'RYL - LIV (2024)',
  'RYL - LUN',
  'River Transfer',
  'River and Road Transfer Baines\' to Kariba',
  'River and Road transfer Kariba to Gwabi then to B',
  'Royal - Livingstone',
  'ST: Lusaka to Royal (seat rate)',
  'ST: Royal - Lusaka (Seat rate)',
  'ST:Departure Tax: Lusaka - Royal',
  'ST:Lusaka Royal (Min Pax)2025',
  'ST:Royal to Lusaka (Min Pax) 2025',
  
  // Bar
  'Bar: Beer',
  'Bar: Wine',
  'Bar: Red Wine',
  'Bar: White Wine',
  'Bar: Rose House',
  'Bar: Red House',
  'Bar: White House',
  'Bar: Whisky',
  'Bar: Vodka',
  'Bar: Gin',
  'Bar: Rum',
  'Bar: Brandy',
  'Bar: Single Malt',
  'Bar: Champagne / Sparkling',
  'Bar: Cider',
  'Bar: Soft Drinks',
  'Bar: Liqueurs',
  'Bar: Cordials',
  'Bar: Aperitif',
  'Bar: Comp/Kitchen',
  'BAR: ISLAND SUNDOWNERS',
  'BAR: CORKAGE',
  'Drinks Tab',
  
  // Shop
  'Curio Shop',
  'CURIO',
  'Curio: VR Prints',
  'Curio: Short Sleeve',
  'Curio: Long Sleeve',
  'Curio: Jacket',
  'Curio: Head & Waist Wear',
  'Curio: Golfers',
  'Curio: Dress',
  'Curio: Luggage',
  'Shop Purchases',
  'MEN JEWELRY',
  'WOMEN JEWELRY',
  
  // Food & Beverage (these go to Park Fees & Levies based on table)
  'F&B',
  'F & B',
  'Lunch ',
  
  // Fees & Services (these go to Park Fees & Levies based on table)
  'Service Fee',
  'Gratuity',
  'Generator Fees',
  'Booking Fee',
  'Operational',
  'Miscellaneous',
  'COVID TEST - BRC',
  'Barter Agreement',
  'Bank charges',
  'Proflight Booking Fee',
  'Pilot/Guide Matusadona',
  'Pilot/Guide mobile tent',
  
  // Additional items from the table
  'Accommodation Gwabi River Lodge',
  
  // Discounts
  '10% Discount'
]

const CATEGORIES = [
  'Accommodation',
  'Park Fees & Levies',
  'Travel',
  'Activities',
  'Bar',
  'Shop'
] as const

type Category = typeof CATEGORIES[number]
type IncomeType = 'Income' | 'Disbursements'

interface CategorizationConfig {
  itemToCategory: Record<string, Category>
  categoryToType: Record<Category, IncomeType>
  lastUpdated: string
}

export default function RevenueCategorization() {
  const [showConfig, setShowConfig] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [itemToCategory, setItemToCategory] = useState<Record<string, Category>>({})
  const [categoryToType, setCategoryToType] = useState<Record<Category, IncomeType>>({
    'Accommodation': 'Income', // Note: Most accommodation items in table go to Park Fees & Levies
    'Park Fees & Levies': 'Disbursements',
    'Travel': 'Income',
    'Activities': 'Income',
    'Bar': 'Income',
    'Shop': 'Income'
  })
  const [allInvoiceableItems, setAllInvoiceableItems] = useState<string[]>(DEFAULT_INVOICEABLE_ITEMS)

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

  useEffect(() => {
    loadConfig()
    discoverItemsFromData()
  }, [])

  const discoverItemsFromData = async () => {
    try {
      const response = await fetch('/api/data', { cache: 'no-store' })
      if (response.ok) {
        const data = await response.json()
        
        // Get all unique column names from monthly bookings
        const allColumns = new Set<string>(DEFAULT_INVOICEABLE_ITEMS)
        
        if (data.monthly_bookings) {
          Object.values(data.monthly_bookings).forEach((yearData: any) => {
            Object.values(yearData).forEach((monthBookings: unknown) => {
              const bookings = monthBookings as any[]
              if (Array.isArray(bookings)) {
                bookings.forEach((booking: any) => {
                  // Add all keys from booking objects that look like invoiceable items
                  Object.keys(booking).forEach(key => {
                    // Exclude metadata columns and calculated columns
                    const excludeColumns = [
                      'Reservation #', 'Name', 'Status', 'Booking Class', 'Arrival date', 'Departure date',
                      'Bed nights', 'PAX', 'Accommodation', 'Revenue Total', 'Total amount outstanding',
                      'Total amount paid', 'Agent', 'Source', 'Year', 'Month', 'Income', 'Disbursements',
                      'Property', 'Booking Status', 'reservation_number', 'name', 'status', 'booking_class',
                      'arrival_date', 'departure_date', 'bed_nights', 'pax', 'accommodation', 'revenue_total',
                      'outstanding', 'agent', 'source',
                      // Exclude status date columns (these are booking status dates, not revenue items)
                      'Status cancel date', 'Status confirm date', 'Status provisional date', 'Status quote date',
                      'status_cancel_date', 'status_confirm_date', 'status_provisional_date', 'status_quote_date',
                      'Status_Cancel_Date', 'Status_Confirm_Date', 'Status_Provisional_Date', 'Status_Quote_Date',
                      // Exclude payment columns (these are payment transactions, not revenue items)
                      'Payment', 'Payments', 'payment', 'payments', 'Payment Amount', 'payment_amount',
                      'PAYMENT', 'PAYMENTS', 'Payment_Amount', 'Payment_Date', 'payment_date'
                    ]
                    
                    if (!excludeColumns.includes(key) && 
                        key.trim() !== '' && 
                        !key.startsWith('Unnamed') &&
                        !key.includes('Column_')) {
                      allColumns.add(key)
                    }
                  })
                })
              }
            })
          })
        }
        
        // Filter out status date columns and payment columns from the final list
        const filteredItems = Array.from(allColumns).filter(item => {
          const lowerItem = item.toLowerCase()
          return !lowerItem.includes('status cancel date') &&
                 !lowerItem.includes('status confirm date') &&
                 !lowerItem.includes('status provisional date') &&
                 !lowerItem.includes('status quote date') &&
                 !lowerItem.includes('payment') &&
                 lowerItem !== 'payments'
        })
        
        setAllInvoiceableItems(filteredItems.sort())
      }
    } catch (err) {
      console.error('Error discovering items from data:', err)
      // Keep default items if discovery fails
    }
  }

  const loadConfig = async () => {
    setIsLoading(true)
    try {
      const ref = doc(db, 'revenue_config', 'categorization')
      const snap = await getDoc(ref)
      if (snap.exists()) {
        const data = snap.data() as CategorizationConfig
        setItemToCategory(data.itemToCategory || {})
        setCategoryToType(data.categoryToType || categoryToType)
      } else {
        // Initialize with default mappings based on the categorization table
        const defaults: Record<string, Category> = {}
        
        // Define explicit mappings based on the table
        const explicitMappings: Record<string, Category> = {
          // Accommodation items that should be in Park Fees & Levies
          'Accommodation': 'Park Fees & Levies',
          'Accommodation Gwabi River Lodge': 'Park Fees & Levies',
          'Accommodation at Baine\'s': 'Park Fees & Levies',
          'Baines\' River Camp': 'Park Fees & Levies',
          'Luxury Double Suite': 'Park Fees & Levies',
          'Luxury Family Suite': 'Park Fees & Levies',
          'Early Check-In / Late Check-Out': 'Park Fees & Levies',
          'Dual Property Booking - Baines\' and Matusadona - T': 'Park Fees & Levies',
          
          // Fees and operational items in Park Fees & Levies
          '10% Discount': 'Park Fees & Levies',
          'Bank charges': 'Park Fees & Levies',
          'Barter Agreement': 'Park Fees & Levies',
          'Booking Fee': 'Park Fees & Levies',
          'F & B': 'Park Fees & Levies',
          'F&B': 'Park Fees & Levies',
          'Gratuity': 'Park Fees & Levies',
          'Miscellaneous': 'Park Fees & Levies',
          'Operational': 'Park Fees & Levies',
          'Pilot/Guide Matusadona': 'Park Fees & Levies',
          'Pilot/Guide mobile tent': 'Park Fees & Levies',
          'Proflight Booking Fee': 'Park Fees & Levies',
          'Service Fee': 'Park Fees & Levies',
          
          // Travel items
          'Airport Departure Tax': 'Travel',
          'Baines - Royal Zambezi': 'Travel',
          'Baines\' - Baine\'s - Gwabi one way (1-4 pax)': 'Travel',
          'Baines\' - Gwabi - Baine\'s one way (1-4 pax)': 'Travel',
          'Baines\' - Lusaka': 'Travel',
          'Chirundu - Marine': 'Travel',
          'Departure Taxes': 'Travel',
          'Empty Leg': 'Travel',
          'Gwabi - Chirundu': 'Travel',
          'Harbour or local hotels to Siavonga Border': 'Travel',
          'International': 'Travel',
          'Jeki - Livingstone': 'Travel',
          'Karib Air - Marine': 'Travel',
          'Karib Air - Marine (3+ pax: Price pp)': 'Travel',
          'Kariba - Lusaka': 'Travel',
          'LUN - LVI': 'Travel',
          'LUN - MFU': 'Travel',
          'LUN - RYL': 'Travel',
          'LVI - LUN': 'Travel',
          'LVI - RYL (2024)': 'Travel',
          'Lusaka - Baines\'': 'Travel',
          'Lusaka - Gwabi': 'Travel',
          'Lusaka - Royal Return': 'Travel',
          'Lusaka to Kariba - 7 pax': 'Travel',
          'Lusaka to Royal': 'Travel',
          'MFU - LUN': 'Travel',
          'MFU - RYL': 'Travel',
          'R: Airport Assistance': 'Travel',
          'R: Departure Tax: Livingstone - Royal': 'Travel',
          'R: Lusaka - Royal 2025': 'Travel',
          'R:Departure Tax: Lusaka - Royal': 'Travel',
          'R:Royal - Lusaka 2025': 'Travel',
          'RYL - LIV (2024)': 'Travel',
          'RYL - LUN': 'Travel',
          'River Transfer': 'Travel',
          'River and Road Transfer Baines\' to Kariba': 'Travel',
          'River and Road transfer Kariba to Gwabi then to B': 'Travel',
          'Royal - Livingstone': 'Travel',
          'ST: Lusaka to Royal (seat rate)': 'Travel',
          'ST: Royal - Lusaka (Seat rate)': 'Travel',
          'ST:Departure Tax: Lusaka - Royal': 'Travel',
          'ST:Lusaka Royal (Min Pax)2025': 'Travel',
          'ST:Royal to Lusaka (Min Pax) 2025': 'Travel',
          'Transfer': 'Travel',
          'Flight': 'Travel',
          
          // Bar items (keep existing logic)
          'BAR: CORKAGE': 'Bar',
          'BAR: ISLAND SUNDOWNERS': 'Bar',
          'Bar: Aperitif': 'Bar',
          'Bar: Beer': 'Bar',
          'Bar: Brandy': 'Bar',
          'Bar: Champagne / Sparkling': 'Bar',
          'Bar: Cider': 'Bar',
          'Bar: Comp/Kitchen': 'Bar',
          'Bar: Cordials': 'Bar',
          'Bar: Gin': 'Bar',
          'Bar: Liqueurs': 'Bar',
          'Bar: Red House': 'Bar',
          'Bar: Red Wine': 'Bar',
          'Bar: Rose House': 'Bar',
          'Bar: Rum': 'Bar',
          'Bar: Single Malt': 'Bar',
          'Bar: Soft Drinks': 'Bar',
          'Bar: Vodka': 'Bar',
          'Bar: Whisky': 'Bar',
          'Bar: White House': 'Bar',
          'Bar: White Wine': 'Bar',
          'Drinks Tab': 'Bar',
          
          // Activities & Extras
          'Boat Cruises GMA': 'Activities',
          'Extra Activity in the GMA': 'Activities',
          'Fishing GMA': 'Activities',
          'Fishing National Park': 'Activities',
          'Fishing National Park full-day 26': 'Activities',
          'Fuel': 'Activities',
          'Game Drive GMA': 'Activities',
          'Game Drive National Park': 'Activities',
          'Private guide and boat': 'Activities',
          'Private guide and vehicle': 'Activities',
          
          // Shop items
          'CURIO': 'Shop',
          'Curio Shop': 'Shop',
          'Curio: Dress': 'Shop',
          'Curio: Golfers': 'Shop',
          'Curio: Head & Waist Wear': 'Shop',
          'Curio: Jacket': 'Shop',
          'Curio: Long Sleeve': 'Shop',
          'Curio: Luggage': 'Shop',
          'Curio: Short Sleeve': 'Shop',
          'Curio: VR Prints': 'Shop',
          'MEN JEWELRY': 'Shop',
          'POS Misc': 'Shop',
          'Shop Purchases': 'Shop',
          'WOMEN JEWELRY': 'Shop',
          
          // Additional items that might appear in the dataset
          'COVID TEST - BRC': 'Park Fees & Levies',
          'Generator Fees': 'Park Fees & Levies',
          'Lunch ': 'Park Fees & Levies',
        }
        
        // Apply explicit mappings first, then use fallback logic for unmapped items
        allInvoiceableItems.forEach(item => {
          if (explicitMappings[item]) {
            defaults[item] = explicitMappings[item]
          } else {
            // Fallback categorization logic for items not in explicit list
            if (item.includes('Bar:') || item.includes('BAR:')) {
              defaults[item] = 'Bar'
            } else if (item.includes('Curio')) {
              defaults[item] = 'Shop'
            } else if (item.includes('Game Drive') || item.includes('Fishing') || item.includes('Boat') || item.includes('Private guide')) {
              defaults[item] = 'Activities'
            } else if (item.includes('JEWELRY') || item === 'Shop Purchases') {
              defaults[item] = 'Shop'
            } else if (item.includes('Transfer') || item.includes('Flight') || item.includes('Departure') || item.includes('Airport') || item.includes('Lusaka') || item.includes('Royal') || item.includes('Kariba') || item.includes('Livingstone') || item.includes('LVI') || item.includes('LUN') || item.includes('RYL') || item.includes('MFU')) {
              defaults[item] = 'Travel'
            } else if (item.includes('Park') || item.includes('Fee') || item.includes('Levy') || item.includes('Royal pass') || item.includes('SADC') || item.includes('Citizen') || item.includes('Resident')) {
              defaults[item] = 'Park Fees & Levies'
            } else {
              // Default to Park Fees & Levies for accommodation-related or unknown items
              defaults[item] = 'Park Fees & Levies'
            }
          }
        })
        setItemToCategory(defaults)
      }
    } catch (err) {
      console.error('Error loading config:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const saveConfig = async () => {
    setIsSaving(true)
    try {
      const config: CategorizationConfig = {
        itemToCategory,
        categoryToType,
        lastUpdated: new Date().toISOString()
      }
      await setDoc(doc(db, 'revenue_config', 'categorization'), config)
      alert('Configuration saved successfully!')
    } catch (err) {
      console.error('Error saving config:', err)
      alert('Error saving configuration')
    } finally {
      setIsSaving(false)
    }
  }

  const updateItemCategory = (item: string, category: Category) => {
    setItemToCategory(prev => ({ ...prev, [item]: category }))
  }

  const updateCategoryType = (category: Category, type: IncomeType) => {
    setCategoryToType(prev => ({ ...prev, [category]: type }))
  }

  const itemsByCategory = useMemo(() => {
    const grouped: Record<Category, string[]> = {
      'Accommodation': [],
      'Park Fees & Levies': [],
      'Travel': [],
      'Activities': [],
      'Bar': [],
      'Shop': []
    }
    allInvoiceableItems.forEach(item => {
      const category = itemToCategory[item] || 'Accommodation'
      grouped[category].push(item)
    })
    return grouped
  }, [itemToCategory, allInvoiceableItems])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <RefreshCw className="h-5 w-5 animate-spin text-primary-600" />
      </div>
    )
  }

  return (
    <>
      <button
        onClick={() => setShowConfig(true)}
        className="flex items-center space-x-2 px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
      >
        <Settings className="h-4 w-4" />
        <span>Configure Revenue Categories</span>
      </button>

      {showConfig && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30" onClick={() => setShowConfig(false)} />
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-7xl mx-4 max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="text-xl font-semibold text-gray-900">Revenue Categorization Configuration</h3>
              <button className="text-gray-500 hover:text-gray-700" onClick={() => setShowConfig(false)}>✕</button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6">
              {/* Category to Income/Disbursements Mapping */}
              <div className="mb-8">
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Category Classification</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {CATEGORIES.map(category => (
                    <div key={category} className="border rounded-lg p-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">{category}</label>
                      <div className="flex gap-2">
                        <button
                          onClick={() => updateCategoryType(category, 'Income')}
                          className={`flex-1 px-3 py-2 rounded text-sm font-medium transition-colors ${
                            categoryToType[category] === 'Income'
                              ? 'bg-green-600 text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          Income
                        </button>
                        <button
                          onClick={() => updateCategoryType(category, 'Disbursements')}
                          className={`flex-1 px-3 py-2 rounded text-sm font-medium transition-colors ${
                            categoryToType[category] === 'Disbursements'
                              ? 'bg-orange-600 text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          Disbursements
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Items by Category */}
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Invoiceable Items by Category</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {CATEGORIES.map(category => (
                    <div key={category} className="border rounded-lg p-5">
                      <div className="flex items-center justify-between mb-3">
                        <h5 className="font-semibold text-gray-900">{category}</h5>
                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                          {itemsByCategory[category].length} items
                        </span>
                      </div>
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {itemsByCategory[category].map(item => (
                          <div key={item} className="flex items-center justify-between text-sm p-2 bg-gray-50 rounded gap-2">
                            <span className="text-gray-700 flex-1 break-words min-w-0">{item}</span>
                            <select
                              value={itemToCategory[item] || category}
                              onChange={(e) => updateItemCategory(item, e.target.value as Category)}
                              className="ml-2 text-xs border rounded px-2 py-1 bg-white flex-shrink-0"
                            >
                              {CATEGORIES.map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                              ))}
                            </select>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Unassigned Items */}
              {allInvoiceableItems.filter(item => !itemToCategory[item]).length > 0 && (
                <div className="mt-6">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">Unassigned Items</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                    {allInvoiceableItems.filter(item => !itemToCategory[item]).map(item => (
                      <div key={item} className="flex items-center space-x-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
                        <span className="text-sm text-gray-700 flex-1 truncate">{item}</span>
                        <select
                          value=""
                          onChange={(e) => updateItemCategory(item, e.target.value as Category)}
                          className="text-xs border rounded px-2 py-1 bg-white"
                        >
                          <option value="">Assign...</option>
                          {CATEGORIES.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t flex justify-end space-x-3">
              <button
                onClick={() => setShowConfig(false)}
                className="px-4 py-2 rounded border border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={saveConfig}
                disabled={isSaving}
                className="px-4 py-2 rounded bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 flex items-center space-x-2"
              >
                {isSaving ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    <span>Save Configuration</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

