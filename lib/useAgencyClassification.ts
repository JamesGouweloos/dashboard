'use client'

import { useState, useEffect, useCallback } from 'react'

type AgencyType = 'Agent' | 'Direct'

interface AgencyConfig {
  agentToType: Record<string, AgencyType>
  lastUpdated: string | null
}

export function useAgencyClassification() {
  const [config, setConfig] = useState<AgencyConfig | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchConfig()
  }, [])

  const fetchConfig = async () => {
    try {
      const response = await fetch('/api/agency-config', { cache: 'no-store' })
      if (response.ok) {
        const data = await response.json()
        setConfig({
          agentToType: data.agentToType || {},
          lastUpdated: data.lastUpdated || null
        })
      } else {
        // Set default config if API fails
        setConfig({
          agentToType: {},
          lastUpdated: null
        })
      }
    } catch (err) {
      console.error('Error fetching agency config:', err)
      // Set default config on error
      setConfig({
        agentToType: {},
        lastUpdated: null
      })
    } finally {
      setLoading(false)
    }
  }

  const getAgentType = useCallback((agent: string): AgencyType => {
    if (!config) return 'Agent' // Default to Agent
    return config.agentToType[agent] || 'Agent'
  }, [config])

  return {
    config,
    loading,
    refetch: fetchConfig,
    getAgentType
  }
}

