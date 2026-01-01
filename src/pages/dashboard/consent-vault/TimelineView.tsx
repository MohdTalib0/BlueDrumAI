import { useEffect, useState, useMemo, useCallback } from 'react'
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
  Calendar,
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
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { format, formatDistanceToNow } from 'date-fns'
import DocumentViewer from '../../../components/vault/DocumentViewer'
import { DashboardLayout } from '../../../layouts/DashboardLayout'
import ExportButton from '../../../components/export/ExportButton'
import { getEdgeFunctionUrl, getAuthHeadersWithSession } from '../../../lib/api'

interface VaultEntry {
  id: string
  type: 'photo' | 'document' | 'ticket' | 'receipt' | 'other'
  file_url: string
  description?: string
  metadata?: {
    filename: string
    mimeType: string
    size: number
    uploadedAt: string
  }
  created_at: string
}

type FilterType = 'all' | 'photo' | 'document' | 'ticket' | 'receipt' | 'other'
type ViewMode = 'grid' | 'list'
type SortOption = 'newest' | 'oldest' | 'name' | 'size'

export default function TimelineView() {
  const { sessionToken } = useAuth()
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
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [sortBy, setSortBy] = useState<SortOption>('newest')
  const [showSortMenu, setShowSortMenu] = useState(false)
  const [retrying, setRetrying] = useState(false)

  useEffect(() => {
    loadEntries()
  }, [])

  const loadEntries = useCallback(async () => {
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
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to load entries' }))
        console.error('Failed to load entries:', response.status, errorData)
        throw new Error(errorData.error || `Failed to load entries: ${response.statusText}`)
      }

      const data = await response.json()
      console.log('Loaded entries:', data.entries?.length || 0, 'entries')
      setEntries(data.entries || [])
      setSelectedIds(new Set()) // Clear selections on reload
    } catch (err: any) {
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

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this file? This action cannot be undone.')) {
      return
    }

    try {
      setDeletingId(id)
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

      // Remove from local state
      setEntries(entries.filter((entry) => entry.id !== id))
      setSelectedIds((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
      if (previewEntry?.id === id) {
        setPreviewEntry(null)
      }
    } catch (err: any) {
      alert(err.message || 'Failed to delete entry')
    } finally {
      setDeletingId(null)
    }
  }

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return

    if (!confirm(`Are you sure you want to delete ${selectedIds.size} file(s)? This action cannot be undone.`)) {
      return
    }

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
      alert(`Deleted ${successCount} file(s). ${failCount} file(s) failed to delete.`)
    } else {
      alert(`Successfully deleted ${successCount} file(s).`)
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
      <div className="w-full">
        {/* Toolbar */}
        <div className="mb-6 space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by description, filename, or type..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-blue-200 bg-blue-50/50 py-3 pl-10 pr-4 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500 focus:outline-none transition-colors"
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
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
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
                  className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
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
                  className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-700 transition-colors"
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
                  onClick={handleBulkDelete}
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
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-6 rounded-xl border border-blue-200 bg-blue-50/50 p-4 animate-in slide-in-from-top-2">
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

        {/* Timeline - List View */}
        {filteredEntries.length > 0 && viewMode === 'list' && (
          <div className="space-y-3">
            {/* Select All Header */}
            {filteredEntries.length > 0 && (
              <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-4 py-2">
                <button
                  onClick={handleSelectAll}
                  className="text-gray-600 hover:text-gray-900 transition-colors"
                >
                  {selectedIds.size === filteredEntries.length ? (
                    <CheckSquare className="h-5 w-5 text-primary-600" />
                  ) : (
                    <Square className="h-5 w-5" />
                  )}
                </button>
                <span className="text-sm font-medium text-gray-700">
                  {selectedIds.size === filteredEntries.length ? 'Deselect All' : 'Select All'}
                </span>
              </div>
            )}

            {filteredEntries.map((entry, index) => {
              const isSelected = selectedIds.has(entry.id)
              return (
                <div
                  key={entry.id}
                  className={`group relative rounded-xl border-2 bg-blue-50/50 p-6 shadow-sm transition-all duration-200 ${
                    isSelected
                      ? 'border-primary-500 bg-primary-50 shadow-md'
                      : 'border-blue-200 hover:border-blue-300 hover:shadow-md'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    {/* Selection Checkbox */}
                    <button
                      onClick={() => handleToggleSelect(entry.id)}
                      className="mt-1 shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      {isSelected ? (
                        <CheckSquare className="h-5 w-5 text-primary-600" />
                      ) : (
                        <Square className="h-5 w-5" />
                      )}
                    </button>

                    {/* Timeline Indicator */}
                    <div className="relative flex shrink-0 flex-col items-center">
                      <div className={`flex h-12 w-12 items-center justify-center rounded-full border-2 ${getTypeColor(entry.type)}`}>
                        {getTypeIcon(entry.type)}
                      </div>
                      {index < filteredEntries.length - 1 && (
                        <div className="absolute top-12 h-full w-0.5 bg-gray-200" />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          {/* Header */}
                          <div className="mb-3 flex flex-wrap items-center gap-3">
                            <span className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold ${getTypeColor(entry.type)}`}>
                              {getTypeLabel(entry.type)}
                            </span>
                            <span className="flex items-center gap-1 text-xs text-gray-500">
                              <Calendar className="h-3.5 w-3.5" />
                              {format(new Date(entry.created_at), 'MMM d, yyyy')}
                            </span>
                            <span className="text-xs text-gray-400">
                              {formatDistanceToNow(new Date(entry.created_at), { addSuffix: true })}
                            </span>
                          </div>

                          {/* Description */}
                          {entry.description && (
                            <p className="mb-3 text-sm leading-relaxed text-gray-700 line-clamp-2">{entry.description}</p>
                          )}

                          {/* File Info */}
                          {entry.metadata && (
                            <div className="mb-4 flex flex-wrap items-center gap-4 text-xs text-gray-500">
                              <span className="font-medium truncate max-w-xs">{entry.metadata.filename}</span>
                              <span>•</span>
                              <span>{formatFileSize(entry.metadata.size)}</span>
                              {entry.metadata.mimeType && (
                                <>
                                  <span>•</span>
                                  <span className="uppercase">{entry.metadata.mimeType.split('/')[1]}</span>
                                </>
                              )}
                            </div>
                          )}

                          {/* Preview for Images */}
                          {entry.type === 'photo' && (
                            <div className="mb-4">
                              <img
                                src={entry.file_url}
                                alt={entry.description || 'Uploaded image'}
                                className="max-h-48 max-w-full cursor-pointer rounded-lg border border-gray-200 object-cover shadow-sm hover:shadow-md transition-shadow"
                                onClick={() => setPreviewEntry(entry)}
                              />
                            </div>
                          )}

                          {/* Actions */}
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setPreviewEntry(entry)}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                            >
                              <Eye className="h-4 w-4" />
                              View
                            </button>
                            <a
                              href={entry.file_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              download
                              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                            >
                              <Download className="h-4 w-4" />
                              Download
                            </a>
                            <button
                              onClick={() => handleDelete(entry.id)}
                              disabled={deletingId === entry.id}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-red-300 bg-white px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {deletingId === entry.id ? (
                                <>
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                  Deleting...
                                </>
                              ) : (
                                <>
                                  <Trash2 className="h-4 w-4" />
                                  Delete
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Grid View */}
        {filteredEntries.length > 0 && viewMode === 'grid' && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredEntries.map((entry) => {
              const isSelected = selectedIds.has(entry.id)
              return (
                <div
                  key={entry.id}
                  className={`group relative rounded-xl border-2 bg-blue-50/50 shadow-sm transition-all duration-200 hover:shadow-md ${
                    isSelected
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-blue-200 hover:border-blue-300'
                  }`}
                >
                  {/* Selection Checkbox */}
                  <button
                    onClick={() => handleToggleSelect(entry.id)}
                    className="absolute left-3 top-3 z-10 rounded-lg bg-white/90 p-1.5 shadow-sm text-gray-400 hover:text-gray-600 transition-colors backdrop-blur-sm"
                  >
                    {isSelected ? (
                      <CheckSquare className="h-4 w-4 text-primary-600" />
                    ) : (
                      <Square className="h-4 w-4" />
                    )}
                  </button>

                  {/* Image Preview or Icon */}
                  <div
                    className="relative aspect-square w-full cursor-pointer overflow-hidden rounded-t-xl bg-gray-100"
                    onClick={() => setPreviewEntry(entry)}
                  >
                    {entry.type === 'photo' ? (
                      <img
                        src={entry.file_url}
                        alt={entry.description || 'Preview'}
                        className="h-full w-full object-cover transition-transform group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        {getTypeIcon(entry.type)}
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="absolute bottom-2 left-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-xs font-semibold text-white backdrop-blur-sm ${getTypeColor(entry.type)}`}>
                        {getTypeLabel(entry.type)}
                      </span>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-4">
                    <h3 className="mb-1 truncate text-sm font-semibold text-gray-900">
                      {entry.metadata?.filename || 'Untitled'}
                    </h3>
                    {entry.description && (
                      <p className="mb-2 line-clamp-2 text-xs text-gray-600">{entry.description}</p>
                    )}
                    <div className="mb-3 flex items-center justify-between text-xs text-gray-500">
                      <span>{format(new Date(entry.created_at), 'MMM d, yyyy')}</span>
                      {entry.metadata && <span>{formatFileSize(entry.metadata.size)}</span>}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setPreviewEntry(entry)}
                        className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        View
                      </button>
                      <button
                        onClick={() => handleDelete(entry.id)}
                        disabled={deletingId === entry.id}
                        className="rounded-lg border border-red-300 bg-white p-1.5 text-red-700 hover:bg-red-50 transition-colors disabled:opacity-50"
                        title="Delete"
                      >
                        {deletingId === entry.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
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

      {/* Preview Modal */}
      {previewEntry && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm overflow-y-auto"
          onClick={() => setPreviewEntry(null)}
        >
          <div
            className="relative my-8 max-h-[95vh] w-full max-w-6xl rounded-xl bg-white shadow-2xl overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header - Fixed */}
            <div className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4 shrink-0">
              <div className="flex items-center gap-3">
                {getTypeIcon(previewEntry.type)}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{getTypeLabel(previewEntry.type)}</h3>
                  {previewEntry.metadata?.filename && (
                    <p className="text-xs text-gray-500 truncate max-w-md">{previewEntry.metadata.filename}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-4">
                {previewEntry.metadata && (
                  <div className="hidden sm:flex items-center gap-2 text-xs text-gray-500">
                    <span>{formatFileSize(previewEntry.metadata.size)}</span>
                    {previewEntry.metadata.mimeType && (
                      <>
                        <span>•</span>
                        <span className="uppercase">{previewEntry.metadata.mimeType.split('/')[1]}</span>
                      </>
                    )}
                  </div>
                )}
                <button
                  onClick={() => setPreviewEntry(null)}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Preview Content - Scrollable */}
            <div className="flex-1 overflow-y-auto p-6">
              {/* Document Viewer */}
              <div className="mb-4">
                <DocumentViewer
                  fileUrl={previewEntry.file_url}
                  mimeType={previewEntry.metadata?.mimeType}
                  fileName={previewEntry.metadata?.filename}
                />
              </div>

              {previewEntry.description && (
                <div className="mb-4 rounded-lg bg-gray-50 p-4">
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{previewEntry.description}</p>
                </div>
              )}
            </div>

            {/* Footer - Fixed */}
            <div className="flex items-center justify-between border-t border-gray-200 bg-gray-50 px-6 py-4 shrink-0">
              <span className="text-xs text-gray-500">{format(new Date(previewEntry.created_at), 'PPP p')}</span>
              <a
                href={previewEntry.file_url}
                target="_blank"
                rel="noopener noreferrer"
                download={previewEntry.metadata?.filename}
                className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 transition-colors"
              >
                <Download className="h-4 w-4" />
                Download File
              </a>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
