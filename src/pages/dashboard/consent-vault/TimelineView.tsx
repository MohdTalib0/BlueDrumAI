import { useEffect, useState, useMemo, useCallback, useRef } from 'react'
import { useAuth } from '../../../context/AuthContext'
import {
  Shield,
  FileText,
  Image,
  Trash2,
  Download,
  Search,
  Filter,
  X,
  Eye,
  FileCheck,
  Receipt,
  File,
  ChevronDown,
  AlertCircle,
  Loader2,
  Upload,
  Grid3x3,
  List,
  SortAsc,
  SortDesc,
  CheckSquare,
  Square,
  RefreshCw,
  Lock,
  Hash,
  Calendar,
  Camera,
  MapPin,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import DocumentViewer from '../../../components/vault/DocumentViewer'
import { DashboardLayout } from '../../../layouts/DashboardLayout'
import ExportButton from '../../../components/export/ExportButton'
import { getEdgeFunctionUrl, getAuthHeadersWithSession } from '../../../lib/api'
import { decryptFile } from '../../../lib/encryption/clientEncryption'
import ConfirmModal from '../../../components/ui/ConfirmModal'
import toast from 'react-hot-toast'

interface VaultEntry {
  id: string
  type: 'photo' | 'document' | 'ticket' | 'receipt' | 'other'
  file_url: string
  file_hash?: string
  encrypted?: boolean
  description?: string
  metadata?: {
    filename: string
    mimeType: string
    originalMimeType?: string
    size: number
    uploadedAt: string
    iv?: string
    exif?: {
      dateTaken?: string
      camera?: string
      gpsLatitude?: number
      gpsLongitude?: number
      orientation?: number
    }
    imageWidth?: number
    imageHeight?: number
  }
  created_at: string
}

type FilterType = 'all' | 'photo' | 'document' | 'ticket' | 'receipt' | 'other'
type ViewMode = 'grid' | 'list'
type SortOption = 'newest' | 'oldest' | 'name' | 'size'

function PreviewModal({
  entry,
  getDisplayUrl,
  getDecryptedUrl,
  onClose,
  getTypeIcon,
  getTypeLabel,
  formatFileSize: fmtSize,
}: {
  entry: VaultEntry
  getDisplayUrl: (e: VaultEntry) => string
  getDecryptedUrl: (e: VaultEntry) => Promise<string>
  onClose: () => void
  getTypeIcon: (type: string) => React.ReactNode
  getTypeLabel: (type: string) => string
  formatFileSize: (bytes: number) => string
}) {
  const [resolvedUrl, setResolvedUrl] = useState<string>('')
  const [decryptingLocal, setDecryptingLocal] = useState(false)

  useEffect(() => {
    let cancelled = false
    if (entry.encrypted) {
      const existing = getDisplayUrl(entry)
      if (existing) {
        setResolvedUrl(existing)
      } else {
        setDecryptingLocal(true)
        getDecryptedUrl(entry).then((url) => {
          if (!cancelled) {
            setResolvedUrl(url)
            setDecryptingLocal(false)
          }
        })
      }
    } else {
      setResolvedUrl(entry.file_url)
    }
    return () => { cancelled = true }
  }, [entry.id])

  const displayMimeType = entry.metadata?.originalMimeType || entry.metadata?.mimeType

  const handleDownload = async () => {
    const url = resolvedUrl || await getDecryptedUrl(entry)
    const a = document.createElement('a')
    a.href = url
    a.download = entry.metadata?.filename || 'download'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center bg-black/75 pt-14 sm:pt-16 px-2 sm:px-4 pb-2 sm:pb-4 backdrop-blur-sm overflow-y-auto overscroll-contain"
      onClick={onClose}
    >
      <div
        className="relative mb-4 sm:mb-8 w-full max-w-6xl rounded-lg sm:rounded-xl bg-white shadow-2xl overflow-hidden flex flex-col max-h-[calc(100vh-3.5rem)] sm:max-h-[calc(100vh-4rem)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-gray-200 bg-white px-4 py-3 sm:px-6 sm:py-4 shrink-0">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="shrink-0">{getTypeIcon(entry.type)}</div>
            <div className="min-w-0 flex-1">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900">{getTypeLabel(entry.type)}</h3>
              {entry.metadata?.filename && (
                <p className="text-xs text-gray-500 truncate max-w-[200px] sm:max-w-md">{entry.metadata.filename}</p>
              )}
            </div>
          </div>
          <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-4">
            {entry.encrypted && (
              <span className="inline-flex items-center gap-1 rounded-full bg-green-50 border border-green-200 px-2 py-0.5 text-xs font-medium text-green-700">
                <Lock className="h-3 w-3" /> Encrypted
              </span>
            )}
            {entry.metadata && (
              <div className="hidden sm:flex items-center gap-2 text-xs text-gray-500">
                <span>{fmtSize(entry.metadata.size)}</span>
                {displayMimeType && (
                  <>
                    <span>•</span>
                    <span className="uppercase">{displayMimeType.split('/')[1]}</span>
                  </>
                )}
              </div>
            )}
            <button
              onClick={onClose}
              className="flex h-10 w-10 sm:h-8 sm:w-8 items-center justify-center rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900 transition-colors touch-manipulation"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 min-h-0">
          {decryptingLocal ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary-600 mb-3" />
              <p className="text-sm text-gray-600">Decrypting file...</p>
            </div>
          ) : resolvedUrl ? (
            <div className="mb-4">
              <DocumentViewer
                fileUrl={resolvedUrl}
                mimeType={displayMimeType}
                fileName={entry.metadata?.filename}
              />
            </div>
          ) : null}

          {/* EXIF Info */}
          {entry.metadata?.exif && (
            <div className="mb-4 rounded-lg bg-blue-50 border border-blue-200 p-4">
              <h4 className="text-sm font-semibold text-blue-900 mb-2">Image Metadata (EXIF)</h4>
              <div className="grid grid-cols-2 gap-2 text-xs text-blue-800">
                {entry.metadata.exif.dateTaken && (
                  <div><span className="font-medium">Date Taken:</span> {entry.metadata.exif.dateTaken}</div>
                )}
                {entry.metadata.exif.camera && (
                  <div><span className="font-medium">Camera:</span> {entry.metadata.exif.camera}</div>
                )}
                {entry.metadata.exif.gpsLatitude && entry.metadata.exif.gpsLongitude && (
                  <div><span className="font-medium">GPS:</span> {entry.metadata.exif.gpsLatitude.toFixed(6)}, {entry.metadata.exif.gpsLongitude.toFixed(6)}</div>
                )}
                {entry.metadata.imageWidth && entry.metadata.imageHeight && (
                  <div><span className="font-medium">Dimensions:</span> {entry.metadata.imageWidth} x {entry.metadata.imageHeight}</div>
                )}
              </div>
            </div>
          )}

          {/* Hash */}
          {entry.file_hash && (
            <div className="mb-4 rounded-lg bg-gray-50 border border-gray-200 p-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-1">Evidence Integrity Hash (SHA-256)</h4>
              <code className="block text-xs text-gray-500 break-all font-mono">{entry.file_hash}</code>
            </div>
          )}

          {entry.description && (
            <div className="mb-4 rounded-lg bg-gray-50 p-4">
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{entry.description}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-gray-200 bg-gray-50 px-4 py-3 sm:px-6 sm:py-4 shrink-0">
          <span className="text-xs text-gray-500 text-center sm:text-left">{format(new Date(entry.created_at), 'PPP p')}</span>
          <button
            onClick={handleDownload}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 py-3 sm:py-2 text-sm font-medium text-white hover:bg-primary-700 transition-colors min-h-[44px] touch-manipulation w-full sm:w-auto"
          >
            <Download className="h-4 w-4" />
            Download File
          </button>
        </div>
      </div>
    </div>
  )
}

export default function TimelineView() {
  const { sessionToken, user } = useAuth()
  const navigate = useNavigate()
  const [entries, setEntries] = useState<VaultEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<FilterType>('all')
  const [showFilters, setShowFilters] = useState(false)
  const [previewEntry, setPreviewEntry] = useState<VaultEntry | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [sortBy, setSortBy] = useState<SortOption>('newest')
  const [showSortMenu, setShowSortMenu] = useState(false)
  const [retrying, setRetrying] = useState(false)
  const [decryptedUrls, setDecryptedUrls] = useState<Record<string, string>>({})
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: 'single'; id: string } | { type: 'bulk' } | null>(null)

  // Cleanup decrypted blob URLs on unmount
  const decryptedUrlsRef = useRef(decryptedUrls)
  decryptedUrlsRef.current = decryptedUrls
  useEffect(() => {
    return () => {
      Object.values(decryptedUrlsRef.current).forEach((url) => URL.revokeObjectURL(url))
    }
  }, [])

  /**
   * Decrypt an encrypted vault entry and return a usable blob URL
   */
  const getDecryptedUrl = useCallback(async (entry: VaultEntry): Promise<string> => {
    if (!entry.encrypted || !user?.id) return entry.file_url
    if (decryptedUrls[entry.id]) return decryptedUrls[entry.id]

    try {
      const response = await fetch(entry.file_url)
      if (!response.ok) throw new Error('Failed to fetch encrypted file')
      const encryptedBytes = await response.arrayBuffer()
      const decryptedBytes = await decryptFile(encryptedBytes, user.id)

      const mimeType = entry.metadata?.originalMimeType || entry.metadata?.mimeType || 'application/octet-stream'
      const blob = new Blob([decryptedBytes], { type: mimeType })
      const blobUrl = URL.createObjectURL(blob)

      setDecryptedUrls((prev) => ({ ...prev, [entry.id]: blobUrl }))
      return blobUrl
    } catch (err) {
      console.error('Decryption failed:', err)
      return entry.file_url
    }
  }, [user?.id, decryptedUrls])

  /**
   * Get the displayable URL for an entry (decrypted or plain)
   */
  const getDisplayUrl = (entry: VaultEntry): string => {
    if (!entry.encrypted) return entry.file_url
    return decryptedUrls[entry.id] || ''
  }

  useEffect(() => {
    const controller = new AbortController()
    loadEntries(controller.signal)
    
    return () => {
      controller.abort()
    }
  }, [])

  const loadEntries = useCallback(async (signal?: AbortSignal) => {
    try {
      setLoading(true)
      setError('')
      const token = sessionToken
      if (!token) {
        throw new Error('Not authenticated')
      }

      const headers = await getAuthHeadersWithSession()
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }

      const response = await fetch(`${getEdgeFunctionUrl('vault')}/entries`, {
        headers,
        signal,
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to load entries' }))
        console.error('Failed to load entries:', response.status, errorData)
        throw new Error(errorData.error || `Failed to load entries: ${response.statusText}`)
      }

      const data = await response.json()
      setEntries(data.entries || [])
      setSelectedIds(new Set()) // Clear selections on reload
    } catch (err: any) {
      if (err.name === 'AbortError') return
      console.error('Error loading entries:', err)
      setError(err.message || 'Failed to load entries')
    } finally {
      setLoading(false)
      setRetrying(false)
    }
  }, [sessionToken])

  const handleRetry = () => {
    setRetrying(true)
    loadEntries()
  }

  const requestDelete = (id: string) => setDeleteConfirm({ type: 'single', id })
  const requestBulkDelete = () => setDeleteConfirm({ type: 'bulk' })

  const handleDelete = async (id: string) => {
    setDeleteConfirm(null)
    const savedEntries = entries
    setDeletingId(id)
    setEntries(entries.filter((entry) => entry.id !== id))
    setSelectedIds((prev) => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
    if (previewEntry?.id === id) {
      setPreviewEntry(null)
    }

    try {
      const token = sessionToken
      if (!token) {
        throw new Error('Not authenticated')
      }

      const headers = await getAuthHeadersWithSession()
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }

      const response = await fetch(`${getEdgeFunctionUrl('vault')}/entry/${id}`, {
        method: 'DELETE',
        headers,
      })

      if (!response.ok) {
        throw new Error('Failed to delete entry')
      }
    } catch (err: any) {
      setEntries(savedEntries)
      toast.error(err.message || 'Failed to delete entry')
    } finally {
      setDeletingId(null)
    }
  }

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return
    setDeleteConfirm(null)
    const idsToDelete = Array.from(selectedIds)
    let successCount = 0
    let failCount = 0

    for (const id of idsToDelete) {
      try {
        const token = sessionToken
        if (!token) continue

        const { getEdgeFunctionUrl, getAuthHeadersWithSession } = await import('../../../lib/api.ts')
        const headers = await getAuthHeadersWithSession()
        if (token) {
          headers['Authorization'] = `Bearer ${token}`
        }
        const response = await fetch(`${getEdgeFunctionUrl('vault')}/entry/${id}`, {
          method: 'DELETE',
          headers,
        })

        if (response.ok) {
          successCount++
        } else {
          failCount++
        }
      } catch {
        failCount++
      }
    }

    // Reload entries
    await loadEntries()

    if (failCount > 0) {
      toast.error(`Deleted ${successCount} file(s). ${failCount} failed.`)
    } else {
      toast.success(`Deleted ${successCount} file(s)`)
    }
  }

  const handleSelectAll = () => {
    if (selectedIds.size === filteredEntries.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredEntries.map((e) => e.id)))
    }
  }

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'photo':
        return <Image className="h-5 w-5 text-blue-600" />
      case 'document':
        return <FileText className="h-5 w-5 text-green-600" />
      case 'ticket':
        return <FileCheck className="h-5 w-5 text-purple-600" />
      case 'receipt':
        return <Receipt className="h-5 w-5 text-orange-600" />
      default:
        return <File className="h-5 w-5 text-gray-600" />
    }
  }

  const getTypeLabel = (type: string) => {
    return type.charAt(0).toUpperCase() + type.slice(1)
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'photo':
        return 'bg-blue-50 text-blue-700 border-blue-200'
      case 'document':
        return 'bg-green-50 text-green-700 border-green-200'
      case 'ticket':
        return 'bg-purple-50 text-purple-700 border-purple-200'
      case 'receipt':
        return 'bg-orange-50 text-orange-700 border-orange-200'
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200'
    }
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`
  }

  // Filter and search entries
  const filteredEntries = useMemo(() => {
    let result = entries.filter((entry) => {
      // Type filter
      if (filterType !== 'all' && entry.type !== filterType) {
        return false
      }

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase()
        const matchesDescription = entry.description?.toLowerCase().includes(query)
        const matchesFilename = entry.metadata?.filename?.toLowerCase().includes(query)
        const matchesType = entry.type.toLowerCase().includes(query)
        if (!matchesDescription && !matchesFilename && !matchesType) {
          return false
        }
      }

      return true
    })

    // Sort entries
    result = [...result].sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        case 'oldest':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        case 'name':
          return (a.metadata?.filename || '').localeCompare(b.metadata?.filename || '')
        case 'size':
          return (b.metadata?.size || 0) - (a.metadata?.size || 0)
        default:
          return 0
      }
    })

    return result
  }, [entries, filterType, searchQuery, sortBy])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Close preview with Escape
      if (e.key === 'Escape' && previewEntry) {
        setPreviewEntry(null)
      }
      // Select all with Ctrl/Cmd + A
      if ((e.ctrlKey || e.metaKey) && e.key === 'a' && !previewEntry) {
        e.preventDefault()
        handleSelectAll()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [previewEntry, filteredEntries.length, selectedIds.size])

  if (loading && !retrying) {
    return (
      <DashboardLayout title="Consent Vault" subtitle="Loading your vault...">
        <div className="flex min-h-[50vh] items-center justify-center bg-gray-50 rounded-xl border border-gray-200">
          <div className="text-center">
            <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary-600 border-r-transparent"></div>
            <p className="text-gray-600">Loading your vault...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout
      title="Consent Vault"
      subtitle={loading ? 'Loading...' : `${filteredEntries.length} of ${entries.length} entries`}
    >
      <div className="w-full min-w-0 overflow-x-hidden">
        {/* Toolbar */}
        <div className="mb-6 space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-blue-200 bg-blue-50/50 py-3 pl-10 pr-10 sm:pr-4 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500 focus:outline-none transition-colors min-h-[44px]"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Filters, View Mode, Sort */}
          <div className="flex flex-wrap items-center justify-between gap-3 sm:gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`inline-flex items-center gap-2 rounded-lg border px-3 sm:px-4 py-2 text-sm font-medium transition-colors min-h-[40px] touch-manipulation ${
                  showFilters || filterType !== 'all'
                    ? 'border-primary-500 bg-primary-50 text-primary-700'
                    : 'border-blue-200 bg-blue-50/50 text-gray-700 hover:bg-blue-100/50'
                }`}
              >
                <Filter className="h-4 w-4" />
                <span>Filters</span>
                {filterType !== 'all' && (
                  <span className="ml-1 rounded-full bg-primary-600 px-1.5 py-0.5 text-xs text-white">
                    {filterType}
                  </span>
                )}
              </button>

              {/* Sort Menu */}
              <div className="relative">
                <button
                  onClick={() => setShowSortMenu(!showSortMenu)}
                  className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 sm:px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors min-h-[40px] touch-manipulation"
                >
                  {sortBy === 'newest' ? (
                    <SortDesc className="h-4 w-4" />
                  ) : sortBy === 'oldest' ? (
                    <SortAsc className="h-4 w-4" />
                  ) : (
                    <FileText className="h-4 w-4" />
                  )}
                  <span className="hidden sm:inline">
                    {sortBy === 'newest' ? 'Newest' : sortBy === 'oldest' ? 'Oldest' : sortBy === 'name' ? 'Name' : 'Size'}
                  </span>
                  <ChevronDown className="h-4 w-4" />
                </button>

                {showSortMenu && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setShowSortMenu(false)}
                    />
                    <div className="absolute left-0 top-full z-20 mt-2 w-48 rounded-lg border border-gray-200 bg-white shadow-lg">
                      {(['newest', 'oldest', 'name', 'size'] as SortOption[]).map((option) => (
                        <button
                          key={option}
                          onClick={() => {
                            setSortBy(option)
                            setShowSortMenu(false)
                          }}
                          className={`w-full px-4 py-2 text-left text-sm transition-colors ${
                            sortBy === option
                              ? 'bg-primary-50 text-primary-700 font-medium'
                              : 'text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          {option === 'newest' ? 'Newest First' : option === 'oldest' ? 'Oldest First' : option === 'name' ? 'Name (A-Z)' : 'Size (Largest)'}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* View Mode Toggle */}
              <div className="flex items-center rounded-lg border border-gray-300 bg-white p-1">
                <button
                  onClick={() => setViewMode('list')}
                  className={`rounded-md p-1.5 transition-colors ${
                    viewMode === 'list' ? 'bg-primary-100 text-primary-700' : 'text-gray-600 hover:bg-gray-50'
                  }`}
                  title="List View"
                >
                  <List className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setViewMode('grid')}
                  className={`rounded-md p-1.5 transition-colors ${
                    viewMode === 'grid' ? 'bg-primary-100 text-primary-700' : 'text-gray-600 hover:bg-gray-50'
                  }`}
                  title="Grid View"
                >
                  <Grid3x3 className="h-4 w-4" />
                </button>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => navigate('/dashboard/vault/upload')}
                  className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-3 sm:px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-700 transition-colors min-h-[40px] touch-manipulation"
                >
                  <Upload className="h-4 w-4" />
                  <span className="hidden sm:inline">Upload Evidence</span>
                  <span className="sm:hidden">Upload</span>
                </button>
                {entries.length > 0 && (
                  <ExportButton exportType="vault" variant="outline" />
                )}
              </div>
            </div>

            {/* Bulk Actions */}
            {selectedIds.size > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">{selectedIds.size} selected</span>
                <button
                  onClick={requestBulkDelete}
                  className="inline-flex items-center gap-2 rounded-lg border border-red-300 bg-white px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </button>
                <button
                  onClick={() => setSelectedIds(new Set())}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Clear
                </button>
              </div>
            )}
          </div>

          {/* Filter Options */}
          {showFilters && (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 rounded-xl border border-blue-200 bg-blue-50/50 p-3 sm:p-4 animate-in slide-in-from-top-2">
              {[
                { value: 'all', label: 'All Types' },
                { value: 'photo', label: 'Photos' },
                { value: 'document', label: 'Documents' },
                { value: 'ticket', label: 'Tickets' },
                { value: 'receipt', label: 'Receipts' },
                { value: 'other', label: 'Other' },
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => {
                    setFilterType(option.value as FilterType)
                    setShowFilters(false)
                  }}
                  className={`rounded-lg border-2 px-3 py-2 text-sm font-medium transition-all ${
                    filterType === option.value
                      ? 'border-primary-500 bg-primary-50 text-primary-700 shadow-sm'
                      : 'border-blue-200 bg-blue-50/50 text-gray-700 hover:border-blue-300 hover:bg-blue-100/50'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 flex items-center justify-between gap-4 rounded-lg border border-red-200 bg-red-50 p-4">
            <div className="flex items-center gap-2 text-sm text-red-800">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <span>{error}</span>
            </div>
            <button
              onClick={handleRetry}
              disabled={retrying}
              className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              {retrying ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Retrying...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4" />
                  Retry
                </>
              )}
            </button>
          </div>
        )}

        {/* Empty State */}
        {filteredEntries.length === 0 && !loading && (
          <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-12 text-center shadow-sm">
            <Shield className="mx-auto mb-4 h-16 w-16 text-gray-400" />
            <h3 className="mb-2 text-lg font-semibold text-gray-900">
              {entries.length === 0 ? 'No entries yet' : 'No entries match your filters'}
            </h3>
            <p className="mb-6 text-gray-600">
              {entries.length === 0
                ? 'Start by uploading your first file to the vault.'
                : 'Try adjusting your search or filter criteria.'}
            </p>
            {entries.length === 0 && (
              <button
                onClick={() => navigate('/dashboard/vault/upload')}
                className="btn-primary inline-flex items-center gap-2"
              >
                <Upload className="h-4 w-4" />
                Upload File
              </button>
            )}
            {(searchQuery || filterType !== 'all') && (
              <button
                onClick={() => {
                  setSearchQuery('')
                  setFilterType('all')
                }}
                className="ml-3 inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <X className="h-4 w-4" />
                Clear Filters
              </button>
            )}
          </div>
        )}

        {/* Timeline - List View (rich but compact) */}
        {filteredEntries.length > 0 && viewMode === 'list' && (
          <div className="space-y-1.5">
            {/* Select All Header */}
            <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2">
              <button
                onClick={handleSelectAll}
                className="text-gray-500 hover:text-gray-900 transition-colors p-1"
              >
                {selectedIds.size === filteredEntries.length ? (
                  <CheckSquare className="h-4 w-4 text-primary-600" />
                ) : (
                  <Square className="h-4 w-4" />
                )}
              </button>
              <span className="text-xs font-medium text-gray-600">
                {selectedIds.size === filteredEntries.length ? 'Deselect All' : 'Select All'}
              </span>
            </div>

            {filteredEntries.map((entry) => {
              const isSelected = selectedIds.has(entry.id)
              const hasHash = !!entry.file_hash
              const hasExif = !!(entry.metadata?.exif?.dateTaken || entry.metadata?.exif?.camera)
              const hasGps = !!(entry.metadata?.exif?.gpsLatitude && entry.metadata?.exif?.gpsLongitude)
              const hasBadges = hasHash || hasExif || hasGps
              const hasDescription = !!entry.description?.trim()
              const showSecondary = hasDescription || hasBadges

              return (
                <div
                  key={entry.id}
                  className={`group flex items-start gap-3 rounded-lg border px-3 py-2 transition-all ${
                    isSelected
                      ? 'border-primary-500 bg-primary-50/80'
                      : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50/50'
                  }`}
                >
                  <button
                    onClick={() => handleToggleSelect(entry.id)}
                    className="shrink-0 mt-0.5 text-gray-400 hover:text-gray-600 p-0.5"
                  >
                    {isSelected ? (
                      <CheckSquare className="h-4 w-4 text-primary-600" />
                    ) : (
                      <Square className="h-4 w-4" />
                    )}
                  </button>

                  {/* Thumb or Icon */}
                  <div
                    className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md bg-gray-100 cursor-pointer flex items-center justify-center"
                    onClick={async () => {
                      if (entry.encrypted) await getDecryptedUrl(entry)
                      setPreviewEntry(entry)
                    }}
                  >
                    {entry.type === 'photo' && !entry.encrypted && (
                      <img src={entry.file_url} alt="" className="h-full w-full object-cover" loading="lazy" />
                    )}
                    {entry.type === 'photo' && entry.encrypted && decryptedUrls[entry.id] && (
                      <img src={decryptedUrls[entry.id]} alt="" className="h-full w-full object-cover" loading="lazy" />
                    )}
                    {((entry.type !== 'photo') || (entry.encrypted && !decryptedUrls[entry.id])) && (
                      <div className={`flex h-full w-full items-center justify-center rounded ${entry.encrypted && !decryptedUrls[entry.id] ? 'bg-green-50 text-green-600' : getTypeColor(entry.type)}`}>
                        {entry.encrypted && !decryptedUrls[entry.id] ? (
                          <Lock className="h-5 w-5" />
                        ) : (
                          getTypeIcon(entry.type)
                        )}
                      </div>
                    )}
                    {entry.encrypted && decryptedUrls[entry.id] && (
                      <div className="absolute right-0.5 top-0.5 rounded bg-white/90 p-0.5">
                        <Lock className="h-2.5 w-2.5 text-green-600" />
                      </div>
                    )}
                  </div>

                  {/* Info - compact 2-line layout */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 gap-y-0.5">
                      <p className="truncate text-sm font-medium text-gray-900">
                        {entry.metadata?.filename || 'Untitled'}
                      </p>
                      <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ${getTypeColor(entry.type)}`}>
                        {getTypeLabel(entry.type)}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-gray-500 mt-0.5">
                      <span>{format(new Date(entry.created_at), 'MMM d, yyyy')}</span>
                      {entry.metadata?.size && (
                        <>
                          <span>·</span>
                          <span>{formatFileSize(entry.metadata.size)}</span>
                        </>
                      )}
                      {showSecondary && (
                        <>
                          <span>·</span>
                          {hasDescription && (
                            <span className="truncate max-w-[200px] sm:max-w-xs" title={entry.description}>
                              {entry.description}
                            </span>
                          )}
                          {hasBadges && (
                            <span className="flex items-center gap-1.5 shrink-0 text-gray-400">
                              {hasHash && <span title="Integrity hash"><Hash className="h-3 w-3" /></span>}
                              {hasExif && <span title="EXIF date"><Calendar className="h-3 w-3" /></span>}
                              {hasExif && entry.metadata?.exif?.camera && <span title="Camera"><Camera className="h-3 w-3" /></span>}
                              {hasGps && <span title="GPS location"><MapPin className="h-3 w-3" /></span>}
                            </span>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={async () => {
                        if (entry.encrypted) await getDecryptedUrl(entry)
                        setPreviewEntry(entry)
                      }}
                      className="rounded p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                      title="View"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    <button
                      onClick={async () => {
                        const url = entry.encrypted ? await getDecryptedUrl(entry) : entry.file_url
                        const a = document.createElement('a')
                        a.href = url
                        a.download = entry.metadata?.filename || 'download'
                        document.body.appendChild(a)
                        a.click()
                        document.body.removeChild(a)
                      }}
                      className="rounded p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                      title="Download"
                    >
                      <Download className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => requestDelete(entry.id)}
                      disabled={deletingId === entry.id}
                      className="rounded p-1.5 text-gray-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                      title="Delete"
                    >
                      {deletingId === entry.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Grid View */}
        {filteredEntries.length > 0 && viewMode === 'grid' && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
            {filteredEntries.map((entry) => {
              const isSelected = selectedIds.has(entry.id)
              return (
                <div
                  key={entry.id}
                  className={`group relative flex flex-col rounded-lg border bg-white shadow-sm transition-all duration-200 hover:shadow-md overflow-hidden ${
                    isSelected
                      ? 'border-primary-500 ring-2 ring-primary-200'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {/* Selection Checkbox */}
                  <button
                    onClick={() => handleToggleSelect(entry.id)}
                    className="absolute left-2 top-2 z-10 rounded-md bg-white/95 p-1 shadow-sm text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {isSelected ? (
                      <CheckSquare className="h-3.5 w-3.5 text-primary-600" />
                    ) : (
                      <Square className="h-3.5 w-3.5" />
                    )}
                  </button>

                  {/* Image Preview or Icon */}
                  <div
                    className="relative aspect-[4/3] w-full cursor-pointer overflow-hidden bg-gray-100"
                    onClick={async () => {
                      if (entry.encrypted) await getDecryptedUrl(entry)
                      setPreviewEntry(entry)
                    }}
                  >
                    {entry.type === 'photo' && !entry.encrypted ? (
                      <img
                        src={entry.file_url}
                        alt={entry.description || 'Preview'}
                        className="h-full w-full object-cover transition-transform group-hover:scale-105"
                        loading="lazy"
                      />
                    ) : entry.type === 'photo' && entry.encrypted && decryptedUrls[entry.id] ? (
                      <img
                        src={decryptedUrls[entry.id]}
                        alt={entry.description || 'Preview'}
                        className="h-full w-full object-cover transition-transform group-hover:scale-105"
                        loading="lazy"
                      />
                    ) : entry.type === 'photo' && entry.encrypted ? (
                      <div className="flex h-full flex-col items-center justify-center bg-green-50/50 text-green-600">
                        <Lock className="h-6 w-6 mb-0.5" />
                        <span className="text-[10px] font-medium">Encrypted</span>
                      </div>
                    ) : (
                      <div className={`flex h-full items-center justify-center ${getTypeColor(entry.type)}`}>
                        {getTypeIcon(entry.type)}
                      </div>
                    )}
                    {/* Type badge - always visible */}
                    <span className="absolute bottom-1 left-1 right-1 flex justify-center">
                      <span className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-semibold bg-black/50 text-white backdrop-blur-sm">
                        {getTypeLabel(entry.type)}
                      </span>
                    </span>
                    {entry.encrypted && (decryptedUrls[entry.id] || entry.type !== 'photo') && (
                      <div className="absolute right-1 top-1 rounded bg-white/90 p-0.5">
                        <Lock className="h-2.5 w-2.5 text-green-600" />
                      </div>
                    )}
                  </div>

                  {/* Content - compact */}
                  <div className="p-2 sm:p-3 flex-1 flex flex-col min-w-0">
                    <h3 className="truncate text-xs sm:text-sm font-medium text-gray-900 mb-0.5">
                      {entry.metadata?.filename || 'Untitled'}
                    </h3>
                    <div className="flex items-center justify-between text-[10px] sm:text-xs text-gray-500 mb-2">
                      <span>{format(new Date(entry.created_at), 'MMM d')}</span>
                      {entry.metadata && <span>{formatFileSize(entry.metadata.size)}</span>}
                    </div>
                    <div className="flex items-center gap-1 mt-auto">
                      <button
                        onClick={async () => {
                          if (entry.encrypted) await getDecryptedUrl(entry)
                          setPreviewEntry(entry)
                        }}
                        className="flex-1 rounded-md border border-gray-200 bg-white px-2 py-1 text-[10px] sm:text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        View
                      </button>
                      <button
                        onClick={() => requestDelete(entry.id)}
                        disabled={deletingId === entry.id}
                        className="rounded-md border border-red-200 bg-white p-1 text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                        title="Delete"
                      >
                        {deletingId === entry.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Trash2 className="h-3 w-3" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <ConfirmModal
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={() => {
          if (!deleteConfirm) return
          if (deleteConfirm.type === 'single') handleDelete(deleteConfirm.id)
          else handleBulkDelete()
        }}
        title={deleteConfirm?.type === 'bulk' ? `Delete ${selectedIds.size} file(s)?` : 'Delete this file?'}
        message="This action cannot be undone. The file(s) will be permanently removed."
      />

      {/* Preview Modal */}
      {previewEntry && (
        <PreviewModal
          entry={previewEntry}
          getDisplayUrl={getDisplayUrl}
          getDecryptedUrl={getDecryptedUrl}
          onClose={() => setPreviewEntry(null)}
          getTypeIcon={getTypeIcon}
          getTypeLabel={getTypeLabel}
          formatFileSize={formatFileSize}
        />
      )}
    </DashboardLayout>
  )
}
