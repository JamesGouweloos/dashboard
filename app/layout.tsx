import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/lib/auth'
import { promises as fs } from 'fs'
import path from 'path'

const inter = Inter({ subsets: ['latin'] })

async function loadBrandingIcon(): Promise<string> {
  const defaultIcon = '/favicon.svg'
  try {
    const file = await fs.readFile(
      path.join(process.cwd(), 'public', 'branding', 'branding.json'),
      'utf-8'
    )
    const branding = JSON.parse(file) as {
      faviconPath?: string | null
      faviconVersion?: number
    }
    if (branding?.faviconPath) {
      const version = branding?.faviconVersion
      return version ? `${branding.faviconPath}?v=${version}` : branding.faviconPath
    }
  } catch {
    // ignore and return default
  }
  return defaultIcon
}

export async function generateMetadata(): Promise<Metadata> {
  const iconUrl = await loadBrandingIcon()

  return {
  title: "Baines' River Camp Dashboard",
  description: "Central operations and performance insights for Baines' River Camp.",
  icons: {
      icon: [{ url: iconUrl }],
  },
  }
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}

