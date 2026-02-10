import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

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

/**
 * Fetches weather data from OpenWeatherMap API
 * Supports both current weather and historical weather data (paid plan)
 * Get your API key from: https://openweathermap.org/api
 * 
 * Parameters:
 * - lat, lng: Required - Location coordinates
 * - date: Optional - Date in YYYY-MM-DD format for historical data
 * - time: Optional - Time in HH:MM format (24-hour) for historical data
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const lat = searchParams.get('lat')
    const lng = searchParams.get('lng')
    const date = searchParams.get('date') // Optional: YYYY-MM-DD format
    const time = searchParams.get('time') // Optional: HH:MM format (24-hour)

    if (!lat || !lng) {
      return NextResponse.json(
        { message: 'Missing required parameters: lat and lng' },
        { status: 400 }
      )
    }

    // Get API key from environment variables
    const apiKey = process.env.OPENWEATHER_API_KEY
    
    console.log('Weather API called with lat:', lat, 'lng:', lng, 'date:', date, 'time:', time)
    console.log('API Key present:', !!apiKey)
    console.log('API Key first 10 chars:', apiKey ? apiKey.substring(0, 10) + '...' : 'NOT SET')
    
    if (!apiKey) {
      console.error('OPENWEATHER_API_KEY is not set in environment variables')
      return NextResponse.json(
        { 
          message: 'Weather API is not configured. Please set OPENWEATHER_API_KEY in your environment variables.',
          error: 'API_KEY_MISSING'
        },
        { status: 500 }
      )
    }

    let apiUrl: string
    let isHistorical = false

    // If date is provided, use Historical Weather Data API (paid plan)
    if (date) {
      isHistorical = true
      
      // Parse date and time to create Unix timestamp
      let dateTime: Date
      try {
        if (time) {
          // Combine date and time: YYYY-MM-DD HH:MM
          const dateTimeString = `${date} ${time}`
          dateTime = new Date(dateTimeString)
        } else {
          // If no time provided, use noon UTC
          dateTime = new Date(`${date} 12:00`)
        }
        
        // Convert to Unix timestamp (seconds since epoch)
        const unixTimestamp = Math.floor(dateTime.getTime() / 1000)
        
        console.log('Fetching historical weather for timestamp:', unixTimestamp, 'Date:', dateTime.toISOString())
        
        // One Call API 3.0 Historical Weather endpoint
        // Using the correct endpoint format: /data/3.0/onecall/timemachine
        apiUrl = `https://api.openweathermap.org/data/3.0/onecall/timemachine?lat=${lat}&lon=${lng}&dt=${unixTimestamp}&appid=${apiKey}&units=metric`
      } catch (error) {
        console.error('Error parsing date/time:', error)
        return NextResponse.json(
          { 
            message: 'Invalid date or time format. Use YYYY-MM-DD for date and HH:MM for time.',
            error: 'INVALID_DATE_FORMAT'
          },
          { status: 400 }
        )
      }
    } else {
      // Current weather API endpoint
      apiUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&appid=${apiKey}&units=metric`
    }

    console.log('API URL:', isHistorical ? 'Historical' : 'Current', apiUrl.replace(apiKey, 'API_KEY_HIDDEN'))

    const response = await fetch(apiUrl)

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('OpenWeatherMap API error:', errorData)
      
      if (response.status === 401) {
        return NextResponse.json(
          { 
            message: 'Invalid API key. Please check your OPENWEATHER_API_KEY.',
            error: 'INVALID_API_KEY'
          },
          { status: 401 }
        )
      }
      
      return NextResponse.json(
        { 
          message: 'Failed to fetch weather data',
          error: 'WEATHER_API_ERROR',
          details: errorData
        },
        { status: response.status }
      )
    }

    const data = await response.json()
    console.log('OpenWeatherMap API response received:', JSON.stringify(data).substring(0, 500))

    // Historical API returns data in a different structure
    let weatherInfo: any
    let mainInfo: any
    let windInfo: any
    let cloudsInfo: any
    let visibility: number

    if (isHistorical) {
      // One Call API 3.0 Historical structure: data.data[0] contains the weather data
      // Response format: { lat, lon, timezone, timezone_offset, data: [{ dt, temp, feels_like, pressure, humidity, wind_speed, wind_deg, weather, ... }] }
      if (!data.data || !Array.isArray(data.data) || data.data.length === 0) {
        console.error('Invalid historical weather API response structure:', JSON.stringify(data).substring(0, 500))
        throw new Error('Invalid historical weather data structure received from API. Expected data.data array.')
      }
      
      // Get the first (and typically only) data point for the requested timestamp
      const historicalData = data.data[0]
      
      if (!historicalData.weather || !historicalData.weather[0]) {
        console.error('Invalid weather data point structure:', JSON.stringify(historicalData).substring(0, 500))
        throw new Error('Invalid weather data point structure in historical API response')
      }
      
      // One Call API 3.0 uses different field names (temp instead of main.temp, etc.)
      mainInfo = {
        temp: historicalData.temp,
        feels_like: historicalData.feels_like,
        pressure: historicalData.pressure,
        humidity: historicalData.humidity
      }
      windInfo = {
        speed: historicalData.wind_speed,
        deg: historicalData.wind_deg
      }
      cloudsInfo = { all: historicalData.clouds }
      visibility = historicalData.visibility || 0
      weatherInfo = historicalData.weather[0] // Get the weather condition object
    } else {
      // Current weather API structure
      if (!data.main || !data.weather || !data.weather[0]) {
        console.error('Invalid OpenWeatherMap API response structure:', data)
        throw new Error('Invalid weather data structure received from API')
      }
      weatherInfo = data.weather[0]
      mainInfo = data.main
      windInfo = data.wind
      cloudsInfo = data.clouds
      visibility = data.visibility || 0
    }

    // Transform OpenWeatherMap response to our format
    const weatherData: WeatherData = {
      temperature: Math.round((mainInfo.temp || 0) * 10) / 10, // Round to 1 decimal
      feelsLike: Math.round((mainInfo.feels_like || mainInfo.temp || 0) * 10) / 10,
      humidity: mainInfo.humidity || 0,
      pressure: mainInfo.pressure || 0,
      windSpeed: Math.round((windInfo?.speed || 0) * 10) / 10, // m/s
      windDirection: windInfo?.deg || 0,
      visibility: visibility ? Math.round(visibility / 1000 * 10) / 10 : 0, // Convert to km
      clouds: cloudsInfo?.all || 0,
      conditions: weatherInfo.main || 'Unknown',
      description: weatherInfo.description || 'No description',
      icon: weatherInfo.icon || '01d',
    }
    
    console.log('Transformed weather data:', JSON.stringify(weatherData))

    return NextResponse.json(weatherData, { status: 200 })
  } catch (error: any) {
    console.error('Error fetching weather data:', error)
    console.error('Error message:', error?.message)
    console.error('Error stack:', error?.stack)
    return NextResponse.json(
      { 
        message: 'Failed to fetch weather data',
        error: 'INTERNAL_ERROR',
        details: error?.message || 'Unknown error'
      },
      { status: 500 }
    )
  }
}

