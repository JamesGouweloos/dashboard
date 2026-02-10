'use client'

import { useState, useEffect, useCallback } from 'react'

type Category = 'Accommodation' | 'Park Fees & Levies' | 'Travel' | 'Activities' | 'Bar' | 'Shop'
type IncomeType = 'Income' | 'Disbursements'

interface RevenueConfig {
  itemToCategory: Record<string, Category>
  categoryToType: Record<Category, IncomeType>
  lastUpdated: string | null
}

export function useRevenueCategorization() {
  const [config, setConfig] = useState<RevenueConfig | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchConfig()
  }, [])

  const fetchConfig = async () => {
    try {
      const response = await fetch('/api/revenue-config', { cache: 'no-store' })
      if (response.ok) {
        const data = await response.json()
        // Ensure default config if data is empty
        if (!data.itemToCategory || Object.keys(data.itemToCategory).length === 0) {
          // Use default mappings
          const defaultItemToCategory: Record<string, Category> = {}
          // Add default mappings here if needed, or leave empty
          setConfig({
            itemToCategory: defaultItemToCategory,
            categoryToType: data.categoryToType || {
              'Accommodation': 'Income',
              'Park Fees & Levies': 'Disbursements',
              'Travel': 'Income',
              'Activities': 'Income',
              'Bar': 'Income',
              'Shop': 'Income'
            },
            lastUpdated: data.lastUpdated || null
          })
        } else {
          setConfig(data)
        }
      } else {
        // Set default config if API fails
        setConfig({
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
        })
      }
    } catch (err) {
      console.error('Error fetching revenue config:', err)
      // Set default config on error
      setConfig({
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
      })
    } finally {
      setLoading(false)
    }
  }

  const calculateCategoryBreakdown = useCallback((bookings: any[]) => {
    if (!config || !bookings || bookings.length === 0) {
      return {
        'Accommodation': 0,
        'Park Fees & Levies': 0,
        'Travel': 0,
        'Activities': 0,
        'Bar': 0,
        'Shop': 0
      }
    }

    const categoryTotals: Record<Category, number> = {
      'Accommodation': 0,
      'Park Fees & Levies': 0,
      'Travel': 0,
      'Activities': 0,
      'Bar': 0,
      'Shop': 0
    }

      bookings.forEach(booking => {
        // Track which fields have already been processed to avoid double-counting
        const processedFields = new Set<string>()
        
        Object.entries(config.itemToCategory).forEach(([item, category]) => {
          // Skip payments and status date columns even if they exist in config
          const lowerItem = item.toLowerCase()
          if (lowerItem.includes('payment') || 
              lowerItem === 'payments' ||
              lowerItem.includes('status cancel date') ||
              lowerItem.includes('status confirm date') ||
              lowerItem.includes('status provisional date') ||
              lowerItem.includes('status quote date')) {
            return
          }
          
          // Try different field name variations to match the booking data structure
          let fieldName: string | null = null
          let value = 0
          
          // Check exact match first
          if (booking[item] !== undefined && booking[item] !== null && booking[item] !== '') {
            fieldName = item
            value = parseFloat(String(booking[item])) || 0
          } else if (booking[item.toLowerCase()] !== undefined && booking[item.toLowerCase()] !== null && booking[item.toLowerCase()] !== '') {
            fieldName = item.toLowerCase()
            value = parseFloat(String(booking[item.toLowerCase()])) || 0
          } else if (booking[item.toUpperCase()] !== undefined && booking[item.toUpperCase()] !== null && booking[item.toUpperCase()] !== '') {
            fieldName = item.toUpperCase()
            value = parseFloat(String(booking[item.toUpperCase()])) || 0
          }
          
          // Only process if we found a value and haven't processed this field yet
          if (fieldName && value !== 0 && !processedFields.has(fieldName)) {
            processedFields.add(fieldName)
            
            // Handle discounts (subtract from total)
            if (item === '10% Discount' || item.includes('Discount')) {
              categoryTotals[category] -= value
            } else {
              categoryTotals[category] += value
            }
          }
        })
      })

    return categoryTotals
  }, [config])

  const getCategoryByType = () => {
    if (!config) return { Income: [], Disbursements: [] }
    
    const incomeCategories: Category[] = []
    const disbursementCategories: Category[] = []

    Object.entries(config.categoryToType).forEach(([category, type]) => {
      if (type === 'Income') {
        incomeCategories.push(category as Category)
      } else {
        disbursementCategories.push(category as Category)
      }
    })

    return { Income: incomeCategories, Disbursements: disbursementCategories }
  }

  return {
    config,
    loading,
    refetch: fetchConfig,
    calculateCategoryBreakdown,
    getCategoryByType
  }
}

