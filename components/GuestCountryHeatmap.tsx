'use client'

import { useMemo, useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { MapPin, TrendingUp } from 'lucide-react'
import Highcharts from 'highcharts'
import HighchartsReact from 'highcharts-react-official'
import HighchartsMap from 'highcharts/modules/map'

// Initialize Highmaps module
if (typeof Highcharts === 'object') {
  HighchartsMap(Highcharts)
}

interface GuestCountryHeatmapProps {
  data: any[]
}

interface CountryStats {
  country: string
  guestCount: number
  totalBedNights: number
  avgBedNights: number
}

// Normalize country names and map to Highcharts keys
const normalizeCountryName = (country: string): string => {
  const normalized = country.trim().toUpperCase()
  
  // Handle common variations
  const variations: Record<string, string> = {
    'USA': 'UNITED STATES',
    'US': 'UNITED STATES',
    'AMERICA': 'UNITED STATES',
    'UK': 'UNITED KINGDOM',
    'BRITAIN': 'UNITED KINGDOM',
    'GREAT BRITAIN': 'UNITED KINGDOM',
    'ENGLAND': 'UNITED KINGDOM',
    'HOLLAND': 'NETHERLANDS',
    'NETHERLAND': 'NETHERLANDS',
    'UAE': 'UNITED ARAB EMIRATES',
    'RSA': 'SOUTH AFRICA',
    'SA': 'SOUTH AFRICA'
  }
  
  return variations[normalized] || country
}

// Country name to ISO code mapping (using Highcharts map keys)
const countryToISOCode: Record<string, string> = {
  'UNITED STATES': 'us',
  'UNITED KINGDOM': 'gb',
  'SOUTH AFRICA': 'za',
  'BOTSWANA': 'bw',
  'ZIMBABWE': 'zw',
  'ZAMBIA': 'zm',
  'NAMIBIA': 'na',
  'AUSTRALIA': 'au',
  'GERMANY': 'de',
  'FRANCE': 'fr',
  'ITALY': 'it',
  'SPAIN': 'es',
  'CANADA': 'ca',
  'BRAZIL': 'br',
  'CHINA': 'cn',
  'INDIA': 'in',
  'JAPAN': 'jp',
  'MEXICO': 'mx',
  'NETHERLANDS': 'nl',
  'SWITZERLAND': 'ch',
  'BELGIUM': 'be',
  'AUSTRIA': 'at',
  'SWEDEN': 'se',
  'NORWAY': 'no',
  'DENMARK': 'dk',
  'KENYA': 'ke',
  'TANZANIA': 'tz',
  'UGANDA': 'ug',
  'RWANDA': 'rw',
  'MOZAMBIQUE': 'mz',
  'MALAWI': 'mw',
  'ANGOLA': 'ao',
  'NIGERIA': 'ng',
  'EGYPT': 'eg',
  'MOROCCO': 'ma',
  'GHANA': 'gh',
  'SENEGAL': 'sn',
  'IVORY COAST': 'ci',
  'CAMEROON': 'cm',
  'ETHIOPIA': 'et',
  'MADAGASCAR': 'mg',
  'MAURITIUS': 'mu',
  'SEYCHELLES': 'sc',
  'NEW ZEALAND': 'nz',
  'SINGAPORE': 'sg',
  'THAILAND': 'th',
  'MALAYSIA': 'my',
  'INDONESIA': 'id',
  'PHILIPPINES': 'ph',
  'VIETNAM': 'vn',
  'SOUTH KOREA': 'kr',
  'KOREA': 'kr',
  'ARGENTINA': 'ar',
  'CHILE': 'cl',
  'COLOMBIA': 'co',
  'PERU': 'pe',
  'VENEZUELA': 've',
  'URUGUAY': 'uy',
  'ECUADOR': 'ec',
  'COSTA RICA': 'cr',
  'PANAMA': 'pa',
  'IRELAND': 'ie',
  'PORTUGAL': 'pt',
  'GREECE': 'gr',
  'POLAND': 'pl',
  'CZECH REPUBLIC': 'cz',
  'CZECHIA': 'cz',
  'HUNGARY': 'hu',
  'ROMANIA': 'ro',
  'BULGARIA': 'bg',
  'CROATIA': 'hr',
  'SERBIA': 'rs',
  'SLOVENIA': 'si',
  'FINLAND': 'fi',
  'ICELAND': 'is',
  'LUXEMBOURG': 'lu',
  'RUSSIA': 'ru',
  'TURKEY': 'tr',
  'ISRAEL': 'il',
  'SAUDI ARABIA': 'sa',
  'UNITED ARAB EMIRATES': 'ae',
  'QATAR': 'qa',
  'KUWAIT': 'kw',
  'BAHRAIN': 'bh',
  'OMAN': 'om',
  'LEBANON': 'lb',
  'JORDAN': 'jo',
  'IRAN': 'ir',
  'IRAQ': 'iq',
  'PAKISTAN': 'pk',
  'BANGLADESH': 'bd',
  'SRI LANKA': 'lk',
  'AFGHANISTAN': 'af',
  'MYANMAR': 'mm',
  'CAMBODIA': 'kh',
  'LAOS': 'la',
  'MONGOLIA': 'mn',
  'NEPAL': 'np',
  'BHUTAN': 'bt'
}

export default function GuestCountryHeatmap({ data }: GuestCountryHeatmapProps) {
  const mapRef = useRef<HighchartsReact.RefObject>(null)
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const [mapLoaded, setMapLoaded] = useState(false)

  const { countryStats, mapData, totalGuests } = useMemo(() => {
    const stats: Record<string, CountryStats> = {}

    data.forEach(guest => {
      const country = guest['COUNTRY OF RESIDENCE'] || 'Unknown'
      const bedNights = typeof guest['BED NIGHTS'] === 'number' 
        ? guest['BED NIGHTS'] 
        : parseFloat(String(guest['BED NIGHTS'] || 0)) || 0

      if (!stats[country]) {
        stats[country] = {
          country,
          guestCount: 0,
          totalBedNights: 0,
          avgBedNights: 0
        }
      }

      stats[country].guestCount += 1
      stats[country].totalBedNights += bedNights
    })

    // Calculate averages
    Object.values(stats).forEach(stat => {
      stat.avgBedNights = stat.guestCount > 0 ? stat.totalBedNights / stat.guestCount : 0
    })

    // Convert to Highcharts map data format
    const mapDataPoints = Object.values(stats)
      .filter(stat => stat.country !== 'Unknown')
      .map(stat => {
        const normalizedCountry = normalizeCountryName(stat.country)
        const isoCode = countryToISOCode[normalizedCountry.toUpperCase()]
        
        if (!isoCode) {
          console.warn(`No ISO code mapping for country: ${stat.country} (normalized: ${normalizedCountry})`)
          return null
        }
        
        return {
          'hc-key': isoCode,
          value: stat.guestCount,
          name: stat.country,
          bedNights: stat.totalBedNights,
          avgStay: stat.avgBedNights
        }
      })
      .filter(item => item !== null)

    const sortedStats = Object.values(stats)
      .sort((a, b) => b.guestCount - a.guestCount)

    const total = data.length

    return {
      countryStats: sortedStats,
      mapData: mapDataPoints,
      totalGuests: total
    }
  }, [data])

  // Highcharts map options
  const chartOptions = useMemo(() => ({
    chart: {
      map: 'custom/world',
      backgroundColor: '#ffffff',
      height: 600,
      style: {
        fontFamily: 'inherit'
      }
    },
    title: {
      text: 'Guest Location',
      align: 'left',
      style: {
        fontSize: '18px',
        fontWeight: '600',
        color: '#111827'
      }
    },
    subtitle: {
      text: `${totalGuests.toLocaleString()} total guests`,
      align: 'right',
      style: {
        fontSize: '24px',
        fontWeight: '700',
        color: '#111827'
      }
    },
    mapNavigation: {
      enabled: true,
      buttonOptions: {
        verticalAlign: 'bottom'
      },
      mouseWheelZoom: false, // Disable default mouse wheel zoom - we'll handle it manually with Ctrl requirement
      enableMouseWheelZoom: false, // Additional flag to disable wheel zoom
      enableDoubleClickZoom: true, // Keep double-click zoom enabled
      enableButtons: true // Keep navigation buttons enabled
    },
    colorAxis: {
      min: 0,
      minColor: '#E0F2FE',
      maxColor: '#0EA5E9',
      labels: {
        style: {
          color: '#6B7280'
        }
      }
    },
    legend: {
      layout: 'horizontal',
      align: 'center',
      verticalAlign: 'bottom',
      enabled: false
    },
    tooltip: {
      backgroundColor: '#ffffff',
      borderColor: '#E5E7EB',
      borderRadius: 8,
      shadow: true,
      useHTML: true,
      formatter: function(this: any) {
        const point = this.point
        return `
          <div style="padding: 8px;">
            <div style="font-weight: 600; margin-bottom: 4px;">${point.name}</div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="width: 8px; height: 8px; background: #0EA5E9; border-radius: 50%; display: inline-block;"></span>
              <span style="color: #6B7280;">Guests:</span>
              <span style="font-weight: 600;">${point.value}</span>
            </div>
            ${point.bedNights ? `
              <div style="display: flex; align-items: center; gap: 8px; margin-top: 4px;">
                <span style="width: 8px; height: 8px; background: #22C55E; border-radius: 50%; display: inline-block;"></span>
                <span style="color: #6B7280;">Bed Nights:</span>
                <span style="font-weight: 600;">${point.bedNights.toLocaleString()}</span>
              </div>
            ` : ''}
          </div>
        `
      }
    },
    series: [{
      name: 'Guests',
      data: mapData,
      states: {
        hover: {
          color: '#0284C7',
          borderColor: '#0369A1'
        }
      },
      dataLabels: {
        enabled: false
      },
      nullColor: '#F3F4F6'
    }],
    credits: {
      enabled: false
    }
  }), [mapData, totalGuests])

  // Add Ctrl+Scroll zoom handler for Highcharts map
  useEffect(() => {
    if (!mapLoaded || !chartContainerRef.current) return

    let cleanup: (() => void) | null = null

    // Wait for chart to be rendered
    const checkChart = setInterval(() => {
      if (mapRef.current?.chart && chartContainerRef.current) {
        clearInterval(checkChart)
        
        const container = chartContainerRef.current
        const chart = mapRef.current.chart
        
        // Find the actual Highcharts container (SVG element)
        const chartContainer = chart.container
        const svgElement = chartContainer?.querySelector('svg') || chartContainer

        // Store original mapNavigation options
        const originalMapNav = { ...(chart.options.mapNavigation || {}) }
        let zoomEnabled = false
        
        // Enable/disable zoom based on Ctrl key state
        const handleKeyDown = (e: KeyboardEvent) => {
          if ((e.ctrlKey || e.metaKey) && !zoomEnabled) {
            zoomEnabled = true
            chart.update({
              mapNavigation: {
                ...originalMapNav,
                mouseWheelZoom: 'x'
              } as any
            }, false)
          }
        }
        
        const handleKeyUp = (e: KeyboardEvent) => {
          if (!e.ctrlKey && !e.metaKey && zoomEnabled) {
            zoomEnabled = false
            chart.update({
              mapNavigation: {
                ...originalMapNav,
                mouseWheelZoom: false
              } as any
            }, false)
          }
        }

        const handleWheel = (e: Event) => {
          // Cast to WheelEvent for type safety
          const wheelEvent = e as WheelEvent
          
          // Only allow zoom if Ctrl key (or Cmd on Mac) is pressed
          if (wheelEvent.ctrlKey || wheelEvent.metaKey) {
            // Ensure zoom is enabled
            if (!zoomEnabled) {
              zoomEnabled = true
              chart.update({
                mapNavigation: {
                  ...originalMapNav,
                  mouseWheelZoom: 'x'
                } as any
              }, false)
            }
            // Don't prevent default or stop propagation - let Highcharts handle it
            return
          } else {
            // When Ctrl is not pressed, completely prevent Highcharts from handling the event
            wheelEvent.preventDefault()
            wheelEvent.stopPropagation()
            wheelEvent.stopImmediatePropagation()
            
            // Disable zoom if it was enabled
            if (zoomEnabled) {
              zoomEnabled = false
              chart.update({
                mapNavigation: {
                  ...originalMapNav,
                  mouseWheelZoom: false
                } as any
              }, false)
          }
          
            // Manually scroll the window to allow page scrolling
            window.scrollBy({
              top: wheelEvent.deltaY,
              left: wheelEvent.deltaX,
              behavior: 'auto'
            })
          }
        }

        // Listen for Ctrl key state changes
        window.addEventListener('keydown', handleKeyDown)
        window.addEventListener('keyup', handleKeyUp)
        
        // Attach listeners to containers in capture phase
        // When Ctrl is pressed, we don't prevent, so Highcharts can handle it
        // When Ctrl is not pressed, we prevent and scroll the page
        container.addEventListener('wheel', handleWheel, { passive: false, capture: true })
        if (svgElement && svgElement !== container) {
          svgElement.addEventListener('wheel', handleWheel, { passive: false, capture: true })
        }
        if (chartContainer && chartContainer !== container && chartContainer !== svgElement) {
          chartContainer.addEventListener('wheel', handleWheel, { passive: false, capture: true })
        }

        cleanup = () => {
          window.removeEventListener('keydown', handleKeyDown)
          window.removeEventListener('keyup', handleKeyUp)
          container.removeEventListener('wheel', handleWheel, { capture: true } as any)
          if (svgElement && svgElement !== container) {
            svgElement.removeEventListener('wheel', handleWheel, { capture: true } as any)
          }
          if (chartContainer && chartContainer !== container && chartContainer !== svgElement) {
            chartContainer.removeEventListener('wheel', handleWheel, { capture: true } as any)
          }
          // Reset zoom state
          if (zoomEnabled) {
            chart.update({
              mapNavigation: {
                ...originalMapNav,
                mouseWheelZoom: false
              } as any
            }, false)
          }
        }
      }
    }, 100)

    return () => {
      clearInterval(checkChart)
      if (cleanup) cleanup()
    }
  }, [mapLoaded])

  // Load world map topology
  useEffect(() => {
    const loadMapData = async () => {
      try {
        // Fetch the world map topology
        const response = await fetch('https://code.highcharts.com/mapdata/custom/world.geo.json')
        const topology = await response.json()
        Highcharts.maps['custom/world'] = topology
        setMapLoaded(true)
      } catch (error) {
        console.error('Error loading map data:', error)
        // Try alternative CDN
        try {
          const altResponse = await fetch('https://cdn.jsdelivr.net/npm/@highcharts/map-collection@2.1.0/custom/world.geo.json')
          const altTopology = await altResponse.json()
          Highcharts.maps['custom/world'] = altTopology
          setMapLoaded(true)
        } catch (altError) {
          console.error('Error loading map data from alternative CDN:', altError)
        }
      }
    }
    loadMapData()
  }, [])

  const maxGuests = Math.max(...countryStats.map(s => s.guestCount), 1)

  const getColorIntensity = (count: number) => {
    const intensity = (count / maxGuests) * 100
    if (intensity >= 75) return 'bg-primary-800'
    if (intensity >= 50) return 'bg-primary-600'
    if (intensity >= 25) return 'bg-primary-400'
    if (intensity >= 10) return 'bg-primary-200'
    return 'bg-primary-100'
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
    >
      {/* Highcharts Map */}
      <div className="mb-6">
        {!mapLoaded ? (
          <div className="flex items-center justify-center h-96 bg-gray-50 rounded-lg">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading world map...</p>
            </div>
          </div>
        ) : (
          <div ref={chartContainerRef}>
            <HighchartsReact
              highcharts={Highcharts}
              constructorType={'mapChart'}
              options={chartOptions}
              ref={mapRef}
            />
          </div>
        )}
      </div>

      {/* Top Countries Grid - Compact */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        {countryStats.slice(0, 12).map((stat, index) => (
          <div
            key={stat.country}
            className={`${getColorIntensity(stat.guestCount)} rounded-lg p-3 transition-all hover:shadow-md`}
          >
            <div className="flex flex-col">
              <p className={`text-xs font-medium truncate ${
                stat.guestCount / maxGuests >= 0.5 ? 'text-white' : 'text-gray-900'
              }`}>
                {index + 1}. {stat.country}
              </p>
              <p className={`text-xl font-bold mt-1 ${
                stat.guestCount / maxGuests >= 0.5 ? 'text-white' : 'text-gray-900'
              }`}>
                {stat.guestCount}
              </p>
              <div className="flex items-center justify-between mt-1">
                <p className={`text-xs ${
                  stat.guestCount / maxGuests >= 0.5 ? 'text-white/80' : 'text-gray-600'
                }`}>
                  Avg: {stat.avgBedNights.toFixed(1)}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* All Countries List */}
      {countryStats.length > 12 && (
        <div className="mt-6 pt-6 border-t border-gray-200">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">All Countries</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {countryStats.slice(12).map(stat => (
              <div key={stat.country} className="text-sm text-gray-600">
                {stat.country}: {stat.guestCount}
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  )
}

