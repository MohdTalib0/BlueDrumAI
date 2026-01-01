import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Upload, FileText, AlertTriangle, Loader2, CheckCircle2, Info, X, MessageSquare, Mail, Smartphone, Type, Bot, GitCompare, BookOpen } from 'lucide-react'
import { useAuth } from '../../../context/AuthContext'
import { DashboardLayout } from '../../../layouts/DashboardLayout'
import { getEdgeFunctionUrl, getAuthHeadersWithSession } from '../../../lib/api'

type PlatformType = 'whatsapp' | 'sms' | 'email' | 'manual' | 'auto'

export default function ChatUpload() {
  const { sessionToken, user } = useAuth()
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [platform, setPlatform] = useState<PlatformType>('auto')
  const [file, setFile] = useState<File | null>(null)
  const [manualText, setManualText] = useState('')
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [preview, setPreview] = useState<string>('')
  const [progress, setProgress] = useState(0)
  const [status, setStatus] = useState('')
  const [userGender, setUserGender] = useState<string | null>(null)

  // Fetch user gender
  useEffect(() => {
    const fetchUserGender = async () => {
      if (!sessionToken || !user?.id) return
      try {
        const headers = await getAuthHeadersWithSession()
        if (sessionToken) headers['Authorization'] = `Bearer ${sessionToken}`
        const response = await fetch(`${getEdgeFunctionUrl('auth')}/me`, {
          headers,
        })
        if (response.ok) {
          const data = await response.json()
          if (data.ok && data.user) {
            setUserGender(data.user.gender)
          }
        }
      } catch (err) {
        console.error('Error fetching user gender:', err)
      }
    }
    fetchUserGender()
  }, [sessionToken, user?.id])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      // Allow .txt, .csv, .eml files
      const validExtensions = ['.txt', '.csv', '.eml']
      const hasValidExt = validExtensions.some((ext) => selectedFile.name.toLowerCase().endsWith(ext))
      
      if (!hasValidExt) {
        setError('Please upload a .txt, .csv, or .eml file')
        return
      }
      
      setFile(selectedFile)
      setError('')
      setSuccess(false)
      setManualText('') // Clear manual text when file selected

      // Preview first few lines
      const reader = new FileReader()
      reader.onload = (event) => {
        const text = event.target?.result as string
        const lines = text.split('\n').slice(0, 10).join('\n')
        setPreview(lines)
      }
      reader.readAsText(selectedFile)
    }
  }

  const handleManualTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setManualText(e.target.value)
    setFile(null) // Clear file when manual text entered
    setPreview('')
    setError('')
  }

  const handleUpload = async () => {
    if (!file && !manualText.trim()) {
      setError('Please select a file or paste text')
      return
    }

    if (!sessionToken) {
      setError('Not authenticated')
      return
    }

    setUploading(true)
    setError('')
    setSuccess(false)
    setProgress(0)
    setStatus('Preparing analysis...')

    try {
      let analysisData: any

      if (manualText.trim()) {
        // Manual text analysis
        setStatus('Analyzing text...')
        setProgress(30)

        const headers = await getAuthHeadersWithSession()
        if (sessionToken) headers['Authorization'] = `Bearer ${sessionToken}`

        const response = await fetch(`${getEdgeFunctionUrl('analyze')}/text`, {
          method: 'POST',
          headers: {
            ...headers,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text: manualText,
            platform: platform === 'auto' ? undefined : platform,
          }),
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Failed to analyze text' }))
          throw new Error(errorData.error || errorData.details || 'Failed to analyze text')
        }

        analysisData = await response.json()
      } else if (file) {
        // File upload analysis
        const formData = new FormData()
        formData.append('chatFile', file)
        if (platform !== 'auto') {
          formData.append('platform', platform)
        }

        // Simulate progress
        const progressInterval = setInterval(() => {
          setProgress((prev) => {
            if (prev < 90) return prev + 10
            return prev
          })
        }, 500)

        const headers = await getAuthHeadersWithSession()
        if (sessionToken) headers['Authorization'] = `Bearer ${sessionToken}`
        
        setStatus('Uploading file...')
        setProgress(20)
        
        const response = await fetch(`${getEdgeFunctionUrl('analyze')}/chat?platform=${platform === 'auto' ? '' : platform}`, {                                           
          method: 'POST',
          headers,
          body: formData,
        })

        clearInterval(progressInterval)
        setProgress(60)
        setStatus('Analyzing with AI...')

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Failed to analyze chat' }))
          throw new Error(errorData.error || errorData.details || 'Failed to analyze chat')
        }

        analysisData = await response.json()
      }

      setProgress(100)
      setStatus('Analysis complete!')
      setSuccess(true)

      // Navigate to results page after a short delay
      setTimeout(() => {
        navigate(`/dashboard/red-flag-radar/analysis/${analysisData.analysis.id}`)
      }, 1500)
    } catch (err: any) {
      setError(err.message || 'Failed to analyze')
    } finally {
      setUploading(false)
    }
  }

  const handleRemoveFile = () => {
    setFile(null)
    setPreview('')
    setManualText('')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const platforms = [
    { value: 'auto', label: 'Auto-Detect', icon: Info, desc: 'We\'ll detect the format automatically' },
    { value: 'whatsapp', label: 'WhatsApp', icon: MessageSquare, desc: 'WhatsApp chat export (.txt)' },
    { value: 'sms', label: 'SMS', icon: Smartphone, desc: 'SMS backup or text messages' },
    { value: 'email', label: 'Email', icon: Mail, desc: 'Forwarded email or .eml file' },
    { value: 'manual', label: 'Manual Text', icon: Type, desc: 'Paste any conversation' },
  ]

  return (
    <DashboardLayout title="Red Flag Radar" subtitle="Analyze conversations for red flags and threats">
      <div className="w-full max-w-4xl mx-auto">
        {/* Success Message */}
        {success && (
          <div className="mb-6 animate-in slide-in-from-top-5 flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 p-4 text-green-800 shadow-sm">
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            <div className="flex-1">
              <p className="font-semibold">Chat analyzed successfully!</p>
              <p className="text-sm text-green-700">Redirecting to results...</p>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 animate-in slide-in-from-top-5 flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-red-800 shadow-sm">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            <span className="flex-1">{error}</span>
            <button onClick={() => setError('')} className="text-red-600 hover:text-red-800">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Educational Features */}
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* Compare Analyses */}
          <button
            onClick={() => navigate('/dashboard/red-flag-radar/compare')}
            className="group rounded-lg border border-blue-200 bg-blue-50/50 p-5 text-left transition-all hover:border-blue-300 hover:bg-blue-100 hover:shadow-md"
          >
            <div className="mb-3 flex items-center gap-2">
              <GitCompare className="h-5 w-5 text-blue-600" />
              <h3 className="font-semibold text-blue-900">Compare Analyses</h3>
            </div>
            <p className="text-sm text-blue-800">
              Select multiple chat analyses to compare side-by-side. See patterns and changes over time.
            </p>
            <div className="mt-3 text-xs font-medium text-blue-700 group-hover:text-blue-900">
              Compare now →
            </div>
          </button>

          {/* Red Flag Experience */}
          <button
            onClick={() => navigate('/dashboard/red-flag-radar/experience')}
            className="group rounded-lg border border-purple-200 bg-purple-50/50 p-5 text-left transition-all hover:border-purple-300 hover:bg-purple-100 hover:shadow-md"
          >
            <div className="mb-3 flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-purple-600" />
              <h3 className="font-semibold text-purple-900">Red Flag Experience</h3>
            </div>
            <p className="text-sm text-purple-800">
              Interactive scenarios to learn what red flags look like. Experience manipulation patterns safely.
            </p>
            <div className="mt-3 text-xs font-medium text-purple-700 group-hover:text-purple-900">
              Learn now →
            </div>
          </button>

          {/* Demo Red Flag - Only for Women */}
          {userGender === 'female' && (
            <button
              onClick={() => navigate('/dashboard/red-flag-radar/demo-red-flag')}
              className="group rounded-lg border border-red-200 bg-red-50/50 p-5 text-left transition-all hover:border-red-300 hover:bg-red-100 hover:shadow-md"
            >
              <div className="mb-3 flex items-center gap-2">
                <Bot className="h-5 w-5 text-red-600" />
                <h3 className="font-semibold text-red-900">Demo Red Flag</h3>
              </div>
              <p className="text-sm text-red-800">
                Chat with an AI that demonstrates red flag behaviors. Learn to recognize manipulation in real-time.
              </p>
              <div className="mt-3 text-xs font-medium text-red-700 group-hover:text-red-900">
                Try it now →
              </div>
            </button>
          )}
        </div>

        {/* Platform Selection */}
        <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50/50 p-6 shadow-sm">
          <h3 className="mb-4 text-base font-semibold text-blue-900">Select Communication Platform</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {platforms.map((p) => {
              const Icon = p.icon
              const isSelected = platform === p.value
              return (
                <button
                  key={p.value}
                  onClick={() => setPlatform(p.value as PlatformType)}
                  className={`rounded-lg border-2 p-4 text-left transition-all ${
                    isSelected
                      ? 'border-blue-500 bg-blue-100 shadow-md'
                      : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className={`h-5 w-5 ${isSelected ? 'text-blue-600' : 'text-gray-600'}`} />
                    <span className={`font-semibold text-sm ${isSelected ? 'text-blue-900' : 'text-gray-900'}`}>
                      {p.label}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600">{p.desc}</p>
                </button>
              )
            })}
          </div>
        </div>

        {/* Instructions */}
        {platform === 'whatsapp' && (
          <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50/50 p-6 shadow-sm">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 shrink-0 text-blue-600 mt-0.5" />
              <div className="flex-1">
                <h3 className="mb-2 text-base font-semibold text-blue-900">How to Export WhatsApp Chat</h3>
                <ol className="space-y-2 text-sm text-blue-800">
                  <li className="flex items-start gap-2">
                    <span className="font-semibold">1.</span>
                    <span>Open WhatsApp → Chat → Three dots → More → Export chat</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-semibold">2.</span>
                    <span>Choose "Without Media" and save the .txt file</span>
                  </li>
                </ol>
              </div>
            </div>
          </div>
        )}

        {platform === 'sms' && (
          <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50/50 p-6 shadow-sm">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 shrink-0 text-blue-600 mt-0.5" />
              <div className="flex-1">
                <h3 className="mb-2 text-base font-semibold text-blue-900">How to Export SMS</h3>
                <div className="space-y-3 text-sm text-blue-800">
                  <div>
                    <p className="font-semibold mb-1">Android:</p>
                    <p>Use SMS Backup & Restore app → Export → Upload CSV file</p>
                  </div>
                  <div>
                    <p className="font-semibold mb-1">iOS:</p>
                    <p>Copy messages from Messages app → Paste in Manual Text option</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {platform === 'email' && (
          <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50/50 p-6 shadow-sm">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 shrink-0 text-blue-600 mt-0.5" />
              <div className="flex-1">
                <h3 className="mb-2 text-base font-semibold text-blue-900">How to Export Email</h3>
                <div className="space-y-2 text-sm text-blue-800">
                  <p>• Forward the email to yourself, then copy the forwarded text</p>
                  <p>• Or download as .eml file and upload here</p>
                  <p>• Or copy email content and paste in Manual Text option</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Upload/Text Entry Area */}
        <div className="mb-6 rounded-lg border border-gray-200/20 bg-white/50 hover:bg-white/70 transition-colors p-8 shadow-sm">
          {platform === 'manual' || (!file && !manualText) ? (
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-900">
                  Paste Conversation Text
                </label>
                <textarea
                  value={manualText}
                  onChange={handleManualTextChange}
                  placeholder="Paste your conversation here...&#10;&#10;Format examples:&#10;Sender: Message&#10;[Date] Sender: Message&#10;12/25/2024 10:30 AM - Sender: Message"
                  className="w-full min-h-[200px] rounded-lg border border-gray-300 bg-white p-4 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  disabled={uploading}
                />
                <p className="mt-2 text-xs text-gray-500">
                  Paste any conversation format. We'll detect and parse it automatically.
                </p>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex-1 border-t border-gray-200"></div>
                <span className="text-xs text-gray-500">OR</span>
                <div className="flex-1 border-t border-gray-200"></div>
              </div>
              <div
                onClick={() => fileInputRef.current?.click()}
                className="cursor-pointer rounded-lg border-2 border-dashed border-gray-300 bg-gray-50/50 p-8 text-center transition-colors hover:border-primary-400 hover:bg-gray-100/50"
              >
                <Upload className="mx-auto mb-2 h-8 w-8 text-gray-400" />
                <p className="text-sm text-gray-600">Click to upload a file instead</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".txt,.csv,.eml,text/plain,text/csv,message/rfc822"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>
            </div>
          ) : file ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-100 text-primary-700">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{file.name}</p>
                    <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(2)} KB</p>
                  </div>
                </div>
                <button
                  onClick={handleRemoveFile}
                  className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {preview && (
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <p className="mb-2 text-xs font-semibold text-gray-700">Preview (first 10 lines):</p>
                  <pre className="max-h-40 overflow-auto rounded bg-white p-3 text-xs text-gray-700 whitespace-pre-wrap font-mono">
                    {preview}
                  </pre>
                </div>
              )}
            </div>
          ) : (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="cursor-pointer rounded-lg border-2 border-dashed border-gray-300 bg-gray-50/50 p-12 text-center transition-colors hover:border-primary-400 hover:bg-gray-100/50"
            >
              <Upload className="mx-auto mb-4 h-12 w-12 text-gray-400" />
              <h3 className="mb-2 text-lg font-semibold text-gray-900">Upload Chat File</h3>
              <p className="mb-4 text-sm text-gray-600">Click to select or drag and drop your file</p>
              <p className="text-xs text-gray-500">Supports: .txt, .csv, .eml (Max 10MB)</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt,.csv,.eml,text/plain,text/csv,message/rfc822"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
          )}

          {/* Progress Bar */}
          {uploading && (
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-gray-700">{status}</span>
                <span className="text-gray-500">{progress}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
                <div
                  className="h-full bg-primary-600 transition-all duration-300 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Analyze Button */}
          {(file || manualText.trim()) && (
            <button
              onClick={handleUpload}
              disabled={uploading}
              className="mt-4 w-full rounded-lg bg-primary-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 transition-all"
            >
              {uploading ? (
                <>
                  <Loader2 className="mr-2 inline-block h-4 w-4 animate-spin" />
                  {status}
                </>
              ) : (
                <>
                  <AlertTriangle className="mr-2 inline-block h-4 w-4" />
                  Analyze for Red Flags
                </>
              )}
            </button>
          )}
        </div>

        {/* What We Analyze */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-red-200 bg-red-50/50 p-5">
            <div className="mb-3 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <h3 className="font-semibold text-red-900">Red Flags Detected</h3>
            </div>
            <ul className="space-y-1 text-sm text-red-800">
              <li>• Extortion & financial demands</li>
              <li>• Threats & intimidation</li>
              <li>• Emotional manipulation</li>
              <li>• Isolation attempts</li>
              <li>• False accusations</li>
              <li>• Property/dowry demands</li>
            </ul>
          </div>

          <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-5">
            <div className="mb-3 flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" />
              <h3 className="font-semibold text-blue-900">Supported Platforms</h3>
            </div>
            <ul className="space-y-1 text-sm text-blue-800">
              <li>• WhatsApp chat exports</li>
              <li>• SMS messages (Android/iOS)</li>
              <li>• Email conversations</li>
              <li>• Manual text paste</li>
              <li>• Auto-format detection</li>
              <li>• Any conversation format</li>
            </ul>
          </div>
        </div>

        {/* Privacy Notice */}
        <div className="mt-6 rounded-lg border border-gray-200 bg-gray-50/50 p-4">
          <p className="text-xs text-gray-600">
            <strong>Privacy:</strong> Your conversations are stored securely and encrypted. Only you can access your analysis results. Data is used solely for analysis purposes.
          </p>
        </div>
      </div>
    </DashboardLayout>
  )
}
