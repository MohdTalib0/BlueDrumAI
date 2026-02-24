import { Crown, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

interface Props {
  feature: string
  current: number
  limit: number
  onClose: () => void
}

const FEATURE_LABELS: Record<string, string> = {
  ai_analyses: 'AI analyses',
  pdf_exports: 'PDF exports',
  vault_uploads: 'vault file uploads',
  breakup: 'Breakup Generator messages',
  red_flag: 'Red Flag sessions',
  storage: 'storage',
}

export default function UpgradePrompt({ feature, current, limit, onClose }: Props) {
  const navigate = useNavigate()
  const label = FEATURE_LABELS[feature] || feature

  return (
    <div
      className="fixed inset-0 z-[200000] flex items-center justify-center p-4"
      style={{ background: 'rgba(15,23,42,0.4)', backdropFilter: 'blur(6px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-black shadow-2xl dark:border dark:border-gray-700 overflow-hidden">
        <div className="bg-gradient-to-r from-primary-600 to-blue-700 px-6 py-5 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20">
                <Crown className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="font-bold">Limit Reached</h3>
                <p className="text-xs text-white/70">Upgrade to continue</p>
              </div>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="px-6 py-5">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            You've used <strong className="text-gray-900 dark:text-white">{current} of {limit}</strong> {label} on your free plan this month.
            Upgrade to Premium for unlimited access.
          </p>

          <button
            onClick={() => { onClose(); navigate('/dashboard/subscription') }}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 py-3 text-sm font-bold text-white shadow-md hover:bg-primary-700 transition-colors"
          >
            <Crown className="h-4 w-4" />
            Upgrade to Premium - ₹199/mo
          </button>

          <button
            onClick={onClose}
            className="w-full mt-2 rounded-xl border border-gray-200 dark:border-gray-600 px-4 py-2.5 text-sm font-medium text-gray-500 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
          >
            Maybe later
          </button>
        </div>
      </div>
    </div>
  )
}
