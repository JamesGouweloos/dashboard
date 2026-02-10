'use client'

import { useState, useEffect, useMemo } from 'react'
import { Building2, Save, X } from 'lucide-react'
import { initializeApp, getApps } from 'firebase/app'
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore'

type AgencyType = 'Agent' | 'Direct'

interface AgencyClassificationConfig {
  agentToType: Record<string, AgencyType>
  lastUpdated: string
}

interface AgencyClassificationProps {
  allAgencies: string[]
  onConfigChange?: () => void
}

export default function AgencyClassification({ allAgencies, onConfigChange }: AgencyClassificationProps) {
  const [showConfig, setShowConfig] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [agentToType, setAgentToType] = useState<Record<string, AgencyType>>({})

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
    if (showConfig) {
      loadConfig()
    }
  }, [showConfig, allAgencies])

  const loadConfig = async () => {
    setIsLoading(true)
    try {
      const ref = doc(db, 'agency_config', 'classification')
      const snap = await getDoc(ref)
      
      let loadedConfig: Record<string, AgencyType> = {}
      
      if (snap.exists()) {
        const data = snap.data() as AgencyClassificationConfig
        loadedConfig = data.agentToType || {}
      }
      
      // Ensure all current agencies have a classification (default to 'Agent')
      const mergedConfig: Record<string, AgencyType> = { ...loadedConfig }
      allAgencies.forEach(agent => {
        if (!mergedConfig[agent]) {
          mergedConfig[agent] = 'Agent' // Default to Agent
        }
      })
      
      setAgentToType(mergedConfig)
    } catch (err) {
      console.error('Error loading agency config:', err)
      // Initialize defaults on error
      const defaultConfig: Record<string, AgencyType> = {}
      allAgencies.forEach(agent => {
        defaultConfig[agent] = 'Agent'
      })
      setAgentToType(defaultConfig)
    } finally {
      setIsLoading(false)
    }
  }

  const saveConfig = async () => {
    setIsSaving(true)
    try {
      const config: AgencyClassificationConfig = {
        agentToType,
        lastUpdated: new Date().toISOString()
      }
      await setDoc(doc(db, 'agency_config', 'classification'), config)
      alert('Agency classification saved successfully!')
      if (onConfigChange) {
        onConfigChange()
      }
    } catch (err) {
      console.error('Error saving config:', err)
      alert('Error saving agency classification')
    } finally {
      setIsSaving(false)
    }
  }

  const updateAgentType = (agent: string, type: AgencyType) => {
    setAgentToType(prev => ({ ...prev, [agent]: type }))
  }

  const agentsByType = useMemo(() => {
    const grouped: Record<AgencyType, string[]> = {
      'Agent': [],
      'Direct': []
    }
    allAgencies.forEach(agent => {
      const type = agentToType[agent] || 'Agent'
      grouped[type].push(agent)
    })
    return grouped
  }, [agentToType, allAgencies])

  return (
    <>
      <button
        onClick={() => setShowConfig(true)}
        className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center space-x-2"
      >
        <Building2 className="h-4 w-4" />
        <span>Configure Agency Types</span>
      </button>

      {showConfig && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center space-x-2">
                <Building2 className="h-6 w-6 text-primary-600" />
                <h2 className="text-2xl font-bold text-gray-900">Configure Agency Types</h2>
              </div>
              <button
                onClick={() => setShowConfig(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                </div>
              ) : (
                <>
                  <p className="text-sm text-gray-600 mb-6">
                    Classify each agency as either "Agent" (bookings through an agency) or "Direct" (direct bookings).
                    Default is "Agent" for all agencies.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Agent Type */}
                    <div className="border rounded-lg p-5">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Agent</h3>
                      <div className="space-y-2 max-h-[400px] overflow-y-auto">
                        {agentsByType['Agent'].length === 0 ? (
                          <p className="text-sm text-gray-500">No agencies classified as Agent</p>
                        ) : (
                          agentsByType['Agent'].map(agent => (
                            <div key={agent} className="flex items-center justify-between p-2 bg-gray-50 rounded gap-2">
                              <span className="text-gray-700 flex-1 break-words min-w-0">{agent}</span>
                              <div className="flex gap-2 flex-shrink-0">
                                <button
                                  onClick={() => updateAgentType(agent, 'Agent')}
                                  className="px-3 py-1 text-xs border border-primary-600 bg-primary-600 text-white rounded"
                                >
                                  Agent
                                </button>
                                <button
                                  onClick={() => updateAgentType(agent, 'Direct')}
                                  className="px-3 py-1 text-xs border border-gray-300 bg-white text-gray-700 rounded hover:bg-gray-50"
                                >
                                  Direct
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Direct Type */}
                    <div className="border rounded-lg p-5">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Direct</h3>
                      <div className="space-y-2 max-h-[400px] overflow-y-auto">
                        {agentsByType['Direct'].length === 0 ? (
                          <p className="text-sm text-gray-500">No agencies classified as Direct</p>
                        ) : (
                          agentsByType['Direct'].map(agent => (
                            <div key={agent} className="flex items-center justify-between p-2 bg-gray-50 rounded gap-2">
                              <span className="text-gray-700 flex-1 break-words min-w-0">{agent}</span>
                              <div className="flex gap-2 flex-shrink-0">
                                <button
                                  onClick={() => updateAgentType(agent, 'Agent')}
                                  className="px-3 py-1 text-xs border border-gray-300 bg-white text-gray-700 rounded hover:bg-gray-50"
                                >
                                  Agent
                                </button>
                                <button
                                  onClick={() => updateAgentType(agent, 'Direct')}
                                  className="px-3 py-1 text-xs border border-primary-600 bg-primary-600 text-white rounded"
                                >
                                  Direct
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200">
              <button
                onClick={() => setShowConfig(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={saveConfig}
                disabled={isSaving}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center space-x-2 disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                <span>{isSaving ? 'Saving...' : 'Save Configuration'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

