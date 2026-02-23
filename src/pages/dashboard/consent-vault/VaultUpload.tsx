import { Shield, Upload, CheckCircle2, Info } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useState } from 'react'
import FileUploader from '../../../components/vault/FileUploader'
import { DashboardLayout } from '../../../layouts/DashboardLayout'
import { useAuth } from '../../../context/AuthContext'
import UpgradePrompt from '../../../components/UpgradePrompt'

export default function VaultUpload() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [uploadSuccess, setUploadSuccess] = useState(false)
  const [limitInfo, setLimitInfo] = useState<{ feature: string; current: number; limit: number } | null>(null)

  const handleUploadSuccess = () => {
    setUploadSuccess(true)
    // Navigate to timeline view after a short delay
    setTimeout(() => {
      navigate('/dashboard/vault/timeline')
    }, 1500)
  }

  return (
    <DashboardLayout title="Evidence Vault" subtitle="Organized, timestamped evidence is the foundation of any legal case" backHref="/dashboard/vault/timeline">
      <div className="w-full">
        {/* Success Banner */}
        {uploadSuccess && (
          <div className="mb-6 animate-in slide-in-from-top-5 flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 dark:bg-black dark:border-green-700/40 p-4 text-green-800 dark:text-green-300">
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            <div className="flex-1">
              <p className="font-semibold">File uploaded successfully!</p>
              <p className="text-sm text-green-700 dark:text-green-400">Redirecting to timeline...</p>
            </div>
          </div>
        )}

        {/* Upload Section */}
        <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50/50 dark:bg-black dark:border-blue-700/40 p-6 shadow-sm">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-100 dark:bg-gray-800">
              <Upload className="h-5 w-5 text-primary-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Upload New File</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">Add evidence to your secure vault</p>
            </div>
          </div>
          <FileUploader
            module={user?.gender === 'female' ? 'female' : 'male'}
            onUploadSuccess={handleUploadSuccess}
            onLimitReached={(feature, current, limit) => setLimitInfo({ feature, current, limit })}
            multiple={true}
          />
        </div>

        {/* Info Cards */}
        <div className="grid gap-4 sm:grid-cols-2">
          {/* What Can You Upload */}
          <div className="rounded-xl border border-blue-200 bg-blue-50 dark:bg-black dark:border-blue-700/40 p-5">
            <div className="mb-3 flex items-center gap-2">
              <Info className="h-5 w-5 text-blue-600" />
              <h3 className="font-semibold text-blue-900 dark:text-blue-300">Supported File Types</h3>
            </div>
            <ul className="space-y-2 text-sm text-blue-800 dark:text-blue-300">
              <li className="flex items-start gap-2">
                <span className="mt-0.5">•</span>
                <span>Images: JPEG, PNG, GIF, WebP</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5">•</span>
                <span>Documents: PDF, DOC, DOCX, TXT</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5">•</span>
                <span>Maximum file size: 50MB</span>
              </li>
            </ul>
          </div>

          {/* Security & Privacy */}
          <div className="rounded-xl border border-green-200 bg-green-50 dark:bg-black dark:border-green-700/40 p-5">
            <div className="mb-3 flex items-center gap-2">
              <Shield className="h-5 w-5 text-green-600" />
              <h3 className="font-semibold text-green-900 dark:text-green-300">Secure Storage</h3>
            </div>
            <ul className="space-y-2 text-sm text-green-800 dark:text-green-300">
              <li className="flex items-start gap-2">
                <span className="mt-0.5">•</span>
                <span>Files are encrypted and stored securely</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5">•</span>
                <span>Only you can access your files</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5">•</span>
                <span>Metadata preserved for legal purposes</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Tips */}
        <div className="mt-6 rounded-xl border border-blue-200 bg-blue-50/50 dark:bg-black dark:border-blue-700/40 p-5">
          <h3 className="mb-3 font-semibold text-gray-900 dark:text-white">Tips for Better Organization</h3>
          <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-primary-600">•</span>
              <span>Add descriptive notes to help you find files later</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-primary-600">•</span>
              <span>Use consistent file types for easier filtering</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-primary-600">•</span>
              <span>Upload files as soon as possible to preserve timestamps</span>
            </li>
          </ul>
        </div>
      </div>

      {limitInfo && (
        <UpgradePrompt
          feature={limitInfo.feature}
          current={limitInfo.current}
          limit={limitInfo.limit}
          onClose={() => setLimitInfo(null)}
        />
      )}
    </DashboardLayout>
  )
}
