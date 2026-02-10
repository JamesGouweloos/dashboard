import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'

const dataFilePath = path.join(process.cwd(), 'public', 'map_pins.json')

type PinType = 'lodge' | 'camp' | 'airstrip' | 'landmark' | 'river' | 'feature'

interface MapPinPayload {
  name: string
  type: PinType
  description?: string
  location: {
    lat: number
    lng: number
  }
}

const VALID_PIN_TYPES: PinType[] = ['lodge', 'camp', 'airstrip', 'landmark', 'river', 'feature']

async function ensureDataFile() {
  const publicDir = path.join(process.cwd(), 'public')
  try {
    await fs.access(publicDir)
  } catch {
    await fs.mkdir(publicDir, { recursive: true })
  }

  try {
    await fs.access(dataFilePath)
  } catch {
    await fs.writeFile(dataFilePath, JSON.stringify([], null, 2))
  }
}

export async function GET() {
  try {
    await ensureDataFile()
    const data = await fs.readFile(dataFilePath, 'utf-8')
    const pins = JSON.parse(data)
    return NextResponse.json(pins)
  } catch (error) {
    console.error('Error reading map pins:', error)
    return NextResponse.json([], { status: 200 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureDataFile()
    const body: MapPinPayload = await request.json()

    if (!body.name || !body.location) {
      return NextResponse.json({ message: 'Missing required fields' }, { status: 400 })
    }

    if (!VALID_PIN_TYPES.includes(body.type)) {
      return NextResponse.json({ message: 'Invalid pin type supplied' }, { status: 400 })
    }

    const lat = parseFloat(String(body.location.lat))
    const lng = parseFloat(String(body.location.lng))

    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      return NextResponse.json({ message: 'Invalid coordinates provided' }, { status: 400 })
    }

    const fileData = await fs.readFile(dataFilePath, 'utf-8')
    const pins = JSON.parse(fileData)

    const newPin = {
      id: `pin-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: body.name.trim(),
      type: body.type,
      description: body.description?.trim() || '',
      lat,
      lng,
      createdAt: new Date().toISOString(),
    }

    pins.push(newPin)
    await fs.writeFile(dataFilePath, JSON.stringify(pins, null, 2))

    return NextResponse.json(newPin, { status: 201 })
  } catch (error) {
    console.error('Error saving map pin:', error)
    return NextResponse.json({ message: 'Failed to save map pin' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    await ensureDataFile()
    const body = await request.json()
    const { id, name, type, description, location } = body

    if (!id) {
      return NextResponse.json({ message: 'Missing pin ID' }, { status: 400 })
    }

    if (!name || !location) {
      return NextResponse.json({ message: 'Missing required fields' }, { status: 400 })
    }

    if (!VALID_PIN_TYPES.includes(type)) {
      return NextResponse.json({ message: 'Invalid pin type supplied' }, { status: 400 })
    }

    const lat = parseFloat(String(location.lat))
    const lng = parseFloat(String(location.lng))

    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      return NextResponse.json({ message: 'Invalid coordinates provided' }, { status: 400 })
    }

    const fileData = await fs.readFile(dataFilePath, 'utf-8')
    const pins = JSON.parse(fileData)

    const pinIndex = pins.findIndex((p: any) => p.id === id)
    if (pinIndex === -1) {
      return NextResponse.json({ message: 'Pin not found' }, { status: 404 })
    }

    pins[pinIndex] = {
      ...pins[pinIndex],
      name: name.trim(),
      type,
      description: description?.trim() || '',
      lat,
      lng,
      updatedAt: new Date().toISOString(),
    }

    await fs.writeFile(dataFilePath, JSON.stringify(pins, null, 2))

    return NextResponse.json(pins[pinIndex], { status: 200 })
  } catch (error) {
    console.error('Error updating map pin:', error)
    return NextResponse.json({ message: 'Failed to update map pin' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await ensureDataFile()
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ message: 'Missing pin ID' }, { status: 400 })
    }

    const fileData = await fs.readFile(dataFilePath, 'utf-8')
    const pins = JSON.parse(fileData)

    const pinIndex = pins.findIndex((p: any) => p.id === id)
    if (pinIndex === -1) {
      return NextResponse.json({ message: 'Pin not found' }, { status: 404 })
    }

    pins.splice(pinIndex, 1)
    await fs.writeFile(dataFilePath, JSON.stringify(pins, null, 2))

    return NextResponse.json({ message: 'Pin deleted successfully' }, { status: 200 })
  } catch (error) {
    console.error('Error deleting map pin:', error)
    return NextResponse.json({ message: 'Failed to delete map pin' }, { status: 500 })
  }
}
