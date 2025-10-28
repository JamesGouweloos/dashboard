import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), 'dashboard_data.json')
    
    if (!fs.existsSync(filePath)) {
      return NextResponse.json(
        { error: 'Data file not found. Please run: python process_booking_data.py' },
        { status: 404 }
      )
    }

    const fileContents = fs.readFileSync(filePath, 'utf8')
    const data = JSON.parse(fileContents)

    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to load data' },
      { status: 500 }
    )
  }
}

