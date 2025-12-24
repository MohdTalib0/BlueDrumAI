import { useState, useRef, useCallback, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import {
  Upload,
  X,
  FileText,
  Image,
  Loader2,
  CheckCircle2,
  AlertCircle,
  File,
  Video,
  Music,
  FileCheck,
  Plus,
} from 'lucide-react'

interface FileUploaderProps {
  onUploadSuccess?: () => void
  module?: 'male' | 'female'
  multiple?: boolean
}

interface FileWithPreview {
  file: File
  preview?: string
  id: string
  uploading: boolean
  progress: number
  error?: string
  success: boolean
}

const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
const ALLOWED_DOCUMENT_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
]

const ALLOWED_TYPES = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_DOCUMENT_TYPES]

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

function getFileIcon(file: File) {
  if (file.type.startsWith('image/')) return Image
  if (file.type.startsWith('video/')) return Video
  if (file.type.startsWith('audio/')) return Music
  if (file.type === 'application/pdf') return FileText
  return File
}

function validateFile(file: File): { valid: boolean; error?: string } {
  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File size exceeds the maximum limit of ${formatFileSize(MAX_FILE_SIZE)}. Please choose a smaller file.`,
    }
  }

  // Check file type
  if (!ALLOWED_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: `File type "${file.type}" is not supported. Please upload images (JPEG, PNG, GIF, WebP) or documents (PDF, DOC, DOCX, TXT).`,
    }
  }

  // Additional validation for images
  if (file.type.startsWith('image/') && !ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: 'Only JPEG, PNG, GIF, and WebP images are supported.',
    }
  }

  return { valid: true }
}

export default function FileUploader({ onUploadSuccess, module = 'male', multiple = false }: FileUploaderProps) {
  const { sessionToken } = useAuth()
  const [files, setFiles] = useState<FileWithPreview[]>([])
  const [type, setType] = useState<'photo' | 'document' | 'ticket' | 'receipt' | 'other'>('photo')
  const [description, setDescription] = useState('')
  const [uploading, setUploading] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dropZoneRef = useRef<HTMLDivElement>(null)

  // Cleanup preview URLs on unmount
  useEffect(() => {
    return () => {
      files.forEach((f) => {
        if (f.preview) {
          URL.revokeObjectURL(f.preview)
        }
      })
    }
  }, [])

  const addFiles = useCallback((newFiles: File[]) => {
    const validFiles: FileWithPreview[] = []

    for (const file of newFiles) {
      const validation = validateFile(file)
      if (!validation.valid) {
        // Show error for invalid file
        continue
      }

      const id = `${Date.now()}-${Math.random().toString(36).substring(7)}`
      let preview: string | undefined

      // Create preview for images
      if (file.type.startsWith('image/')) {
        preview = URL.createObjectURL(file)
      }

      validFiles.push({
        file,
        preview,
        id,
        uploading: false,
        progress: 0,
        success: false,
      })
    }

    if (validFiles.length > 0) {
      setFiles((prev) => (multiple ? [...prev, ...validFiles] : validFiles))
    }
  }, [multiple])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || [])
    if (selectedFiles.length > 0) {
      addFiles(selectedFiles)
    }
    // Reset input to allow selecting same file again
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(false)

      const droppedFiles = Array.from(e.dataTransfer.files)
      if (droppedFiles.length > 0) {
        addFiles(droppedFiles)
      }
    },
    [addFiles],
  )

  const removeFile = (id: string) => {
    setFiles((prev) => {
      const fileToRemove = prev.find((f) => f.id === id)
      if (fileToRemove?.preview) {
        URL.revokeObjectURL(fileToRemove.preview)
      }
      return prev.filter((f) => f.id !== id)
    })
  }

  const uploadFile = async (fileWithPreview: FileWithPreview): Promise<boolean> => {
    const { file, id } = fileWithPreview

    // Update file state to uploading
    setFiles((prev) =>
      prev.map((f) => (f.id === id ? { ...f, uploading: true, progress: 0, error: undefined } : f)),
    )

    try {
      const token = sessionToken
      if (!token) {
        throw new Error('Not authenticated. Please sign in again.')
      }

      const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'

      const formData = new FormData()
      formData.append('file', file)
      formData.append('type', type)
      formData.append('module', module)
      if (description.trim()) {
        formData.append('description', description.trim())
      }

      // Simulate progress
      const progressInterval = setInterval(() => {
        setFiles((prev) =>
          prev.map((f) =>
            f.id === id
              ? { ...f, progress: Math.min(f.progress + 10, 90) }
              : f,
          ),
        )
      }, 200)

      const response = await fetch(`${apiBase}/api/vault/upload`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      })

      clearInterval(progressInterval)

      if (!response.ok) {
        const data = await response.json().catch(() => null)
        throw new Error(data?.error || `Upload failed: ${response.statusText}`)
      }

      // Mark as success
      setFiles((prev) =>
        prev.map((f) => (f.id === id ? { ...f, uploading: false, progress: 100, success: true } : f)),
      )

      return true
    } catch (err: any) {
      setFiles((prev) =>
        prev.map((f) =>
          f.id === id
            ? { ...f, uploading: false, progress: 0, error: err.message || 'Upload failed' }
            : f,
        ),
      )
      return false
    }
  }

  const handleUpload = async () => {
    if (files.length === 0) {
      return
    }

    setUploading(true)

    // Upload all files sequentially
    const results = await Promise.all(files.map((f) => uploadFile(f)))

    const successCount = results.filter((r) => r).length
    const failCount = results.length - successCount

    // Wait a bit to show success state
    await new Promise((resolve) => setTimeout(resolve, 1500))

    // Reset form if all succeeded
    if (failCount === 0) {
      setFiles([])
      setDescription('')
      setType('photo')
      if (onUploadSuccess) {
        onUploadSuccess()
      }
    }

    setUploading(false)
  }

  const canUpload = files.length > 0 && !uploading && files.every((f) => !f.uploading)
  const hasErrors = files.some((f) => f.error)
  const allSuccess = files.length > 0 && files.every((f) => f.success)

  return (
    <div className="space-y-6">
      {/* Drag & Drop Zone */}
      <div>
        <label className="mb-2 block text-sm font-semibold text-gray-900">
          {multiple ? 'Select or Drop Files' : 'Select or Drop File'}
        </label>
        <div
          ref={dropZoneRef}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`relative rounded-xl border-2 border-dashed transition-all duration-200 ${
            isDragging
              ? 'border-primary-500 bg-primary-50 scale-[1.02]'
              : 'border-gray-300 bg-gray-50 hover:border-primary-400 hover:bg-primary-50/50'
          } ${uploading ? 'opacity-50 pointer-events-none' : 'cursor-pointer'}`}
        >
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleInputChange}
            accept={ALLOWED_TYPES.join(',')}
            className="hidden"
            id="file-input"
            disabled={uploading}
            multiple={multiple}
          />
          <label
            htmlFor="file-input"
            className="flex min-h-[200px] flex-col items-center justify-center gap-4 p-8 text-center"
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
              <Upload className="h-8 w-8 text-gray-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">
                {isDragging ? 'Drop files here' : multiple ? 'Click to upload or drag and drop multiple files' : 'Click to upload or drag and drop'}
              </p>
              <p className="mt-1 text-xs text-gray-500">
                Images (JPEG, PNG, GIF, WebP) or Documents (PDF, DOC, DOCX, TXT)
              </p>
              <p className="mt-1 text-xs text-gray-500">Max size: {formatFileSize(MAX_FILE_SIZE)} per file</p>
            </div>
          </label>
        </div>
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">
              {files.length} {files.length === 1 ? 'file' : 'files'} selected
            </h3>
            {multiple && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                Add More
              </button>
            )}
          </div>

          <div className="space-y-2">
            {files.map((fileWithPreview) => {
              const FileIcon = getFileIcon(fileWithPreview.file)
              return (
                <div
                  key={fileWithPreview.id}
                  className={`rounded-lg border-2 p-3 transition-all ${
                    fileWithPreview.success
                      ? 'border-green-200 bg-green-50'
                      : fileWithPreview.error
                        ? 'border-red-200 bg-red-50'
                        : fileWithPreview.uploading
                          ? 'border-primary-200 bg-primary-50'
                          : 'border-gray-200 bg-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {/* Preview or Icon */}
                    {fileWithPreview.preview ? (
                      <img
                        src={fileWithPreview.preview}
                        alt="Preview"
                        className="h-12 w-12 shrink-0 rounded-lg object-cover border border-gray-200"
                      />
                    ) : (
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-gray-100">
                        <FileIcon className="h-6 w-6 text-gray-600" />
                      </div>
                    )}

                    {/* File Info */}
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-medium text-gray-900">{fileWithPreview.file.name}</p>
                      <div className="mt-0.5 flex items-center gap-2 text-xs text-gray-500">
                        <span>{formatFileSize(fileWithPreview.file.size)}</span>
                        {fileWithPreview.uploading && (
                          <>
                            <span>•</span>
                            <span>{fileWithPreview.progress}%</span>
                          </>
                        )}
                        {fileWithPreview.success && (
                          <>
                            <span>•</span>
                            <span className="text-green-600 font-medium">Uploaded</span>
                          </>
                        )}
                        {fileWithPreview.error && (
                          <>
                            <span>•</span>
                            <span className="text-red-600 font-medium">Failed</span>
                          </>
                        )}
                      </div>

                      {/* Progress Bar */}
                      {fileWithPreview.uploading && (
                        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
                          <div
                            className="h-full bg-primary-600 transition-all duration-300 ease-out"
                            style={{ width: `${fileWithPreview.progress}%` }}
                          />
                        </div>
                      )}

                      {/* Error Message */}
                      {fileWithPreview.error && (
                        <p className="mt-1 text-xs text-red-600">{fileWithPreview.error}</p>
                      )}
                    </div>

                    {/* Remove Button */}
                    {!fileWithPreview.uploading && (
                      <button
                        type="button"
                        onClick={() => removeFile(fileWithPreview.id)}
                        className="shrink-0 rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}

                    {/* Loading Spinner */}
                    {fileWithPreview.uploading && (
                      <div className="shrink-0">
                        <Loader2 className="h-5 w-5 animate-spin text-primary-600" />
                      </div>
                    )}

                    {/* Success Icon */}
                    {fileWithPreview.success && (
                      <div className="shrink-0">
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Success Summary */}
          {allSuccess && (
            <div className="flex items-center gap-2 rounded-lg bg-green-50 p-3 text-sm text-green-800">
              <CheckCircle2 className="h-5 w-5 shrink-0" />
              <span>All files uploaded successfully!</span>
            </div>
          )}

          {/* Error Summary */}
          {hasErrors && (
            <div className="flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-800">
              <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
              <span>Some files failed to upload. Please check individual files and try again.</span>
            </div>
          )}
        </div>
      )}

      {/* File Type Selection */}
      {files.length > 0 && (
        <div>
          <label className="mb-2 block text-sm font-semibold text-gray-900">
            File Category <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            {[
              { value: 'photo', label: 'Photo', icon: Image },
              { value: 'document', label: 'Document', icon: FileText },
              { value: 'ticket', label: 'Ticket', icon: FileCheck },
              { value: 'receipt', label: 'Receipt', icon: FileCheck },
              { value: 'other', label: 'Other', icon: File },
            ].map((option) => {
              const Icon = option.icon
              const isSelected = type === option.value
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setType(option.value as any)}
                  disabled={uploading}
                  className={`flex flex-col items-center gap-2 rounded-xl border-2 p-3 transition-all ${
                    isSelected
                      ? 'border-primary-500 bg-primary-50 text-primary-700'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                  } ${uploading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <Icon className="h-5 w-5" />
                  <span className="text-xs font-medium">{option.label}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Description */}
      {files.length > 0 && (
        <div>
          <label className="mb-2 block text-sm font-semibold text-gray-900">
            Description <span className="text-gray-500 text-xs font-normal">(Optional - applies to all files)</span>
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add notes about these files (e.g., date, location, context)..."
            rows={4}
            className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500 focus:outline-none transition-colors disabled:bg-gray-50 disabled:cursor-not-allowed resize-none"
            disabled={uploading}
            maxLength={1000}
          />
          <div className="mt-1 flex items-center justify-between text-xs text-gray-500">
            <span>Helpful for organizing and finding files later</span>
            <span>{description.length}/1000</span>
          </div>
        </div>
      )}

      {/* Upload Button */}
      {files.length > 0 && !allSuccess && (
        <button
          onClick={handleUpload}
          disabled={!canUpload}
          className="w-full rounded-xl bg-primary-600 px-6 py-3.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
        >
          {uploading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Uploading {files.filter((f) => f.uploading).length} file(s)...</span>
            </>
          ) : (
            <>
              <Upload className="h-4 w-4" />
              <span>Upload {files.length} {files.length === 1 ? 'file' : 'files'} to Vault</span>
            </>
          )}
        </button>
      )}
    </div>
  )
}
