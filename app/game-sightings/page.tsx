'use client'

import { useState, useEffect, useMemo, Fragment } from 'react'
import { motion } from 'framer-motion'
import DashboardLayout from '@/components/DashboardLayout'
import { Eye, User, Calendar, MapPin, Plus, Edit2, Save, X, Trash2, Clock, Car } from 'lucide-react'
import dynamic from 'next/dynamic'
import { useMapEvents, useMap } from 'react-leaflet'

// Dynamically import Leaflet to avoid SSR issues
const MapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), { ssr: false })
const TileLayer = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer), { ssr: false })
const Marker = dynamic(() => import('react-leaflet').then(mod => mod.Marker), { ssr: false })
const Popup = dynamic(() => import('react-leaflet').then(mod => mod.Popup), { ssr: false })

type Species = 'Lion' | 'Leopard' | 'Wild Dog' | 'Buffalo'

interface GameTrip {
  id: string
  date: string
  guide: string
  species: Species[]
  timeOfDay: 'AM' | 'PM'
  location: 'GMA' | 'Park'
  coordinates?: {
    lat: number
    lng: number
  }
  timestamp: string
  tripGroupId?: string
}

interface PendingSighting {
  id: string
  species: Species
  coordinates: {
    lat: number
    lng: number
  }
}

interface TripGroup {
  groupId: string
  date: string
  guide: string
  timeOfDay: 'AM' | 'PM'
  location: 'GMA' | 'Park'
  timestamp: string
  sightings: GameTrip[]
}

// Map click handler component - needs to be inside MapContainer
function MapClickHandler({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click: (e) => {
      onMapClick(e.latlng.lat, e.latlng.lng)
    },
  })
  return null
}

// Map zoom control component - requires Ctrl+Scroll for zoom
function MapZoomControl() {
  const map = useMap()
  
  useEffect(() => {
    // Disable default scroll wheel zoom
    map.scrollWheelZoom.disable()
    
    const handleWheel = (e: WheelEvent) => {
      // Only allow zoom if Ctrl key (or Cmd on Mac) is pressed
      if (e.ctrlKey || e.metaKey) {
        // Temporarily enable scrollWheelZoom to use Leaflet's smooth zoom
        map.scrollWheelZoom.enable()
        // Re-disable after the zoom event is processed
        setTimeout(() => {
          map.scrollWheelZoom.disable()
        }, 50)
        // Don't prevent default - let Leaflet handle the zoom
      } else {
        // When Ctrl is not pressed, prevent Leaflet from handling the event
        // Stop propagation to Leaflet but allow the event to continue to document
        e.stopImmediatePropagation()
        // Manually scroll the window to allow page scrolling
        window.scrollBy({
          top: e.deltaY,
          left: e.deltaX,
          behavior: 'auto'
        })
      }
    }
    
    const mapContainer = map.getContainer()
    // Use capture phase to intercept before Leaflet processes it
    mapContainer.addEventListener('wheel', handleWheel, { passive: false, capture: true })
    
    return () => {
      mapContainer.removeEventListener('wheel', handleWheel, { capture: true } as any)
      map.scrollWheelZoom.enable() // Re-enable on cleanup
    }
  }, [map])
  
  return null
}

const SPECIES_OPTIONS: Array<{ label: string; value: Species }> = [
  { label: 'Lion', value: 'Lion' },
  { label: 'Leopard', value: 'Leopard' },
  { label: 'Wild Dog', value: 'Wild Dog' },
  { label: 'Buffalo', value: 'Buffalo' },
]

type PinType = 'lodge' | 'camp' | 'airstrip' | 'landmark' | 'river' | 'feature'

interface MapPin {
  id: string
  name: string
  lat: number
  lng: number
  type: PinType
  description?: string
  createdAt: string
}

const PIN_TYPE_OPTIONS: Array<{ label: string; value: PinType }> = [
  { label: 'Lodge', value: 'lodge' },
  { label: 'Camp', value: 'camp' },
  { label: 'Airstrip', value: 'airstrip' },
  { label: 'Landmark', value: 'landmark' },
  { label: 'River', value: 'river' },
  { label: 'Feature', value: 'feature' },
]

export default function GameSightingsPage() {
  const [trips, setTrips] = useState<GameTrip[]>([])
  const [loading, setLoading] = useState(true)
  const [customPins, setCustomPins] = useState<MapPin[]>([])
  const [loadingPins, setLoadingPins] = useState(true)
  const [mapMode, setMapMode] = useState<'sighting' | 'landmark'>('sighting')
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [newPinLocation, setNewPinLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    guide: '',
    timeOfDay: 'AM' as 'AM' | 'PM',
    location: 'GMA' as 'GMA' | 'Park',
  })
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editData, setEditData] = useState<Partial<GameTrip> | null>(null)
  const [pinFormData, setPinFormData] = useState({
    name: '',
    type: PIN_TYPE_OPTIONS[0].value,
    description: '',
  })
  const [editingPinId, setEditingPinId] = useState<string | null>(null)
  const [editPinData, setEditPinData] = useState<Partial<MapPin> | null>(null)
  const [mapLoaded, setMapLoaded] = useState(false)
  const [showMap, setShowMap] = useState(true)
  const [pendingSpecies, setPendingSpecies] = useState<Species>('Lion')
  const [editPendingSpecies, setEditPendingSpecies] = useState<Species>('Lion')
  const [pendingSightings, setPendingSightings] = useState<PendingSighting[]>([])
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null)

  // Zambezi River area coordinates (approximate center)
  const mapCenter: [number, number] = [-15.8, 29.4]
  const mapZoom = 11

  useEffect(() => {
    fetchTrips()
    fetchPins()
    
    // Load Leaflet CSS and fix default icon issue
    // @ts-ignore - Leaflet CSS is loaded dynamically
    import('leaflet/dist/leaflet.css').then(() => {
      // Fix for Leaflet default icon issue
      const L = require('leaflet')
      delete (L.Icon.Default.prototype as any)._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
      })
      setMapLoaded(true)
    }).catch(() => {
      setMapLoaded(true) // Still set loaded even if CSS import fails
    })
  }, [])

  const fetchPins = async () => {
    try {
      setLoadingPins(true)
      const response = await fetch('/api/map-pins')
      if (response.ok) {
        const data = await response.json()
        setCustomPins(data)
      }
    } catch (error) {
      console.error('Error fetching map pins:', error)
    } finally {
      setLoadingPins(false)
    }
  }

  const fetchTrips = async () => {
    try {
      const response = await fetch('/api/game-sightings')
      if (response.ok) {
        const data = await response.json()
        setTrips(data)
      }
    } catch (error) {
      console.error('Error fetching trips:', error)
    } finally {
      setLoading(false)
    }
  }

  const createSightingId = () => {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
      return crypto.randomUUID()
    }
    return `sighting-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
  }

  const handleAddSpecies = () => {
    if (!selectedLocation) {
      alert('Please click on the map to set a location before adding a species.')
      return
    }

    const newSighting: PendingSighting = {
      id: createSightingId(),
      species: pendingSpecies,
      coordinates: selectedLocation,
    }

    setPendingSightings(prev => [...prev, newSighting])
    setSelectedLocation(null)
  }

  const handleRemoveSpecies = (id: string) => {
    setPendingSightings(prev => prev.filter(sighting => sighting.id !== id))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.guide.trim()) {
      alert('Please enter the guide name')
      return
    }

    if (pendingSightings.length === 0) {
      alert('Please add at least one sighting with a location')
      return
    }

    try {
      const submissionGroupId = createSightingId()
      const response = await fetch('/api/game-sightings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          date: formData.date,
          guide: formData.guide,
          timeOfDay: formData.timeOfDay,
          location: formData.location,
          tripGroupId: submissionGroupId,
          sightings: pendingSightings.map(sighting => ({
            species: sighting.species,
            coordinates: sighting.coordinates,
          })),
        }),
      })

      if (response.ok) {
        const result = await response.json()
        const createdTrips = Array.isArray(result?.trips) ? result.trips : (result ? [result] : [])
        setTrips(prev => [...prev, ...createdTrips])
        
        // Reset form but keep date
        setFormData(prev => ({
          date: prev.date,
          guide: '',
          timeOfDay: 'AM',
          location: 'GMA',
        }))
        setPendingSightings([])
        setPendingSpecies('Lion')
        setSelectedLocation(null)
        alert('Trip logged successfully!')
      } else {
        const error = await response.json()
        alert(`Error: ${error.message || 'Failed to log trip'}`)
      }
    } catch (error) {
      console.error('Error submitting trip:', error)
      alert('Failed to log trip. Please try again.')
    }
  }

  const handleEdit = (trip: GameTrip) => {
    setEditingId(trip.id)
    setEditData({
      date: trip.date,
      guide: trip.guide,
      species: [...trip.species],
      timeOfDay: trip.timeOfDay,
      location: trip.location,
      coordinates: trip.coordinates,
    })
    setEditPendingSpecies(trip.species[0] || 'Lion')
    setExpandedGroupId(trip.tripGroupId || trip.id)
  }

  const handleAddEditSpecies = () => {
    if (!editData) return
    if (editData.species?.includes(editPendingSpecies)) return
    setEditData({
      ...editData,
      species: [...(editData.species || []), editPendingSpecies],
    })
  }

  const handleRemoveEditSpecies = (species: Species) => {
    if (!editData) return
    setEditData({
      ...editData,
      species: editData.species?.filter(s => s !== species),
    })
  }

  const handleSaveEdit = async () => {
    if (!editingId || !editData) return

    if (!editData.species || editData.species.length === 0) {
      alert('Please select at least one species')
      return
    }

    try {
      const response = await fetch('/api/game-sightings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: editingId,
          ...editData,
        }),
      })

      if (response.ok) {
        const updatedTrip = await response.json()
        setTrips(prev => prev.map(t => t.id === editingId ? updatedTrip : t))
        setEditingId(null)
        setEditData(null)
        alert('Trip updated successfully!')
      } else {
        const error = await response.json()
        alert(`Error: ${error.message || 'Failed to update trip'}`)
      }
    } catch (error) {
      console.error('Error updating trip:', error)
      alert('Failed to update trip. Please try again.')
    }
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditData(null)
    setEditPendingSpecies('Lion')
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this trip? This action cannot be undone.')) {
      return
    }

    try {
      const response = await fetch(`/api/game-sightings?id=${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setTrips(prev => prev.filter(t => t.id !== id))
        if (editingId === id) {
          setEditingId(null)
          setEditData(null)
          setEditPendingSpecies('Lion')
        }
        alert('Trip deleted successfully!')
      } else {
        const error = await response.json()
        alert(`Error: ${error.message || 'Failed to delete trip'}`)
      }
    } catch (error) {
      console.error('Error deleting trip:', error)
      alert('Failed to delete trip. Please try again.')
    }
  }

  // Calculate statistics and frequency
  const stats = useMemo(() => {
    const totalSightings = trips.length
    const tripGroups = new Set(trips.map(t => t.tripGroupId || t.id))
    const numberOfDrives = tripGroups.size
    const avgSightingsPerTrip = numberOfDrives > 0 ? totalSightings / numberOfDrives : 0
    
    const speciesCounts = {
      lion: trips.filter(t => t.species.includes('Lion')).length,
      leopard: trips.filter(t => t.species.includes('Leopard')).length,
      wildDog: trips.filter(t => t.species.includes('Wild Dog')).length,
      buffalo: trips.filter(t => t.species.includes('Buffalo')).length,
    }

    const frequency = {
      lion: totalSightings > 0 ? (speciesCounts.lion / totalSightings) * 100 : 0,
      leopard: totalSightings > 0 ? (speciesCounts.leopard / totalSightings) * 100 : 0,
      wildDog: totalSightings > 0 ? (speciesCounts.wildDog / totalSightings) * 100 : 0,
      buffalo: totalSightings > 0 ? (speciesCounts.buffalo / totalSightings) * 100 : 0,
    }

    return {
      totalTrips: totalSightings,
      numberOfDrives,
      avgSightingsPerTrip,
      speciesCounts,
      frequency,
      gma: trips.filter(t => t.location === 'GMA').length,
      park: trips.filter(t => t.location === 'Park').length,
      am: trips.filter(t => t.timeOfDay === 'AM').length,
      pm: trips.filter(t => t.timeOfDay === 'PM').length,
    }
  }, [trips])

  const groupedTrips = useMemo<TripGroup[]>(() => {
    const groups = new Map<string, TripGroup>()

    for (const trip of trips) {
      const groupKey = trip.tripGroupId || trip.id
      const existing = groups.get(groupKey)

      if (existing) {
        existing.sightings.push(trip)
        if (new Date(trip.timestamp).getTime() > new Date(existing.timestamp).getTime()) {
          existing.timestamp = trip.timestamp
        }
      } else {
        groups.set(groupKey, {
          groupId: groupKey,
          date: trip.date,
          guide: trip.guide,
          timeOfDay: trip.timeOfDay,
          location: trip.location,
          timestamp: trip.timestamp,
          sightings: [trip],
        })
      }
    }

    const sortedGroups = Array.from(groups.values()).sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )

    sortedGroups.forEach(group => {
      group.sightings.sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      )
    })

    return sortedGroups
  }, [trips])

  // Get species icon color
  const getSpeciesColor = (species: Species) => {
    const colors = {
      'Lion': 'bg-yellow-100 text-yellow-800',
      'Leopard': 'bg-orange-100 text-orange-800',
      'Wild Dog': 'bg-red-100 text-red-800',
      'Buffalo': 'bg-gray-100 text-gray-800',
    }
    return colors[species]
  }

  // Create icon for game sightings (colored circle - different colors for each species)
  const getSightingIcon = (species: Species[]) => {
    if (typeof window === 'undefined') return null
    const L = require('leaflet')
    
    // Use the primary species color, or default if multiple
    const primarySpecies = species[0] || 'Lion'
    const iconColors: Record<Species, string> = {
      'Lion': '#eab308', // yellow-500
      'Leopard': '#f97316', // orange-500
      'Wild Dog': '#ef4444', // red-500
      'Buffalo': '#6b7280', // gray-500
    }
    
    const color = iconColors[primarySpecies]
    const borderColor = species.length > 1 ? '#000000' : '#ffffff' // Black border if multiple species
    
    return L.divIcon({
      className: 'custom-sighting-icon',
      html: `<div style="
        background-color: ${color};
        width: 24px;
        height: 24px;
        border-radius: 50%;
        border: 2px solid ${borderColor};
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: bold;
        color: white;
        font-size: 10px;
      ">${species.length > 1 ? species.length : ''}</div>`,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    })
  }

  const handleMapClick = (lat: number, lng: number) => {
    if (mapMode === 'landmark') {
      // Set location for new landmark pin
      setNewPinLocation({ lat, lng })
    } else if (mapMode === 'sighting') {
      // Set location for sighting
      if (editingId && editData) {
        setEditData({
          ...editData,
          coordinates: { lat, lng }
        })
      } else {
        setSelectedLocation({ lat, lng })
      }
    }
  }

  const handleAddPin = async () => {
    if (!newPinLocation || !pinFormData.name.trim()) {
      alert('Please click on the map to set a location and enter a pin name')
      return
    }

    try {
      const response = await fetch('/api/map-pins', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: pinFormData.name.trim(),
          location: {
            lat: newPinLocation.lat,
            lng: newPinLocation.lng,
          },
          type: pinFormData.type,
          description: pinFormData.description?.trim() || undefined,
        }),
      })

      if (response.ok) {
        const newPin = await response.json()
        setCustomPins(prev => [...prev, newPin])
        setNewPinLocation(null)
        setPinFormData({
          name: '',
          type: PIN_TYPE_OPTIONS[0].value,
          description: '',
        })
        alert('Landmark pin added successfully!')
      } else {
        const error = await response.json()
        alert(`Error: ${error.message || 'Failed to add pin'}`)
      }
    } catch (error) {
      console.error('Error adding pin:', error)
      alert('Failed to add pin. Please try again.')
    }
  }

  const handleDeletePin = async (id: string) => {
    if (!confirm('Are you sure you want to delete this landmark pin?')) {
      return
    }

    try {
      const response = await fetch(`/api/map-pins?id=${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setCustomPins(prev => prev.filter(p => p.id !== id))
        alert('Landmark pin deleted successfully!')
      } else {
        const error = await response.json()
        alert(`Error: ${error.message || 'Failed to delete pin'}`)
      }
    } catch (error) {
      console.error('Error deleting pin:', error)
      alert('Failed to delete pin. Please try again.')
    }
  }

  // Create icon for landmark pins (match fishing map markers)
  const getLandmarkIcon = () => {
    if (typeof window === 'undefined') return null
    const L = require('leaflet')
    return L.icon({
      iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
      iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41],
    })
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading game sightings data...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Game Sightings Tracker</h1>
          <p className="text-gray-600">
            Log game viewing trips and track sighting frequency for Lion, Leopard, Wild Dog, and Buffalo
          </p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Number of Drives</p>
                <p className="text-2xl font-bold text-gray-900">{stats.numberOfDrives}</p>
                <p className="text-xs text-gray-500 mt-1">{stats.avgSightingsPerTrip.toFixed(2)} avg sightings/trip</p>
              </div>
              <Car className="h-8 w-8 text-primary-600" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Lion</p>
                <p className="text-2xl font-bold text-gray-900">{stats.speciesCounts.lion}</p>
                <p className="text-xs text-gray-500 mt-1">{stats.frequency.lion.toFixed(1)}% frequency</p>
              </div>
              <Eye className="h-8 w-8 text-yellow-600" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Leopard</p>
                <p className="text-2xl font-bold text-gray-900">{stats.speciesCounts.leopard}</p>
                <p className="text-xs text-gray-500 mt-1">{stats.frequency.leopard.toFixed(1)}% frequency</p>
              </div>
              <Eye className="h-8 w-8 text-orange-600" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Wild Dog</p>
                <p className="text-2xl font-bold text-gray-900">{stats.speciesCounts.wildDog}</p>
                <p className="text-xs text-gray-500 mt-1">{stats.frequency.wildDog.toFixed(1)}% frequency</p>
              </div>
              <Eye className="h-8 w-8 text-red-600" />
            </div>
          </motion.div>
        </div>

        {/* Additional Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Buffalo</p>
                <p className="text-2xl font-bold text-gray-900">{stats.speciesCounts.buffalo}</p>
                <p className="text-xs text-gray-500 mt-1">{stats.frequency.buffalo.toFixed(1)}% frequency</p>
              </div>
              <Eye className="h-8 w-8 text-gray-600" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">GMA</p>
                <p className="text-2xl font-bold text-gray-900">{stats.gma}</p>
              </div>
              <MapPin className="h-8 w-8 text-primary-600" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Park</p>
                <p className="text-2xl font-bold text-gray-900">{stats.park}</p>
              </div>
              <MapPin className="h-8 w-8 text-primary-600" />
            </div>
          </motion.div>
        </div>

        {/* Map View */}
        {mapLoaded && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Sighting Locations Map</h2>
              <div className="flex items-center space-x-2">
                {/* Mode Toggle */}
                <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
                  <button
                    onClick={() => {
                      setMapMode('sighting')
                      setNewPinLocation(null)
                      setSelectedLocation(null)
                    }}
                    className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                      mapMode === 'sighting'
                        ? 'bg-white text-primary-600 shadow-sm font-medium'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Sighting Location
                  </button>
                  <button
                    onClick={() => {
                      setMapMode('landmark')
                      setSelectedLocation(null)
                      setNewPinLocation(null)
                    }}
                    className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                      mapMode === 'landmark'
                        ? 'bg-white text-primary-600 shadow-sm font-medium'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Landmark Pin
                  </button>
                </div>
                <button
                  onClick={() => setShowMap(!showMap)}
                  className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  {showMap ? 'Hide Map' : 'Show Map'}
                </button>
              </div>
            </div>
            {showMap && (
              <>
                <div className="h-[500px] rounded-lg overflow-hidden border border-gray-200">
                  <MapContainer
                    center={mapCenter}
                    zoom={mapZoom}
                    style={{ height: '100%', width: '100%' }}
                    scrollWheelZoom={false}
                  >
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <MapClickHandler onMapClick={handleMapClick} />
                    <MapZoomControl />
                    
                    {/* Landmark pins */}
                    {customPins.map((pin) => {
                      const icon = getLandmarkIcon()
                      if (!icon) return null
                      
                      return (
                        <Marker
                          key={pin.id}
                          position={[pin.lat, pin.lng]}
                          icon={icon}
                        >
                          <Popup>
                            <div className="text-sm">
                              <p className="font-semibold text-gray-900 mb-1">{pin.name}</p>
                              <p className="text-gray-600 capitalize text-xs mb-1">{pin.type}</p>
                              {pin.description && (
                                <p className="text-gray-500 text-xs mb-1">{pin.description}</p>
                              )}
                              <p className="text-gray-400 text-xs">
                                {pin.lat.toFixed(4)}, {pin.lng.toFixed(4)}
                              </p>
                            </div>
                          </Popup>
                        </Marker>
                      )
                    })}
                    
                    {/* Pending landmark pin selection */}
                    {mapMode === 'landmark' && newPinLocation && (
                      <Marker
                        position={[newPinLocation.lat, newPinLocation.lng]}
                        icon={getLandmarkIcon()}
                      >
                        <Popup>
                          <div className="text-sm">
                            <p className="font-semibold">New Landmark Location</p>
                            <p className="text-gray-600 capitalize text-xs">Type: {pinFormData.type}</p>
                            <p className="text-gray-500 text-xs">
                              {newPinLocation.lat.toFixed(6)}, {newPinLocation.lng.toFixed(6)}
                            </p>
                          </div>
                        </Popup>
                      </Marker>
                    )}
                    
                    {/* Game sighting markers - always visible */}
                    {trips.filter(t => t.coordinates).map((trip) => {
                      const icon = getSightingIcon(trip.species)
                      if (!icon || !trip.coordinates) return null
                      
                      return (
                        <Marker
                          key={trip.id}
                          position={[trip.coordinates.lat, trip.coordinates.lng]}
                          icon={icon}
                        >
                          <Popup>
                            <div className="text-sm">
                              <p className="font-semibold text-gray-900 mb-1">{trip.guide}</p>
                              <p className="text-gray-600 text-xs mb-1">
                                {new Date(trip.date).toLocaleDateString()} - {trip.timeOfDay}
                              </p>
                              <p className="text-gray-600 text-xs mb-2">{trip.location}</p>
                              <div className="flex flex-wrap gap-1 mb-2">
                                {trip.species.map(species => (
                                  <span
                                    key={species}
                                    className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${getSpeciesColor(species)}`}
                                  >
                                    {species}
                                  </span>
                                ))}
                              </div>
                              <p className="text-gray-400 text-xs">
                                {trip.coordinates.lat.toFixed(4)}, {trip.coordinates.lng.toFixed(4)}
                              </p>
                            </div>
                          </Popup>
                        </Marker>
                      )
                    })}
                    
                    {/* Selected location for new sighting */}
                    {mapMode === 'sighting' && selectedLocation && !editingId && (
                      <Marker
                        position={[selectedLocation.lat, selectedLocation.lng]}
                        icon={getSightingIcon([pendingSpecies])}
                      >
                        <Popup>
                          <div className="text-sm">
                            <p className="font-semibold">Selected Sighting Location</p>
                            <p className="text-gray-600 text-xs">
                              {selectedLocation.lat.toFixed(6)}, {selectedLocation.lng.toFixed(6)}
                            </p>
                            <button
                              onClick={() => {
                                setSelectedLocation(null)
                              }}
                              className="mt-2 text-xs text-red-600 hover:text-red-700 underline"
                            >
                              Clear location
                            </button>
                          </div>
                        </Popup>
                      </Marker>
                    )}
                    
                    {/* Selected location for editing sighting */}
                    {mapMode === 'sighting' && editingId && editData?.coordinates && (
                      <Marker
                        position={[editData.coordinates.lat, editData.coordinates.lng]}
                        icon={editData.species && editData.species.length > 0
                          ? getSightingIcon(editData.species)
                          : getSightingIcon(['Lion']) // Default icon
                        }
                      >
                        <Popup>
                          <div className="text-sm">
                            <p className="font-semibold">Editing Sighting Location</p>
                            <p className="text-gray-600 text-xs">
                              {editData.coordinates.lat.toFixed(6)}, {editData.coordinates.lng.toFixed(6)}
                            </p>
                          </div>
                        </Popup>
                      </Marker>
                    )}
                  </MapContainer>
                </div>
                
                {/* Landmark form when in landmark mode */}
                {mapMode === 'landmark' && newPinLocation && (
                  <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <h3 className="text-sm font-semibold text-blue-900 mb-3">Add Landmark Pin</h3>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-blue-900 mb-1">
                          Pin Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={pinFormData.name}
                          onChange={(e) => setPinFormData({ ...pinFormData, name: e.target.value })}
                          placeholder="e.g., Watering Hole, Lookout Point"
                          className="w-full px-3 py-2 text-sm border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-blue-900 mb-1">
                          Pin Type
                        </label>
                        <select
                          value={pinFormData.type}
                          onChange={(e) => setPinFormData({ ...pinFormData, type: e.target.value as PinType })}
                          className="w-full px-3 py-2 text-sm border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          {PIN_TYPE_OPTIONS.map(option => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-blue-900 mb-1">
                          Description (Optional)
                        </label>
                        <textarea
                          value={pinFormData.description}
                          onChange={(e) => setPinFormData({ ...pinFormData, description: e.target.value })}
                          placeholder="Add any additional details..."
                          rows={2}
                          className="w-full px-3 py-2 text-sm border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={handleAddPin}
                          className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          Add Landmark
                        </button>
                        <button
                          onClick={() => {
                            setNewPinLocation(null)
                            setPinFormData({
                              name: '',
                              type: PIN_TYPE_OPTIONS[0].value,
                              description: '',
                            })
                          }}
                          className="px-4 py-2 bg-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-300 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Legend */}
                <div className="mt-4 flex flex-wrap gap-4 text-xs">
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 rounded-full bg-yellow-500 border-2 border-white shadow"></div>
                    <span>Lion</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 rounded-full bg-orange-500 border-2 border-white shadow"></div>
                    <span>Leopard</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 rounded-full bg-red-500 border-2 border-white shadow"></div>
                    <span>Wild Dog</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 rounded-full bg-gray-500 border-2 border-white shadow"></div>
                    <span>Buffalo</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 rounded-full bg-yellow-500 border-2 border-black shadow"></div>
                    <span>Multiple Species</span>
                  </div>
                </div>
              </>
            )}
          </motion.div>
        )}

        {/* Form and Table */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Form */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
          >
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Log New Trip</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Guide <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.guide}
                  onChange={(e) => setFormData({ ...formData, guide: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Enter guide name"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Species Seen <span className="text-red-500">*</span>
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <select
                    value={pendingSpecies}
                    onChange={(e) => setPendingSpecies(e.target.value as Species)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  >
                  {SPECIES_OPTIONS.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={handleAddSpecies}
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium"
                    >
                    Add Species
                  </button>
                </div>
                <div className="mt-3 space-y-2">
                  {pendingSightings.length === 0 ? (
                    <p className="text-xs text-gray-500">No sightings added yet. Select a location on the map, choose a species, and click "Add Species".</p>
                  ) : (
                    pendingSightings.map(sighting => (
                      <div
                        key={sighting.id}
                        className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-700"
                      >
                        <div>
                          <p className="font-medium text-gray-900">{sighting.species}</p>
                          <p className="text-gray-500">
                            {sighting.coordinates.lat.toFixed(4)}, {sighting.coordinates.lng.toFixed(4)}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveSpecies(sighting.id)}
                          className="text-gray-500 hover:text-gray-700 text-sm"
                          aria-label={`Remove ${sighting.species}`}
                        >
                          &times;
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Time of Day <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.timeOfDay}
                    onChange={(e) => setFormData({ ...formData, timeOfDay: e.target.value as 'AM' | 'PM' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    required
                  >
                    <option value="AM">AM</option>
                    <option value="PM">PM</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Location <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value as 'GMA' | 'Park' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    required
                  >
                    <option value="GMA">GMA</option>
                    <option value="Park">Park</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sighting Location (Optional)
                </label>
                <p className="text-xs text-gray-500 mb-2">
                  Switch to "Sighting Location" mode on the map above and click to set the exact location
                </p>
                {selectedLocation ? (
                  <div className="mb-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-blue-800 text-sm font-medium mb-1">
                      Location set: {selectedLocation.lat.toFixed(4)}, {selectedLocation.lng.toFixed(4)}
                    </p>
                    <button
                      type="button"
                      onClick={() => setSelectedLocation(null)}
                      className="text-xs text-blue-600 hover:text-blue-700 underline"
                    >
                      Clear location
                    </button>
                  </div>
                ) : (
                  <div className="mb-2 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                    <p className="text-gray-600 text-xs">
                      No location set. Use the map above to select a location.
                    </p>
                  </div>
                )}
              </div>

              <button
                type="submit"
                className="w-full bg-primary-600 text-white py-2 px-4 rounded-lg hover:bg-primary-700 transition-colors flex items-center justify-center space-x-2"
              >
                <Plus className="h-5 w-5" />
                <span>Log Trip</span>
              </button>
            </form>
          </motion.div>

          {/* Table */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 p-6"
          >
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Trips</h2>
            
            {trips.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Eye className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p>No trips logged yet. Use the form to start logging!</p>
              </div>
            ) : (
              <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium text-gray-700">Date</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-700">Guide</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-700">Time</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-700">Location</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-700">Sightings</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {groupedTrips.map(group => {
                      const isExpanded = expandedGroupId === group.groupId
                      return (
                        <Fragment key={group.groupId}>
                          <tr className="bg-white">
                            <td className="px-3 py-2 text-gray-600">
                              {new Date(group.date).toLocaleDateString()}
                            </td>
                            <td className="px-3 py-2 text-gray-900 font-medium">{group.guide}</td>
                            <td className="px-3 py-2">{group.timeOfDay}</td>
                            <td className="px-3 py-2">{group.location}</td>
                            <td className="px-3 py-2">{group.sightings.length}</td>
                            <td className="px-3 py-2 text-right">
                              <button
                                onClick={() => setExpandedGroupId(isExpanded ? null : group.groupId)}
                                className="inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-lg text-gray-600 hover:text-gray-900"
                              >
                                {isExpanded ? 'Hide Sightings' : 'View Sightings'}
                              </button>
                            </td>
                          </tr>
                          {isExpanded && (
                            <tr>
                              <td colSpan={6} className="bg-gray-50 px-3 py-3">
                                <div className="space-y-3">
                                  {group.sightings.map(trip => (
                                    <div
                                      key={trip.id}
                                      className="border border-gray-200 rounded-lg bg-white p-3 shadow-sm"
                                    >
                          {editingId === trip.id ? (
                                        <div className="space-y-3">
                                          <div className="grid md:grid-cols-2 gap-2">
                                    <div>
                                      <label className="block text-xs font-medium text-gray-700 mb-1">Date</label>
                                      <input
                                        type="date"
                                        value={editData?.date || ''}
                                        onChange={(e) => setEditData({ ...editData, date: e.target.value })}
                                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-xs font-medium text-gray-700 mb-1">Guide</label>
                                      <input
                                        type="text"
                                        value={editData?.guide || ''}
                                        onChange={(e) => setEditData({ ...editData, guide: e.target.value })}
                                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                      />
                                    </div>
                                  </div>
                                  <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Species</label>
                                            <div className="flex flex-col sm:flex-row gap-2">
                                              <select
                                                value={editPendingSpecies}
                                                onChange={(e) => setEditPendingSpecies(e.target.value as Species)}
                                                className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                                        >
                                                {SPECIES_OPTIONS.map(option => (
                                                  <option key={option.value} value={option.value}>
                                                    {option.label}
                                                  </option>
                                                ))}
                                              </select>
                                              <button
                                                type="button"
                                                onClick={handleAddEditSpecies}
                                                className="px-3 py-1 bg-primary-600 text-white text-xs rounded hover:bg-primary-700"
                                              >
                                                Add Species
                                              </button>
                                    </div>
                                            <div className="mt-2 flex flex-wrap gap-2">
                                              {editData?.species && editData.species.length > 0 ? (
                                                editData.species.map(species => (
                                                  <span
                                                    key={species}
                                                    className="inline-flex items-center space-x-1 bg-gray-100 text-gray-800 text-xs font-medium px-2.5 py-1 rounded-full"
                                                  >
                                                    <span>{species}</span>
                                                    <button
                                                      type="button"
                                                      onClick={() => handleRemoveEditSpecies(species)}
                                                      className="text-gray-500 hover:text-gray-700"
                                                      aria-label={`Remove ${species}`}
                                                    >
                                                      ×
                                                    </button>
                                                  </span>
                                                ))
                                              ) : (
                                                <p className="text-xs text-gray-500">No species recorded yet.</p>
                                              )}
                                  </div>
                                          </div>
                                          <div className="grid md:grid-cols-2 gap-2">
                                    <div>
                                      <label className="block text-xs font-medium text-gray-700 mb-1">Time</label>
                                      <select
                                        value={editData?.timeOfDay || 'AM'}
                                        onChange={(e) => setEditData({ ...editData, timeOfDay: e.target.value as 'AM' | 'PM' })}
                                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                      >
                                        <option value="AM">AM</option>
                                        <option value="PM">PM</option>
                                      </select>
                                    </div>
                                    <div>
                                      <label className="block text-xs font-medium text-gray-700 mb-1">Location</label>
                                      <select
                                        value={editData?.location || 'GMA'}
                                        onChange={(e) => setEditData({ ...editData, location: e.target.value as 'GMA' | 'Park' })}
                                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                      >
                                        <option value="GMA">GMA</option>
                                        <option value="Park">Park</option>
                                      </select>
                                    </div>
                                  </div>
                                          <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1">
                                              Sighting Location (Optional)
                                            </label>
                                            <p className="text-xs text-gray-500 mb-2">
                                              Switch to "Sighting Location" mode on the map above and click to update the location
                                            </p>
                                            {editData?.coordinates ? (
                                              <div className="mb-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs">
                                                <p className="text-blue-800 font-medium mb-1">
                                                  Location: {editData.coordinates.lat.toFixed(4)}, {editData.coordinates.lng.toFixed(4)}
                                                </p>
                                                <button
                                                  type="button"
                                                  onClick={() => setEditData({ ...editData, coordinates: undefined })}
                                                  className="text-blue-600 hover:text-blue-700 underline"
                                                >
                                                  Clear location
                                                </button>
                                              </div>
                                            ) : (
                                              <div className="mb-2 p-2 bg-gray-50 border border-gray-200 rounded text-xs">
                                                <p className="text-gray-600">
                                                  No location set. Use the map above to select a location.
                                                </p>
                                              </div>
                                            )}
                                          </div>
                                  <div className="flex items-center justify-end space-x-2 pt-2">
                                    <button
                                      onClick={handleSaveEdit}
                                      className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 flex items-center space-x-1"
                                    >
                                      <Save className="h-3 w-3" />
                                      <span>Save</span>
                                    </button>
                                    <button
                                      onClick={handleCancelEdit}
                                      className="px-3 py-1 bg-gray-600 text-white text-sm rounded hover:bg-gray-700 flex items-center space-x-1"
                                    >
                                      <X className="h-3 w-3" />
                                      <span>Cancel</span>
                                    </button>
                                  </div>
                                </div>
                          ) : (
                                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                                          <div>
                                            <div className="flex flex-wrap gap-2">
                                  {trip.species.map(species => (
                                    <span
                                      key={species}
                                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getSpeciesColor(species)}`}
                                    >
                                      {species}
                                    </span>
                                  ))}
                                </div>
                                            <p className="text-xs text-gray-500 mt-1">
                                              {trip.coordinates
                                                ? `${trip.coordinates.lat.toFixed(4)}, ${trip.coordinates.lng.toFixed(4)}`
                                                : 'No location recorded'}
                                            </p>
                                          </div>
                                          <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => handleEdit(trip)}
                                              className="inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-lg text-gray-600 hover:text-gray-900"
                                  >
                                              <Edit2 className="h-4 w-4 mr-1" />
                                              Edit
                                  </button>
                                  <button
                                    onClick={() => handleDelete(trip.id)}
                                              className="inline-flex items-center px-3 py-1.5 border border-red-300 text-red-600 rounded-lg hover:bg-red-50"
                                  >
                                              <Trash2 className="h-4 w-4 mr-1" />
                                              Delete
                                  </button>
                                </div>
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </DashboardLayout>
  )
}
