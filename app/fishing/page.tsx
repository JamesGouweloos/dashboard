'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import DashboardLayout from '@/components/DashboardLayout'
import { MapPin, Fish, Plus, Calendar, User, Scale, Edit2, Save, X, ChevronDown, ChevronUp, Trash2, Cloud, Wind, Thermometer, Droplets, Eye, Gauge } from 'lucide-react'
import dynamic from 'next/dynamic'
import { useMapEvents, useMap } from 'react-leaflet'

// Dynamically import Leaflet to avoid SSR issues
const MapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), { ssr: false })
const TileLayer = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer), { ssr: false })
const Marker = dynamic(() => import('react-leaflet').then(mod => mod.Marker), { ssr: false })
const Popup = dynamic(() => import('react-leaflet').then(mod => mod.Popup), { ssr: false })

interface WeatherData {
  temperature: number
  feelsLike: number
  humidity: number
  pressure: number
  windSpeed: number
  windDirection: number
  visibility: number
  clouds: number
  conditions: string
  description: string
  icon: string
}

interface FishingCatch {
  id: string
  date: string
  time?: string // HH:MM format
  guide: string
  species: 'Tiger Fish' | 'Vundu'
  weight: number
  area: 'GMA' | 'Park'
  location?: {
    lat: number
    lng: number
  } | null
  weather?: WeatherData
  tripId?: string
  timestamp: string
}

interface FishingTrip {
  id: string
  date: string
  guide: string
  catches: FishingCatch[]
}

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

const AREA_OPTIONS: Array<'GMA' | 'Park'> = ['GMA', 'Park']

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

export default function FishingTrackerPage() {
  const [catches, setCatches] = useState<FishingCatch[]>([])
  const [loadingCatches, setLoadingCatches] = useState(true)
  const [customPins, setCustomPins] = useState<MapPin[]>([])
  const [loadingPins, setLoadingPins] = useState(true)
  const [mapMode, setMapMode] = useState<'catch' | 'pin'>('catch')
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [newPinLocation, setNewPinLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [catchFormData, setCatchFormData] = useState({
    guide: '',
    species: 'Tiger Fish' as 'Tiger Fish' | 'Vundu',
    weight: '',
    date: new Date().toISOString().split('T')[0],
    time: new Date().toTimeString().slice(0, 5), // HH:MM format
    area: 'GMA' as 'GMA' | 'Park',
  })
  const [pinFormData, setPinFormData] = useState({
    name: '',
    type: PIN_TYPE_OPTIONS[0].value,
    description: '',
  })
  const [mapLoaded, setMapLoaded] = useState(false)
  const [editingCatchId, setEditingCatchId] = useState<string | null>(null)
  const [editingPinId, setEditingPinId] = useState<string | null>(null)
  const [editCatchData, setEditCatchData] = useState<Partial<FishingCatch> | null>(null)
  const [editPinData, setEditPinData] = useState<Partial<MapPin> | null>(null)
  const [pinsTableExpanded, setPinsTableExpanded] = useState(false)
  const [loadingWeather, setLoadingWeather] = useState(false)
  const [areaFilters, setAreaFilters] = useState<{ GMA: boolean; Park: boolean }>({
    GMA: true,
    Park: true,
  })

  const handleAreaFilterClick = (area: 'All' | 'GMA' | 'Park') => {
    if (area === 'All') {
      setAreaFilters({ GMA: true, Park: true })
      return
    }

    setAreaFilters((prev) => {
      const next = { ...prev, [area]: !prev[area] }
      if (!next.GMA && !next.Park) {
        return prev
      }
      return next
    })
  }

  // Zambezi River area coordinates (approximate center)
  const mapCenter: [number, number] = [-15.8, 29.4]
  const mapZoom = 11

  useEffect(() => {
    fetchCatches()
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
    })
  }, [])

  // Create custom icons for different landmark types
  const getLandmarkIcon = (type: PinType) => {
    const L = require('leaflet')
    const iconColors: Record<PinType, string> = {
      'lodge': '#10b981', // green
      'camp': '#3b82f6', // blue
      'airstrip': '#f59e0b', // orange
      'landmark': '#8b5cf6', // purple
      'river': '#06b6d4', // cyan
      'feature': '#ec4899', // pink
    }
    
    const color = iconColors[type] || '#6b7280'
    
    return L.divIcon({
      className: 'custom-landmark-icon',
      html: `<div style="
        background-color: ${color};
        width: 20px;
        height: 20px;
        border-radius: 50%;
        border: 2px solid white;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
      "></div>`,
      iconSize: [20, 20],
      iconAnchor: [10, 10],
    })
  }

  // Create icon for fishing catches (colored circle - different colors for each species)
  const getCatchIcon = (species: 'Tiger Fish' | 'Vundu') => {
    const L = require('leaflet')
    // Orange-600 for Tiger Fish, Blue-600 for Vundu (matching legend)
    const color = species === 'Tiger Fish' ? '#ea580c' : '#2563eb'
    return L.divIcon({
      className: 'custom-catch-icon',
      html: `<div style="
        background-color: ${color};
        width: 20px;
        height: 20px;
        border-radius: 50%;
        border: 2px solid white;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
      "></div>`,
      iconSize: [20, 20],
      iconAnchor: [10, 10],
    })
  }

  // Create icon for map pins (default red marker with fish icon)
  const getMapPinIcon = () => {
    // Use default Leaflet icon (red marker)
    const L = require('leaflet')
    return L.icon({
      iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
      iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41]
    })
  }

  const fetchCatches = async () => {
    try {
      const response = await fetch('/api/fishing')
      if (response.ok) {
        const data = await response.json()
        setCatches(data)
      }
    } catch (error) {
      console.error('Error fetching catches:', error)
    } finally {
      setLoadingCatches(false)
    }
  }

  const fetchPins = async () => {
    try {
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

  const handleMapClick = async (lat: number, lng: number) => {
    if (mapMode === 'catch') {
      setSelectedLocation({ lat, lng })
      // Optionally fetch weather data when location is selected (for preview)
      // This can be done on submit instead to avoid unnecessary API calls
    } else {
      setNewPinLocation({ lat, lng })
    }
  }

  const fetchWeatherData = async (lat: number, lng: number, date?: string, time?: string): Promise<WeatherData | null> => {
    try {
      setLoadingWeather(true)
      console.log('Fetching weather for lat:', lat, 'lng:', lng, 'date:', date, 'time:', time)
      
      // Build query string with optional date and time for historical data
      let queryString = `lat=${lat}&lng=${lng}`
      if (date) {
        queryString += `&date=${date}`
        if (time) {
          queryString += `&time=${time}`
        }
      }
      
      const response = await fetch(`/api/weather?${queryString}`)
      
      console.log('Weather API response status:', response.status)
      
      if (response.ok) {
        const weatherData = await response.json()
        console.log('Weather data received:', weatherData)
        return weatherData
      } else {
        const error = await response.json().catch(() => ({ message: 'Unknown error' }))
        console.error('Weather API error response:', error)
        if (error.error === 'API_KEY_MISSING') {
          console.warn('Weather API not configured. Catch will be saved without weather data.')
          alert('Warning: Weather API is not configured. The catch will be saved without weather data.')
        } else {
          console.warn('Failed to fetch weather data:', error.message || error.error)
          // Don't show alert for other errors, just log them
        }
        return null
      }
    } catch (error) {
      console.error('Error fetching weather data:', error)
      return null
    } finally {
      setLoadingWeather(false)
    }
  }

  const handleCatchSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!catchFormData.guide.trim()) {
      alert('Please enter the guide name')
      return
    }

    if (!catchFormData.weight || parseFloat(catchFormData.weight) <= 0) {
      alert('Please enter a valid weight')
      return
    }

    try {
      let weatherData: WeatherData | null = null
      if (selectedLocation) {
        weatherData = await fetchWeatherData(
          selectedLocation.lat, 
          selectedLocation.lng,
          catchFormData.date,
          catchFormData.time
        )
      }

      const catchData: Omit<FishingCatch, 'id' | 'timestamp'> = {
        date: catchFormData.date,
        time: catchFormData.time,
        guide: catchFormData.guide,
        species: catchFormData.species,
        weight: parseFloat(catchFormData.weight),
        area: catchFormData.area,
        location: selectedLocation || undefined,
        weather: weatherData || undefined,
      }

      const response = await fetch('/api/fishing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(catchData),
      })

      if (response.ok) {
        const newCatch = await response.json()
        setCatches(prev => [...prev, newCatch])
        
        // Reset weight/species but keep guide/date/time
        setCatchFormData(prev => ({
          guide: prev.guide,
          species: 'Tiger Fish',
          weight: '',
          date: prev.date,
          time: prev.time,
          area: prev.area,
        }))
        setSelectedLocation(null)
        alert('Catch logged successfully!')
      } else {
        const error = await response.json()
        alert(`Error: ${error.message || 'Failed to log catch'}`)
      }
    } catch (error) {
      console.error('Error submitting catch:', error)
      alert('Failed to log catch. Please try again.')
    }
  }

  const handleCatchLocationClear = () => {
    setSelectedLocation(null)
  }

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!newPinLocation) {
      alert('Please click on the map to select a pin location')
      return
    }

    if (!pinFormData.name.trim()) {
      alert('Please enter a name for the map pin')
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
          type: pinFormData.type,
          description: pinFormData.description.trim(),
          location: newPinLocation,
        }),
      })

      if (response.ok) {
        const newPin = await response.json()
        setCustomPins(prev => [...prev, newPin])
        setPinFormData(prev => ({
          name: '',
          type: prev.type,
          description: '',
        }))
        setNewPinLocation(null)
        alert('Map pin created successfully!')
      } else {
        const error = await response.json()
        alert(`Error: ${error.message || 'Failed to create map pin'}`)
      }
    } catch (error) {
      console.error('Error creating map pin:', error)
      alert('Failed to create map pin. Please try again.')
    }
  }

  const handleEditCatch = (catchItem: FishingCatch) => {
    setEditingCatchId(catchItem.id)
    // Extract time from timestamp if time field doesn't exist (for backwards compatibility)
    const time = catchItem.time || new Date(catchItem.timestamp).toTimeString().slice(0, 5)
    setEditCatchData({
      date: catchItem.date,
      time: time,
      guide: catchItem.guide,
      species: catchItem.species,
      weight: catchItem.weight.toString() as any,
      area: catchItem.area || 'GMA',
      location: catchItem.location,
      weather: catchItem.weather,
    })
    setSelectedLocation(catchItem.location || null)
  }

  const handleSaveCatch = async () => {
    if (!editingCatchId || !editCatchData) return

    try {
      let finalWeatherData = editCatchData.weather
      const locationForWeather =
        selectedLocation || (editCatchData.location && editCatchData.location !== null ? editCatchData.location : null)

      if (locationForWeather) {
        console.log('Fetching historical weather data for catch timestamp:', editCatchData.date, editCatchData.time)
        const weatherData = await fetchWeatherData(
          locationForWeather.lat, 
          locationForWeather.lng,
          editCatchData.date,
          editCatchData.time
        )
        
        if (weatherData) {
          console.log('Historical weather data fetched successfully:', weatherData)
          finalWeatherData = weatherData
        } else if (editCatchData.weather) {
          console.log('Weather fetch failed, preserving existing weather data')
        } else {
          console.warn('No weather data available for this catch')
        }
      }

      const requestBody: any = {
          id: editingCatchId,
          date: editCatchData.date,
          time: editCatchData.time,
          guide: editCatchData.guide,
          species: editCatchData.species,
          weight: typeof editCatchData.weight === 'string' ? parseFloat(editCatchData.weight) : editCatchData.weight,
          area: editCatchData.area || 'GMA',
          weather: finalWeatherData,
      }

      if (selectedLocation) {
        requestBody.location = selectedLocation
      } else if (editCatchData.location === null) {
        requestBody.location = null
      }

      const response = await fetch('/api/fishing', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      if (response.ok) {
        const updatedCatch = await response.json()
        setCatches(prev => prev.map(c => c.id === editingCatchId ? updatedCatch : c))
        setEditingCatchId(null)
        setEditCatchData(null)
        setSelectedLocation(null)
        alert('Catch updated successfully!')
      } else {
        const error = await response.json()
        alert(`Error: ${error.message || 'Failed to update catch'}`)
      }
    } catch (error) {
      console.error('Error updating catch:', error)
      alert('Failed to update catch. Please try again.')
    }
  }

  const handleCancelEditCatch = () => {
    setEditingCatchId(null)
    setEditCatchData(null)
    setSelectedLocation(null)
  }

  const handleEditPin = (pin: MapPin) => {
    setEditingPinId(pin.id)
    setEditPinData({
      name: pin.name,
      type: pin.type,
      description: pin.description || '',
      lat: pin.lat,
      lng: pin.lng,
    })
  }

  const handleSavePin = async () => {
    if (!editingPinId || !editPinData) return

    try {
      const response = await fetch('/api/map-pins', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: editingPinId,
          name: editPinData.name,
          type: editPinData.type,
          description: editPinData.description,
          location: {
            lat: editPinData.lat,
            lng: editPinData.lng,
          },
        }),
      })

      if (response.ok) {
        const updatedPin = await response.json()
        setCustomPins(prev => prev.map(p => p.id === editingPinId ? updatedPin : p))
        setEditingPinId(null)
        setEditPinData(null)
        alert('Map pin updated successfully!')
      } else {
        const error = await response.json()
        alert(`Error: ${error.message || 'Failed to update pin'}`)
      }
    } catch (error) {
      console.error('Error updating pin:', error)
      alert('Failed to update pin. Please try again.')
    }
  }

  const handleCancelEditPin = () => {
    setEditingPinId(null)
    setEditPinData(null)
  }

  const handleDeleteCatch = async (catchId: string) => {
    if (!confirm('Are you sure you want to delete this catch? This action cannot be undone.')) {
      return
    }

    try {
      const response = await fetch(`/api/fishing?id=${catchId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setCatches(prev => prev.filter(c => c.id !== catchId))
        alert('Catch deleted successfully!')
      } else {
        const error = await response.json()
        alert(`Error: ${error.message || 'Failed to delete catch'}`)
      }
    } catch (error) {
      console.error('Error deleting catch:', error)
      alert('Failed to delete catch. Please try again.')
    }
  }

  const handleDeletePin = async (pinId: string) => {
    if (!confirm('Are you sure you want to delete this map pin? This action cannot be undone.')) {
      return
    }

    try {
      const response = await fetch(`/api/map-pins?id=${pinId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setCustomPins(prev => prev.filter(p => p.id !== pinId))
        alert('Map pin deleted successfully!')
      } else {
        const error = await response.json()
        alert(`Error: ${error.message || 'Failed to delete pin'}`)
      }
    } catch (error) {
      console.error('Error deleting pin:', error)
      alert('Failed to delete pin. Please try again.')
    }
  }

  const handlePinReset = () => {
    setNewPinLocation(null)
    setPinFormData({
      name: '',
      type: PIN_TYPE_OPTIONS[0].value,
      description: '',
    })
  }

  const filteredCatches = useMemo(() => {
    const allSelected = areaFilters.GMA && areaFilters.Park
    if (allSelected) {
      return catches
    }
    return catches.filter((catchItem) => {
      const areaKey = (catchItem.area || 'GMA') as 'GMA' | 'Park'
      return areaFilters[areaKey]
    })
  }, [catches, areaFilters])

  // Group catches by trip (same guide, same date)
  const trips = filteredCatches.reduce((acc, catchItem) => {
    const key = `${catchItem.date}-${catchItem.guide}`
    if (!acc[key]) {
      acc[key] = {
        id: key,
        date: catchItem.date,
        guide: catchItem.guide,
        catches: [],
      }
    }
    acc[key].catches.push(catchItem)
    return acc
  }, {} as Record<string, FishingTrip>)

  const tripList = Object.values(trips).sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  )

  // Statistics
  const stats = useMemo(() => {
    const totalWeight = filteredCatches.reduce((sum, c) => sum + c.weight, 0)
    return {
      totalCatches: filteredCatches.length,
      totalTrips: tripList.length,
      totalPins: customPins.length,
      tigerFish: filteredCatches.filter(c => c.species === 'Tiger Fish').length,
      vundu: filteredCatches.filter(c => c.species === 'Vundu').length,
      totalWeight,
      avgWeight: filteredCatches.length > 0 ? totalWeight / filteredCatches.length : 0,
    }
  }, [filteredCatches, tripList.length, customPins.length])

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value)
  }

  const getWeatherIconUrl = (icon: string) => {
    return `https://openweathermap.org/img/wn/${icon}@2x.png`
  }

  const formatWindDirection = (degrees: number) => {
    const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW']
    return directions[Math.round(degrees / 22.5) % 16]
  }

  const renderWeatherInfo = (weather: WeatherData | undefined) => {
    if (!weather) return null

    return (
      <div className="mt-2 pt-2 border-t border-gray-200">
        <p className="text-xs font-semibold text-gray-700 mb-1 flex items-center">
          <Cloud className="h-3 w-3 mr-1" />
          Weather Conditions
        </p>
        <div className="grid grid-cols-2 gap-1 text-xs">
          <div className="flex items-center space-x-1">
            <img 
              src={getWeatherIconUrl(weather.icon)} 
              alt={weather.conditions}
              className="h-6 w-6"
            />
            <span className="text-gray-600 capitalize">{weather.description}</span>
          </div>
          <div className="flex items-center space-x-1 text-gray-600">
            <Thermometer className="h-3 w-3" />
            <span>{weather.temperature}°C</span>
          </div>
          <div className="flex items-center space-x-1 text-gray-600">
            <Wind className="h-3 w-3" />
            <span>{weather.windSpeed} m/s {formatWindDirection(weather.windDirection)}</span>
          </div>
          <div className="flex items-center space-x-1 text-gray-600">
            <Droplets className="h-3 w-3" />
            <span>{weather.humidity}%</span>
          </div>
          <div className="flex items-center space-x-1 text-gray-600">
            <Gauge className="h-3 w-3" />
            <span>{weather.pressure} hPa</span>
          </div>
          {weather.visibility > 0 && (
            <div className="flex items-center space-x-1 text-gray-600">
              <Eye className="h-3 w-3" />
              <span>{weather.visibility} km</span>
            </div>
          )}
        </div>
      </div>
    )
  }

  if (loadingCatches) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading fishing data...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Fishing & Game Viewing Tracker</h1>
          <p className="text-gray-600">
            Log fishing catches by clicking on the map and filling in the details
          </p>
          <div className="mt-4">
            <div className="text-sm font-semibold text-gray-700 mb-1">Area Filters</div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => handleAreaFilterClick('All')}
                className={`px-2 py-1 text-xs rounded border ${
                  areaFilters.GMA && areaFilters.Park
                    ? 'bg-primary-600 text-white border-primary-600'
                    : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                }`}
              >
                All
              </button>
              {AREA_OPTIONS.map((area) => {
              const isActive = areaFilters[area]
              return (
                <button
                  key={area}
                  type="button"
                    onClick={() => handleAreaFilterClick(area)}
                    className={`px-2 py-1 text-xs rounded border ${
                    isActive
                      ? 'bg-primary-50 text-primary-700 border-primary-200 shadow-sm'
                      : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {area}
                </button>
              )
            })}
            </div>
            <p className="text-xs text-gray-400 mt-1">Tap to include or exclude catches logged in each area.</p>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Catches</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalCatches}</p>
              </div>
              <Fish className="h-8 w-8 text-primary-600" />
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
                <p className="text-sm text-gray-600">Total Trips</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalTrips}</p>
              </div>
              <Calendar className="h-8 w-8 text-primary-600" />
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
                <p className="text-sm text-gray-600">Custom Map Pins</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalPins}</p>
              </div>
              <MapPin className="h-8 w-8 text-primary-600" />
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
                <p className="text-sm text-gray-600">Total Weight</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalWeight.toFixed(1)} lbs</p>
              </div>
              <Scale className="h-8 w-8 text-primary-600" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Avg Weight</p>
                <p className="text-2xl font-bold text-gray-900">{stats.avgWeight.toFixed(1)} lbs</p>
              </div>
              <Scale className="h-8 w-8 text-primary-600" />
            </div>
          </motion.div>
        </div>

        {/* Species Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-4"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Species Breakdown</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-gray-700">Tiger Fish</span>
                <span className="font-semibold text-gray-900">{stats.tigerFish}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-700">Vundu</span>
                <span className="font-semibold text-gray-900">{stats.vundu}</span>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Map - Full Width */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-4"
        >
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Zambezi River Map</h3>
              <p className="text-sm text-gray-600">
                {mapMode === 'catch'
                  ? 'Click on the river to select a catch location'
                  : 'Click anywhere on the map to place a custom pin'}
              </p>
            </div>
            <div className="px-2 py-1 rounded-full text-xs font-medium bg-primary-100 text-primary-700 border border-primary-200">
              Mode: {mapMode === 'catch' ? 'Log Catch' : 'Create Map Pin'}
            </div>
          </div>
          
            {/* Legend */}
            <div className="mb-3 p-2 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-xs font-semibold text-gray-700 mb-2">Map Legend:</p>
              <div className="flex items-center space-x-4 text-xs">
                <div className="flex items-center space-x-1">
                  <div className="w-3 h-3 rounded-full bg-orange-600 border border-white"></div>
                  <span className="text-gray-600">Tiger Fish</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-3 h-3 rounded-full bg-blue-600 border border-white"></div>
                  <span className="text-gray-600">Vundu</span>
                </div>
              </div>
            </div>
          {mapLoaded && (
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
                
                {/* Custom map pins */}
                {customPins.map((pin) => (
                  <Marker
                    key={pin.id}
                    position={[pin.lat, pin.lng]}
                    icon={getMapPinIcon()}
                  >
                    <Popup>
                      <div className="text-sm">
                        <div className="flex items-center space-x-1 mb-1">
                          <Fish className="h-4 w-4 text-red-500" />
                          <p className="font-semibold text-gray-900">{pin.name}</p>
                        </div>
                        <p className="text-gray-600 capitalize">{pin.type}</p>
                        {pin.description && (
                          <p className="text-gray-500 text-xs mt-1">{pin.description}</p>
                        )}
                        <p className="text-gray-400 text-xs mt-1">
                          {pin.lat.toFixed(4)}, {pin.lng.toFixed(4)}
                        </p>
                      </div>
                    </Popup>
                  </Marker>
                ))}
                
                {/* Pending map pin selection */}
                {mapMode === 'pin' && newPinLocation && (
                  <Marker
                    position={[newPinLocation.lat, newPinLocation.lng]}
                    icon={getMapPinIcon()}
                  >
                    <Popup>
                      <div className="text-sm">
                        <div className="flex items-center space-x-1 mb-1">
                          <Fish className="h-4 w-4 text-red-500" />
                          <p className="font-semibold">New Pin Location</p>
                        </div>
                        <p className="text-gray-600 capitalize">Type: {pinFormData.type}</p>
                        <p className="text-gray-500 text-xs">
                          {newPinLocation.lat.toFixed(6)}, {newPinLocation.lng.toFixed(6)}
                        </p>
                      </div>
                    </Popup>
                  </Marker>
                )}
                
                {/* Fishing catch markers */}
                {filteredCatches
                  .filter((catchItem) => catchItem.location)
                  .map((catchItem) => (
                  <Marker
                    key={catchItem.id}
                    position={[catchItem.location!.lat, catchItem.location!.lng]}
                    icon={getCatchIcon(catchItem.species)}
                  >
                    <Popup>
                      <div className="text-sm">
                        <p className="font-semibold">{catchItem.species}</p>
                        <p className="text-gray-700">{catchItem.weight} lbs</p>
                        <p className="text-gray-600 text-xs">Guide: {catchItem.guide}</p>
                        <p className="text-gray-500 text-xs">
                          {new Date(catchItem.date).toLocaleDateString()}
                          {catchItem.time && ` at ${catchItem.time}`}
                        </p>
                        {renderWeatherInfo(catchItem.weather)}
                      </div>
                    </Popup>
                  </Marker>
                ))}
                {selectedLocation && mapMode === 'catch' && (
                  <Marker 
                    position={[selectedLocation.lat, selectedLocation.lng]}
                    icon={editingCatchId && editCatchData?.species 
                      ? getCatchIcon(editCatchData.species)
                      : getCatchIcon(catchFormData.species)
                    }
                  >
                    <Popup>
                      <div className="text-sm">
                        <p className="font-semibold">Selected Location</p>
                        <p className="text-gray-600 text-xs">
                          {selectedLocation.lat.toFixed(6)}, {selectedLocation.lng.toFixed(6)}
                        </p>
                        {editingCatchId && editCatchData?.species && (
                          <p className="text-gray-600 text-xs mt-1">Species: {editCatchData.species}</p>
                        )}
                      </div>
                    </Popup>
                  </Marker>
                )}
              </MapContainer>
            </div>
          )}
        </motion.div>

        {/* Map Actions - Form Below Map */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-4"
        >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {mapMode === 'catch' ? 'Log Catch' : 'Create Map Pin'}
              </h3>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setMapMode('catch')}
                  className={`px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors ${
                    mapMode === 'catch'
                      ? 'bg-primary-600 text-white border-primary-600'
                      : 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200'
                  }`}
                >
                  Log Catch
                </button>
                <button
                  onClick={() => setMapMode('pin')}
                  className={`px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors ${
                    mapMode === 'pin'
                      ? 'bg-primary-600 text-white border-primary-600'
                      : 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200'
                  }`}
                >
                  Create Map Pin
                </button>
              </div>
            </div>

            {mapMode === 'catch' ? (
              <>
                {selectedLocation ? (
                  <div className="mb-4 p-3 bg-primary-50 rounded-lg border border-primary-200">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center space-x-2">
                        <MapPin className="h-4 w-4 text-primary-600" />
                        <span className="text-primary-700">
                          Location: {selectedLocation.lat.toFixed(6)}, {selectedLocation.lng.toFixed(6)}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={handleCatchLocationClear}
                        className="text-xs text-primary-600 hover:text-primary-700 font-medium"
                      >
                        Clear
                      </button>
                    </div>
                    <div className="mt-1 text-xs text-primary-600 flex items-center space-x-2">
                      <Cloud className="h-3 w-3" />
                      <span>Weather will be captured automatically for this coordinate</span>
                    </div>
                  </div>
                ) : (
                  <div className="mb-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                    <p className="text-sm text-yellow-700">
                      Selecting a map location is optional, but adds coordinates and automatic weather data.
                    </p>
                  </div>
                )}

                <form onSubmit={handleCatchSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Guide Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={catchFormData.guide}
                      onChange={(e) => setCatchFormData({ ...catchFormData, guide: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      placeholder="Enter guide name"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Date <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        value={catchFormData.date}
                        onChange={(e) => setCatchFormData({ ...catchFormData, date: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Time <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="time"
                        value={catchFormData.time}
                        onChange={(e) => setCatchFormData({ ...catchFormData, time: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Species <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={catchFormData.species}
                      onChange={(e) => setCatchFormData({ ...catchFormData, species: e.target.value as 'Tiger Fish' | 'Vundu' })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      required
                    >
                      <option value="Tiger Fish">Tiger Fish</option>
                      <option value="Vundu">Vundu</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Area <span className="text-red-500">*</span>
                    </label>
                    <div className="flex space-x-2">
                      {AREA_OPTIONS.map((area) => (
                        <button
                          key={area}
                          type="button"
                          onClick={() => setCatchFormData({ ...catchFormData, area })}
                          className={`flex-1 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                            catchFormData.area === area
                              ? 'bg-primary-600 text-white border-primary-600'
                              : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          {area}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Weight (lbs) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={catchFormData.weight}
                      onChange={(e) => setCatchFormData({ ...catchFormData, weight: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      placeholder="Enter weight in lbs"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loadingWeather}
                    className="w-full bg-primary-600 text-white py-2 px-4 rounded-lg hover:bg-primary-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
                  >
                    {loadingWeather ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Fetching weather...</span>
                      </>
                    ) : (
                      <>
                        <Plus className="h-5 w-5" />
                        <span>Log Catch</span>
                      </>
                    )}
                  </button>
                </form>
              </>
            ) : (
              <>
                {newPinLocation ? (
                  <div className="mb-4 p-3 bg-primary-50 rounded-lg border border-primary-200">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center space-x-2">
                        <MapPin className="h-4 w-4 text-primary-600" />
                        <span className="text-primary-700">
                          Pin Location: {newPinLocation.lat.toFixed(6)}, {newPinLocation.lng.toFixed(6)}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={handlePinReset}
                        className="text-xs text-primary-600 hover:text-primary-700 font-medium"
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mb-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                    <p className="text-sm text-yellow-700">
                      Click on the map to choose where to place the new pin
                    </p>
                  </div>
                )}

                <form onSubmit={handlePinSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Pin Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={pinFormData.name}
                      onChange={(e) => setPinFormData({ ...pinFormData, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      placeholder="e.g. Baines' River Camp Jetty"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Pin Type <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={pinFormData.type}
                      onChange={(e) => setPinFormData({ ...pinFormData, type: e.target.value as PinType })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      required
                    >
                      {PIN_TYPE_OPTIONS.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description <span className="text-gray-400 text-xs">(optional)</span>
                    </label>
                    <textarea
                      value={pinFormData.description}
                      onChange={(e) => setPinFormData({ ...pinFormData, description: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      rows={3}
                      placeholder="Add notes to help identify this location"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={!newPinLocation}
                    className="w-full bg-primary-600 text-white py-2 px-4 rounded-lg hover:bg-primary-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
                  >
                    <Plus className="h-5 w-5" />
                    <span>Create Map Pin</span>
                  </button>
                </form>
              </>
            )}
          </motion.div>

        {/* Custom Map Pins */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => setPinsTableExpanded(!pinsTableExpanded)}
              className="flex items-center space-x-2 text-lg font-semibold text-gray-900 hover:text-primary-600 transition-colors"
            >
              <h3>Custom Map Pins</h3>
              {pinsTableExpanded ? (
                <ChevronUp className="h-5 w-5" />
              ) : (
                <ChevronDown className="h-5 w-5" />
              )}
            </button>
            {loadingPins && (
              <span className="text-xs text-gray-500">Loading pins...</span>
            )}
          </div>

          {pinsTableExpanded && (
            <>
              {loadingPins ? (
                <div className="text-center py-6 text-gray-500">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-3"></div>
                  <p>Fetching map pins...</p>
                </div>
              ) : customPins.length === 0 ? (
                <div className="text-center py-6 text-gray-500">
                  <MapPin className="h-10 w-10 mx-auto mb-3 text-gray-400" />
                  <p>No custom pins yet. Switch to "Create Map Pin" to start adding reference points.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium text-gray-700">Name</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-700">Type</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-700">Coordinates</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-700">Description</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-700">Created</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-700">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {customPins
                        .slice()
                        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                        .map((pin) => (
                          <tr key={pin.id}>
                            {editingPinId === pin.id ? (
                              <>
                                <td className="px-3 py-2">
                                  <input
                                    type="text"
                                    value={editPinData?.name || ''}
                                    onChange={(e) => setEditPinData({ ...editPinData, name: e.target.value })}
                                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                  />
                                </td>
                                <td className="px-3 py-2">
                                  <select
                                    value={editPinData?.type || 'lodge'}
                                    onChange={(e) => setEditPinData({ ...editPinData, type: e.target.value as PinType })}
                                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                  >
                                    {PIN_TYPE_OPTIONS.map(opt => (
                                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                  </select>
                                </td>
                                <td className="px-3 py-2 text-gray-600 text-xs">
                                  {pin.lat.toFixed(5)}, {pin.lng.toFixed(5)}
                                </td>
                                <td className="px-3 py-2">
                                  <input
                                    type="text"
                                    value={editPinData?.description || ''}
                                    onChange={(e) => setEditPinData({ ...editPinData, description: e.target.value })}
                                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                    placeholder="Description"
                                  />
                                </td>
                                <td className="px-3 py-2 text-gray-600 text-xs">
                                  {new Date(pin.createdAt).toLocaleString()}
                                </td>
                                <td className="px-3 py-2">
                                  <div className="flex items-center space-x-2">
                                    <button
                                      onClick={handleSavePin}
                                      className="p-1 text-green-600 hover:text-green-700"
                                      title="Save"
                                    >
                                      <Save className="h-4 w-4" />
                                    </button>
                                    <button
                                      onClick={handleCancelEditPin}
                                      className="p-1 text-gray-600 hover:text-gray-700"
                                      title="Cancel"
                                    >
                                      <X className="h-4 w-4" />
                                    </button>
                                  </div>
                                </td>
                              </>
                            ) : (
                              <>
                                <td className="px-3 py-2 font-medium text-gray-900">{pin.name}</td>
                                <td className="px-3 py-2 capitalize">{pin.type}</td>
                                <td className="px-3 py-2 text-gray-600">
                                  {pin.lat.toFixed(5)}, {pin.lng.toFixed(5)}
                                </td>
                                <td className="px-3 py-2 text-gray-600">
                                  {pin.description || <span className="text-gray-400 italic">No description</span>}
                                </td>
                                <td className="px-3 py-2 text-gray-600">
                                  {new Date(pin.createdAt).toLocaleString()}
                                </td>
                                <td className="px-3 py-2">
                                  <div className="flex items-center space-x-2">
                                    <button
                                      onClick={() => handleEditPin(pin)}
                                      className="p-1 text-primary-600 hover:text-primary-700"
                                      title="Edit"
                                    >
                                      <Edit2 className="h-4 w-4" />
                                    </button>
                                    <button
                                      onClick={() => handleDeletePin(pin.id)}
                                      className="p-1 text-red-600 hover:text-red-700"
                                      title="Delete"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </button>
                                  </div>
                                </td>
                              </>
                            )}
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </motion.div>

        {/* Catches Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Fishing Trips & Catches</h3>
          
          {tripList.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Fish className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p>
                {filteredCatches.length === 0
                  ? 'No catches match the selected area filters. Adjust the filters above to see more data.'
                  : 'No catches logged yet. Click on the map to start logging!'}
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {tripList.map((trip) => (
                <div key={trip.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="font-semibold text-gray-900">
                        {new Date(trip.date).toLocaleDateString('en-US', { 
                          weekday: 'long', 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric' 
                        })}
                      </h4>
                      <p className="text-sm text-gray-600 flex items-center space-x-1">
                        <User className="h-4 w-4" />
                        <span>Guide: {trip.guide}</span>
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600">Total Catches</p>
                      <p className="text-xl font-bold text-primary-600">{trip.catches.length}</p>
                    </div>
                  </div>
                  
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left font-medium text-gray-700">Species</th>
                          <th className="px-3 py-2 text-left font-medium text-gray-700">Area</th>
                          <th className="px-3 py-2 text-right font-medium text-gray-700">Weight (lbs)</th>
                          <th className="px-3 py-2 text-left font-medium text-gray-700">Location</th>
                          <th className="px-3 py-2 text-left font-medium text-gray-700">Temp</th>
                          <th className="px-3 py-2 text-left font-medium text-gray-700">Conditions</th>
                          <th className="px-3 py-2 text-left font-medium text-gray-700">Wind</th>
                          <th className="px-3 py-2 text-left font-medium text-gray-700">Humidity</th>
                          <th className="px-3 py-2 text-left font-medium text-gray-700">Pressure</th>
                          <th className="px-3 py-2 text-left font-medium text-gray-700">Time</th>
                          <th className="px-3 py-2 text-left font-medium text-gray-700">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {trip.catches
                          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                          .map((catchItem) => (
                            <tr key={catchItem.id}>
                              {editingCatchId === catchItem.id ? (
                                <>
                                  <td className="px-3 py-2" colSpan={11}>
                                    <div className="space-y-2 p-3 bg-gray-50 rounded-lg">
                                      <div className="grid grid-cols-2 gap-2">
                                        <div>
                                          <label className="block text-xs font-medium text-gray-700 mb-1">Guide</label>
                                          <input
                                            type="text"
                                            value={editCatchData?.guide || ''}
                                            onChange={(e) => setEditCatchData({ ...editCatchData, guide: e.target.value })}
                                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                          />
                                        </div>
                                        <div>
                                          <label className="block text-xs font-medium text-gray-700 mb-1">Species</label>
                                          <select
                                            value={editCatchData?.species || 'Tiger Fish'}
                                            onChange={(e) => setEditCatchData({ ...editCatchData, species: e.target.value as 'Tiger Fish' | 'Vundu' })}
                                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                          >
                                            <option value="Tiger Fish">Tiger Fish</option>
                                            <option value="Vundu">Vundu</option>
                                          </select>
                                        </div>
                                        <div>
                                          <label className="block text-xs font-medium text-gray-700 mb-1">Area</label>
                                          <div className="flex space-x-2">
                                            {AREA_OPTIONS.map((area) => (
                                              <button
                                                key={area}
                                                type="button"
                                                onClick={() => setEditCatchData({ ...editCatchData, area })}
                                                className={`flex-1 px-2 py-1 rounded border text-xs font-medium ${
                                                  (editCatchData?.area || 'GMA') === area
                                                    ? 'bg-primary-600 text-white border-primary-600'
                                                    : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                                                }`}
                                              >
                                                {area}
                                              </button>
                                            ))}
                                          </div>
                                        </div>
                                      </div>
                                      <div className="grid grid-cols-2 gap-2">
                                        <div>
                                          <label className="block text-xs font-medium text-gray-700 mb-1">Weight (lbs)</label>
                                          <input
                                            type="number"
                                            step="0.1"
                                            min="0"
                                            value={typeof editCatchData?.weight === 'string' ? editCatchData.weight : (editCatchData?.weight?.toString() || '')}
                                            onChange={(e) => setEditCatchData({ ...editCatchData, weight: e.target.value as any })}
                                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                          />
                                        </div>
                                      </div>
                                      <div className="grid grid-cols-2 gap-2">
                                        <div>
                                          <label className="block text-xs font-medium text-gray-700 mb-1">Date</label>
                                          <input
                                            type="date"
                                            value={editCatchData?.date || ''}
                                            onChange={(e) => setEditCatchData({ ...editCatchData, date: e.target.value })}
                                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                          />
                                        </div>
                                        <div>
                                          <label className="block text-xs font-medium text-gray-700 mb-1">Time</label>
                                          <input
                                            type="time"
                                            value={editCatchData?.time || ''}
                                            onChange={(e) => setEditCatchData({ ...editCatchData, time: e.target.value })}
                                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                          />
                                        </div>
                                      </div>
                                      <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">Location (optional)</label>
                                        <div className="text-xs text-gray-600 flex items-center gap-2 flex-wrap">
                                          {selectedLocation
                                            ? `${selectedLocation.lat.toFixed(6)}, ${selectedLocation.lng.toFixed(6)}`
                                            : catchItem.location
                                              ? `${catchItem.location.lat.toFixed(6)}, ${catchItem.location.lng.toFixed(6)}`
                                              : 'No coordinates recorded'}
                                          <span className="text-primary-600">(Click the map to set or update)</span>
                                          {(selectedLocation || catchItem.location) && (
                                            <button
                                              type="button"
                                              onClick={() => {
                                                setSelectedLocation(null)
                                                setEditCatchData({ ...editCatchData, location: null })
                                              }}
                                              className="text-red-500 hover:text-red-600 font-medium"
                                            >
                                              Clear
                                            </button>
                                          )}
                                        </div>
                                        <div className="text-xs text-gray-500 mt-1">
                                          Weather data is only refreshed when coordinates are supplied.
                                        </div>
                                        {editCatchData?.weather && (
                                          <div className="mt-2 pt-2 border-t border-gray-200">
                                            {renderWeatherInfo(editCatchData.weather)}
                                          </div>
                                        )}
                                      </div>
                                      <div className="flex items-center justify-end space-x-2 pt-2">
                                        <button
                                          onClick={handleSaveCatch}
                                          className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 flex items-center space-x-1"
                                        >
                                          <Save className="h-3 w-3" />
                                          <span>Save</span>
                                        </button>
                                        <button
                                          onClick={handleCancelEditCatch}
                                          className="px-3 py-1 bg-gray-600 text-white text-sm rounded hover:bg-gray-700 flex items-center space-x-1"
                                        >
                                          <X className="h-3 w-3" />
                                          <span>Cancel</span>
                                        </button>
                                      </div>
                                    </div>
                                  </td>
                                </>
                              ) : (
                                <>
                                  <td className="px-3 py-2">
                                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                      catchItem.species === 'Tiger Fish' 
                                        ? 'bg-orange-100 text-orange-800' 
                                        : 'bg-blue-100 text-blue-800'
                                    }`}>
                                      {catchItem.species}
                                    </span>
                                  </td>
                                  <td className="px-3 py-2">
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                      {catchItem.area || 'GMA'}
                                    </span>
                                  </td>
                                  <td className="px-3 py-2 text-right font-medium">{catchItem.weight} lbs</td>
                                  <td className="px-3 py-2 text-gray-600 text-xs">
                                    {catchItem.location
                                      ? `${catchItem.location.lat.toFixed(4)}, ${catchItem.location.lng.toFixed(4)}`
                                      : <span className="text-gray-400">No coordinates</span>}
                                  </td>
                                  {/* Temperature */}
                                  <td className="px-3 py-2 text-gray-600 text-xs">
                                    {catchItem.weather ? (
                                      <div className="flex items-center space-x-1">
                                        <img 
                                          src={getWeatherIconUrl(catchItem.weather.icon)} 
                                          alt={catchItem.weather.conditions}
                                          className="h-4 w-4"
                                          onError={(e) => {
                                            e.currentTarget.style.display = 'none'
                                          }}
                                        />
                                        <span className="font-medium">{catchItem.weather.temperature}°C</span>
                                      </div>
                                    ) : (
                                      <span className="text-gray-400">-</span>
                                    )}
                                  </td>
                                  {/* Conditions */}
                                  <td className="px-3 py-2 text-gray-600 text-xs capitalize">
                                    {catchItem.weather ? catchItem.weather.description : <span className="text-gray-400">-</span>}
                                  </td>
                                  {/* Wind */}
                                  <td className="px-3 py-2 text-gray-600 text-xs">
                                    {catchItem.weather ? (
                                      <span>{catchItem.weather.windSpeed} m/s {formatWindDirection(catchItem.weather.windDirection)}</span>
                                    ) : (
                                      <span className="text-gray-400">-</span>
                                    )}
                                  </td>
                                  {/* Humidity */}
                                  <td className="px-3 py-2 text-gray-600 text-xs">
                                    {catchItem.weather ? (
                                      <span>{catchItem.weather.humidity}%</span>
                                    ) : (
                                      <span className="text-gray-400">-</span>
                                    )}
                                  </td>
                                  {/* Pressure */}
                                  <td className="px-3 py-2 text-gray-600 text-xs">
                                    {catchItem.weather ? (
                                      <span>{catchItem.weather.pressure} hPa</span>
                                    ) : (
                                      <span className="text-gray-400">-</span>
                                    )}
                                  </td>
                                  <td className="px-3 py-2 text-gray-600 text-xs">
                                    {(() => {
                                      if (catchItem.time) {
                                        return catchItem.time
                                      }
                                      if (catchItem.timestamp) {
                                        try {
                                          const date = new Date(catchItem.timestamp)
                                          // Extract time in HH:MM format (24-hour)
                                          const hours = date.getHours().toString().padStart(2, '0')
                                          const minutes = date.getMinutes().toString().padStart(2, '0')
                                          return `${hours}:${minutes}`
                                        } catch (e) {
                                          return 'N/A'
                                        }
                                      }
                                      return 'N/A'
                                    })()}
                                  </td>
                                  <td className="px-3 py-2">
                                    <div className="flex items-center space-x-2">
                                      <button
                                        onClick={() => handleEditCatch(catchItem)}
                                        className="p-1 text-primary-600 hover:text-primary-700"
                                        title="Edit"
                                      >
                                        <Edit2 className="h-4 w-4" />
                                      </button>
                                      <button
                                        onClick={() => handleDeleteCatch(catchItem.id)}
                                        className="p-1 text-red-600 hover:text-red-700"
                                        title="Delete"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </button>
                                    </div>
                                  </td>
                                </>
                              )}
                            </tr>
                          ))}
                      </tbody>
                      <tfoot className="bg-gray-50">
                        <tr>
                          <td className="px-3 py-2 font-semibold text-gray-900">Total</td>
                          <td className="px-3 py-2 text-right font-semibold text-gray-900">
                            {trip.catches.reduce((sum, c) => sum + c.weight, 0).toFixed(1)} lbs
                          </td>
                          <td colSpan={9}></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </DashboardLayout>
  )
}

