import { NextRequest, NextResponse } from 'next/server'
import { mkdir, readFile, writeFile, unlink } from 'fs/promises'
import path from 'path'

const brandingDir = path.join(process.cwd(), 'public', 'branding')
const brandingConfigPath = path.join(brandingDir, 'branding.json')

interface BrandingConfig {
  logoPath: string | null
  logoVersion?: number
  faviconPath: string | null
  faviconVersion?: number
  updatedAt: string | null
}

const allowedLogoMimeTypes = [
  'image/png',
  'image/svg+xml',
  'image/jpeg',
  'image/webp',
]

const allowedFaviconMimeTypes = [
  'image/png',
  'image/svg+xml',
  'image/x-icon',
  'image/vnd.microsoft.icon',
]

function getExtension(filename: string, mimeType: string): string {
  const existing = path.extname(filename)
  if (existing) return existing.toLowerCase()

  switch (mimeType) {
    case 'image/png':
      return '.png'
    case 'image/svg+xml':
      return '.svg'
    case 'image/jpeg':
      return '.jpg'
    case 'image/webp':
      return '.webp'
    case 'image/x-icon':
    case 'image/vnd.microsoft.icon':
      return '.ico'
    default:
      return ''
  }
}

async function ensureBrandingConfig(): Promise<BrandingConfig> {
  try {
    await mkdir(brandingDir, { recursive: true })
    const file = await readFile(brandingConfigPath, 'utf-8')
    return JSON.parse(file) as BrandingConfig
  } catch {
    const defaultConfig: BrandingConfig = {
      logoPath: null,
      logoVersion: 0,
      faviconPath: '/favicon.svg',
      faviconVersion: 0,
      updatedAt: null,
    }
    await writeFile(brandingConfigPath, JSON.stringify(defaultConfig, null, 2))
    return defaultConfig
  }
}

async function removePreviousAsset(assetPath?: string | null) {
  if (!assetPath) return
  const normalized = assetPath.startsWith('/')
    ? assetPath.slice(1)
    : assetPath
  const fullPath = path.join(process.cwd(), 'public', normalized)
  try {
    await unlink(fullPath)
  } catch {
    // Ignore missing files
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const type = formData.get('type')
    const file = formData.get('file') as File | null

    if (!type || (type !== 'logo' && type !== 'favicon')) {
      return NextResponse.json(
        { message: 'Invalid branding type provided' },
        { status: 400 }
      )
    }

    if (!file) {
      return NextResponse.json(
        { message: 'No file uploaded' },
        { status: 400 }
      )
    }

    const mimeType = file.type
    const fileName = file.name

    if (
      type === 'logo' &&
      !allowedLogoMimeTypes.includes(mimeType)
    ) {
      return NextResponse.json(
        { message: 'Unsupported logo file type. Please upload PNG, JPG, WEBP, or SVG.' },
        { status: 400 }
      )
    }

    if (
      type === 'favicon' &&
      !allowedFaviconMimeTypes.includes(mimeType)
    ) {
      return NextResponse.json(
        { message: 'Unsupported favicon file type. Please upload ICO, PNG, or SVG.' },
        { status: 400 }
      )
    }

    const extension = getExtension(fileName, mimeType)
    if (!extension) {
      return NextResponse.json(
        { message: 'Could not determine file extension.' },
        { status: 400 }
      )
    }

    const branding = await ensureBrandingConfig()
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const assetFileName = `${type}${extension}`
    const assetFullPath = path.join(brandingDir, assetFileName)
    const publicPath = `/branding/${assetFileName}`

    if (type === 'logo' && branding.logoPath && branding.logoPath !== publicPath) {
      await removePreviousAsset(branding.logoPath)
    }

    if (type === 'favicon' && branding.faviconPath && branding.faviconPath !== publicPath) {
      await removePreviousAsset(branding.faviconPath)
    }

    await writeFile(assetFullPath, buffer)

    const now = new Date().toISOString()
    const updatedConfig: BrandingConfig = {
      ...branding,
      updatedAt: now,
      logoPath: type === 'logo' ? publicPath : branding.logoPath,
      logoVersion: type === 'logo' ? Date.now() : branding.logoVersion ?? 0,
      faviconPath: type === 'favicon' ? publicPath : branding.faviconPath,
      faviconVersion: type === 'favicon' ? Date.now() : branding.faviconVersion ?? 0,
    }

    await writeFile(brandingConfigPath, JSON.stringify(updatedConfig, null, 2))

    return NextResponse.json({
      message: `${type === 'logo' ? 'Logo' : 'Favicon'} updated successfully.`,
      branding: updatedConfig,
    })
  } catch (error) {
    console.error('Error updating branding asset:', error)
    return NextResponse.json(
      { message: 'Failed to update branding asset.' },
      { status: 500 }
    )
  }
}

