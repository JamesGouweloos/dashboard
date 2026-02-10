'use client'

import { useEffect, useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { Image as ImageIcon, RefreshCw, CheckCircle, AlertCircle, UploadCloud } from 'lucide-react'

interface BrandingState {
  logoPath: string | null
  logoVersion?: number
  faviconPath: string | null
  faviconVersion?: number
}

type UploadKind = 'logo' | 'favicon'

interface UploadStatusState {
  status: 'idle' | 'uploading' | 'success' | 'error'
  message: string
  target: UploadKind | null
}

export default function BrandAssetUpload() {
  const [branding, setBranding] = useState<BrandingState | null>(null)
  const [uploadState, setUploadState] = useState<UploadStatusState>({
    status: 'idle',
    message: '',
    target: null,
  })

  const logoInputRef = useRef<HTMLInputElement>(null)
  const faviconInputRef = useRef<HTMLInputElement>(null)

  const fetchBranding = async () => {
    try {
      const response = await fetch(`/branding/branding.json?ts=${Date.now()}`)
      if (response.ok) {
        const data = await response.json()
        setBranding(data)
      }
    } catch (error) {
      console.error('Failed to load branding configuration:', error)
    }
  }

  useEffect(() => {
    fetchBranding()
  }, [])

  const handleUpload = async (kind: UploadKind, file: File) => {
    setUploadState({ status: 'uploading', message: '', target: kind })

    const formData = new FormData()
    formData.append('type', kind)
    formData.append('file', file)

    try {
      const response = await fetch('/api/site-branding', {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result?.message || 'Upload failed')
      }

      setUploadState({
        status: 'success',
        message: result?.message || `${kind === 'logo' ? 'Logo' : 'Favicon'} updated successfully.`,
        target: kind,
      })

      if (result?.branding) {
        setBranding(result.branding)
      } else {
        fetchBranding()
      }
    } catch (error: any) {
      setUploadState({
        status: 'error',
        message: error?.message || 'Failed to upload asset.',
        target: kind,
      })
    } finally {
      setTimeout(() => {
        setUploadState(prev => (prev.status === 'uploading' ? prev : { ...prev, target: null }))
      }, 3000)
    }
  }

  const triggerFileDialog = (kind: UploadKind) => {
    if (kind === 'logo') {
      logoInputRef.current?.click()
    } else {
      faviconInputRef.current?.click()
    }
  }

  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>, kind: UploadKind) => {
    const file = event.target.files?.[0]
    if (!file) return
    handleUpload(kind, file)
  }

  const renderPreview = (src: string | null | undefined, kind: UploadKind) => {
    if (!src) {
      return (
        <div className="flex flex-col items-center justify-center h-36 bg-gray-50 border border-dashed border-gray-300 rounded-lg text-gray-500 text-sm">
          <ImageIcon className="h-8 w-8 mb-2 text-gray-400" />
          <span>No {kind === 'logo' ? 'logo' : 'favicon'} set</span>
        </div>
      )
    }

    const version = kind === 'logo' ? branding?.logoVersion : branding?.faviconVersion
    const displaySrc = version ? `${src}?v=${version}` : src

    return (
      <div className="flex items-center justify-center h-36 bg-white border border-gray-200 rounded-lg p-4">
        <img
          src={displaySrc}
          alt={kind === 'logo' ? 'Site logo' : 'Site favicon'}
          className={kind === 'logo' ? 'max-h-24 w-auto object-contain' : 'h-16 w-16 object-contain'}
        />
      </div>
    )
  }

  const StatusIcon = () => {
    if (uploadState.status === 'uploading') {
      return <RefreshCw className="h-4 w-4 animate-spin" />
    }
    if (uploadState.status === 'success') {
      return <CheckCircle className="h-4 w-4" />
    }
    if (uploadState.status === 'error') {
      return <AlertCircle className="h-4 w-4" />
    }
    return null
  }

  const renderStatusBar = (kind: UploadKind) => {
    if (uploadState.target !== kind || uploadState.status === 'idle') return null

    const baseClasses = {
      uploading: 'bg-blue-50 text-blue-700 border border-blue-200',
      success: 'bg-green-50 text-green-700 border border-green-200',
      error: 'bg-red-50 text-red-700 border border-red-200',
    }[uploadState.status]

    return (
      <div className={`mt-3 px-3 py-2 rounded-lg text-sm flex items-center space-x-2 ${baseClasses}`}>
        <StatusIcon />
        <span>{uploadState.message}</span>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
    >
      <div className="flex items-center space-x-2 mb-4">
        <UploadCloud className="h-5 w-5 text-primary-600" />
        <h2 className="text-xl font-semibold text-gray-900">Brand Assets</h2>
      </div>
      <p className="text-sm text-gray-600 mb-6">
        Upload your organization’s logo and favicon to personalise the dashboard. Accepted formats: PNG, JPG, WEBP, and SVG for logos;
        ICO, PNG, and SVG for favicons.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-2">Logo</h3>
          {renderPreview(branding?.logoPath || null, 'logo')}

          <input
            ref={logoInputRef}
            type="file"
            accept="image/png,image/svg+xml,image/jpeg,image/webp"
            className="hidden"
            onChange={(event) => handleFileInputChange(event, 'logo')}
          />
          <button
            onClick={() => triggerFileDialog('logo')}
            className="mt-4 inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
          >
            Upload Logo
          </button>

          {renderStatusBar('logo')}
        </div>

        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-2">Favicon</h3>
          {renderPreview(branding?.faviconPath || null, 'favicon')}

          <input
            ref={faviconInputRef}
            type="file"
            accept="image/png,image/svg+xml,image/x-icon,image/vnd.microsoft.icon"
            className="hidden"
            onChange={(event) => handleFileInputChange(event, 'favicon')}
          />
          <button
            onClick={() => triggerFileDialog('favicon')}
            className="mt-4 inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
          >
            Upload Favicon
          </button>

          {renderStatusBar('favicon')}
        </div>
      </div>
    </motion.div>
  )
}

