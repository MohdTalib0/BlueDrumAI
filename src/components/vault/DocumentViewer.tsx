import { useState, useEffect } from 'react'
import { FileText, Loader2, AlertCircle, Maximize2, Download, X } from 'lucide-react'

interface DocumentViewerProps {
  fileUrl: string
  mimeType?: string
  fileName?: string
}

export default function DocumentViewer({ fileUrl, mimeType, fileName }: DocumentViewerProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [textContent, setTextContent] = useState<string | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)

  const isPDF = mimeType === 'application/pdf' || fileName?.endsWith('.pdf')
  const isText = mimeType?.startsWith('text/') || fileName?.endsWith('.txt')
  const isImage = mimeType?.startsWith('image/')
  const isOfficeDoc =
    mimeType?.includes('wordprocessingml') ||
    mimeType?.includes('msword') ||
    fileName?.match(/\.(doc|docx)$/i)

  useEffect(() => {
    setLoading(true)
    setError(null)

    // Load text files
    if (isText) {
      fetch(fileUrl)
        .then((res) => {
          if (!res.ok) throw new Error('Failed to load text file')
          return res.text()
        })
        .then((text) => {
          setTextContent(text)
          setLoading(false)
        })
        .catch((err) => {
          setError(err.message || 'Failed to load text file')
          setLoading(false)
        })
    } else {
      setLoading(false)
    }
  }, [fileUrl, isText])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false)
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        // Allow browser's find functionality
        return
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isFullscreen])

  // Image viewer with fullscreen support
  if (isImage) {
    return (
      <div className="relative flex items-center justify-center">
        <div className="relative group">
          <img
            src={fileUrl}
            alt={fileName || 'Preview'}
            className="max-h-[70vh] max-w-full rounded-lg object-contain shadow-lg"
            onLoad={() => setLoading(false)}
            onError={() => {
              setError('Failed to load image')
              setLoading(false)
            }}
          />
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg">
            <button
              onClick={() => setIsFullscreen(true)}
              className="rounded-lg bg-white/90 p-2 text-gray-700 hover:bg-white transition-colors"
              title="Fullscreen (F11)"
            >
              <Maximize2 className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Fullscreen Image Modal */}
        {isFullscreen && (
          <div
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/95 p-4"
            onClick={() => setIsFullscreen(false)}
          >
            <div className="relative max-h-full max-w-full" onClick={(e) => e.stopPropagation()}>
              <img
                src={fileUrl}
                alt={fileName || 'Preview'}
                className="max-h-[95vh] max-w-full rounded-lg object-contain"
              />
              <button
                onClick={() => setIsFullscreen(false)}
                className="absolute right-4 top-4 rounded-lg bg-white/90 p-2 text-gray-700 hover:bg-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        )}

        {loading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
          </div>
        )}
      </div>
    )
  }

  // PDF viewer - Simple iframe (browser native, no worker needed!)
  if (isPDF) {
    return (
      <div className="flex flex-col">
        <div className="relative flex h-[70vh] items-center justify-center overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
          <iframe
            src={`${fileUrl}#toolbar=1&navpanes=1&scrollbar=1`}
            className="h-full w-full rounded-lg"
            title="PDF Viewer"
            allowFullScreen
            loading="lazy"
            onLoad={() => setLoading(false)}
            onError={() => {
              setError('Failed to load PDF')
              setLoading(false)
            }}
          />
          {loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm">
              <Loader2 className="mb-2 h-8 w-8 animate-spin text-primary-600" />
              <p className="text-sm text-gray-600">Loading PDF...</p>
            </div>
          )}
          {error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm">
              <AlertCircle className="mb-2 h-8 w-8 text-red-500" />
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}
        </div>
        <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
          <span>Tip: Use browser controls to zoom, navigate pages, and search within the PDF</span>
          <a
            href={fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            download={fileName}
            className="inline-flex items-center gap-1 text-primary-600 hover:text-primary-700 font-medium"
          >
            <Download className="h-3.5 w-3.5" />
            Open in new tab
          </a>
        </div>
      </div>
    )
  }

  // Text file viewer
  if (isText && textContent !== null) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white">
        <div className="max-h-[70vh] overflow-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary-600" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12">
              <AlertCircle className="mb-2 h-8 w-8 text-red-500" />
              <p className="text-sm text-red-600">{error}</p>
            </div>
          ) : (
            <pre className="whitespace-pre-wrap font-mono text-sm text-gray-800">{textContent}</pre>
          )}
        </div>
      </div>
    )
  }

  // Office documents - use Microsoft Office Online viewer
  if (isOfficeDoc) {
    const viewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(fileUrl)}`
    return (
      <div className="relative flex min-h-[70vh] items-center justify-center rounded-lg border border-gray-200 bg-gray-50">
        <iframe
          src={viewerUrl}
          className="h-[70vh] w-full rounded-lg"
          title="Document Viewer"
          allowFullScreen
          loading="lazy"
          onLoad={() => setLoading(false)}
          onError={() => {
            setError('Failed to load document')
            setLoading(false)
          }}
        />
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm rounded-lg">
            <Loader2 className="mb-2 h-6 w-6 animate-spin text-primary-600" />
            <p className="text-sm text-gray-600">Loading document...</p>
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm rounded-lg">
            <AlertCircle className="mb-2 h-8 w-8 text-red-500" />
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}
      </div>
    )
  }

  // Fallback: Show download option
  return (
    <div className="flex h-64 flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50">
      <FileText className="mb-4 h-12 w-12 text-gray-400" />
      <p className="mb-2 text-sm font-medium text-gray-600">Preview not available</p>
      <p className="mb-4 text-xs text-gray-500">This file type cannot be previewed in the browser</p>
      <a
        href={fileUrl}
        target="_blank"
        rel="noopener noreferrer"
        download={fileName}
        className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 transition-colors"
      >
        <Download className="h-4 w-4" />
        Download to view
      </a>
    </div>
  )
}
