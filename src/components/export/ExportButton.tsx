import { useState } from 'react'
import { Download, Loader2 } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

interface ExportButtonProps {
  exportType: 'vault' | 'affidavit' | 'analysis'
  monthYear?: string // For affidavit
  analysisId?: string // For analysis
  className?: string
  variant?: 'default' | 'outline' | 'ghost'
}

export default function ExportButton({ exportType, monthYear, analysisId, className = '', variant = 'default' }: ExportButtonProps) {
  const { sessionToken } = useAuth()
  const [exporting, setExporting] = useState(false)

  const handleExport = async () => {
    if (!sessionToken) {
      alert('Please sign in to export')
      return
    }

    try {
      setExporting(true)

      const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'
      let url = ''
      let body: any = {}

      switch (exportType) {
        case 'vault':
          url = `${apiBase}/api/export/vault`
          break
        case 'affidavit':
          if (!monthYear) {
            alert('Month and year are required')
            return
          }
          url = `${apiBase}/api/export/affidavit`
          body = { month_year: monthYear }
          break
        case 'analysis':
          if (!analysisId) {
            alert('Analysis ID is required')
            return
          }
          url = `${apiBase}/api/export/analysis/${analysisId}`
          break
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${sessionToken}`,
          'Content-Type': 'application/json',
        },
        body: Object.keys(body).length > 0 ? JSON.stringify(body) : undefined,
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to export' }))
        throw new Error(error.error || 'Failed to export')
      }

      // Get filename from Content-Disposition header or use default
      const contentDisposition = response.headers.get('Content-Disposition')
      const filenameMatch = contentDisposition?.match(/filename="(.+)"/)
      const filename = filenameMatch ? filenameMatch[1] : `export-${Date.now()}.pdf`

      // Create blob and download
      const blob = await response.blob()
      const downloadUrl = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = downloadUrl
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(downloadUrl)
    } catch (error: any) {
      console.error('Export error:', error)
      alert(error.message || 'Failed to export. Please try again.')
    } finally {
      setExporting(false)
    }
  }

  const baseClasses = 'inline-flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
  const variantClasses = {
    default: 'bg-primary-600 text-white hover:bg-primary-700',
    outline: 'border border-primary-600 text-primary-600 hover:bg-primary-50',
    ghost: 'text-primary-600 hover:bg-primary-50',
  }

  return (
    <button
      onClick={handleExport}
      disabled={exporting}
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
    >
      {exporting ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Exporting...
        </>
      ) : (
        <>
          <Download className="h-4 w-4" />
          Export PDF
        </>
      )}
    </button>
  )
}

