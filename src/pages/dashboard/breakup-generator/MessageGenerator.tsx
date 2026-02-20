import { useState, useEffect } from 'react'
import {
  FileText,
  Wand2,
  Copy,
  Download,
  Trash2,
  Loader2,
  ChevronDown,
  Info,
  Clock,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react'
import { DashboardLayout } from '../../../layouts/DashboardLayout'
import { useAuth } from '../../../context/AuthContext'
import { getEdgeFunctionUrl, authHeaders } from '../../../lib/api'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import ConfirmModal from '../../../components/ui/ConfirmModal'

type TemplateType = 'separation' | 'divorce_intent' | 'no_contact' | 'closure' | 'mutual_separation'
type Tone = 'formal' | 'compassionate' | 'firm' | 'neutral'
type RelationshipType = 'arranged_marriage' | 'love_marriage' | 'live_in' | 'dating' | 'other'

interface SavedMessage {
  id: string
  template_type: TemplateType
  tone: Tone
  relationship_type: RelationshipType | null
  relationship_duration: string | null
  generated_message: string
  legal_notes: string | null
  created_at: string
}

const TEMPLATE_OPTIONS: { value: TemplateType; label: string; description: string }[] = [
  { value: 'closure', label: 'Closure Letter', description: 'Respectful, compassionate end to the relationship' },
  { value: 'separation', label: 'Separation Notice', description: 'Formal notice of intent to live separately' },
  { value: 'divorce_intent', label: 'Intent to Divorce', description: 'Formal communication of intent to file for divorce' },
  { value: 'no_contact', label: 'No Contact Notice', description: 'Clear request to cease all communication' },
  { value: 'mutual_separation', label: 'Mutual Separation', description: 'Amicable proposal for mutually agreed separation' },
]

const TONE_OPTIONS: { value: Tone; label: string; icon: string }[] = [
  { value: 'compassionate', label: 'Compassionate', icon: '💛' },
  { value: 'formal', label: 'Formal', icon: '📄' },
  { value: 'firm', label: 'Firm', icon: '⚡' },
  { value: 'neutral', label: 'Neutral', icon: '⚖️' },
]

const RELATIONSHIP_OPTIONS: { value: RelationshipType; label: string }[] = [
  { value: 'arranged_marriage', label: 'Arranged Marriage' },
  { value: 'love_marriage', label: 'Love Marriage' },
  { value: 'live_in', label: 'Live-in Relationship' },
  { value: 'dating', label: 'Dating Relationship' },
  { value: 'other', label: 'Other' },
]

const TEMPLATE_LABELS: Record<TemplateType, string> = {
  closure: 'Closure Letter',
  separation: 'Separation Notice',
  divorce_intent: 'Intent to Divorce',
  no_contact: 'No Contact Notice',
  mutual_separation: 'Mutual Separation',
}

export default function MessageGenerator() {
  const { sessionToken } = useAuth()

  // Form state
  const [templateType, setTemplateType] = useState<TemplateType>('closure')
  const [tone, setTone] = useState<Tone>('compassionate')
  const [relationshipType, setRelationshipType] = useState<RelationshipType | ''>('')
  const [relationshipDuration, setRelationshipDuration] = useState('')
  const [keyPoints, setKeyPoints] = useState('')

  // Generation state
  const [generating, setGenerating] = useState(false)
  const [generated, setGenerated] = useState<{ message: string; legalNotes: string; id: string } | null>(null)
  const [copied, setCopied] = useState(false)

  // History state
  const [savedMessages, setSavedMessages] = useState<SavedMessage[]>([])
  const [loadingHistory, setLoadingHistory] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    loadHistory()
  }, [])

  const getHeaders = () => authHeaders(sessionToken!)

  const loadHistory = async () => {
    try {
      setLoadingHistory(true)
      const headers = await getHeaders()
      const res = await fetch(`${getEdgeFunctionUrl('breakup')}/messages`, { headers })
      if (res.ok) {
        const data = await res.json()
        setSavedMessages(data.messages || [])
      }
    } catch {
      // silently fail
    } finally {
      setLoadingHistory(false)
    }
  }

  const handleGenerate = async () => {
    if (generating) return
    try {
      setGenerating(true)
      setGenerated(null)

      const headers = await getHeaders()
      const res = await fetch(`${getEdgeFunctionUrl('breakup')}/generate`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template_type: templateType,
          tone,
          relationship_type: relationshipType || null,
          relationship_duration: relationshipDuration.trim() || null,
          key_points: keyPoints.trim() || null,
        }),
      })

      const data = await res.json()
      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'Generation failed')
      }

      setGenerated({
        id: data.message.id,
        message: data.message.generated_message,
        legalNotes: data.message.legal_notes || '',
      })
      // Prepend to history without refetching
      setSavedMessages((prev) => [data.message, ...prev])
      toast.success('Message generated')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Generation failed. Please try again.')
    } finally {
      setGenerating(false)
    }
  }

  const handleCopy = async () => {
    if (!generated) return
    try {
      await navigator.clipboard.writeText(generated.message)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      toast.success('Copied to clipboard')
    } catch {
      toast.error('Copy failed — please select and copy manually')
    }
  }

  const handleDownload = () => {
    if (!generated) return
    const content = [
      `${TEMPLATE_LABELS[templateType]}`,
      `Generated: ${format(new Date(), 'MMMM d, yyyy')}`,
      '',
      generated.message,
      ...(generated.legalNotes
        ? ['', '---', 'Legal Notes:', generated.legalNotes]
        : []),
      '',
      '---',
      'Generated by Blue Drum AI — Not legal advice.',
    ].join('\n')

    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${templateType}_${format(new Date(), 'yyyy-MM-dd')}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleDelete = async (id: string) => {
    setDeleteConfirmId(null)
    try {
      setDeletingId(id)
      const headers = await getHeaders()
      const res = await fetch(`${getEdgeFunctionUrl('breakup')}/message/${id}`, {
        method: 'DELETE',
        headers,
      })
      if (!res.ok) throw new Error('Delete failed')
      setSavedMessages((prev) => prev.filter((m) => m.id !== id))
      if (generated?.id === id) setGenerated(null)
      toast.success('Message deleted')
    } catch {
      toast.error('Failed to delete message')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <DashboardLayout
      title="Breakup Generator"
      subtitle="AI-generated legally safe closure messages"
    >
      <div className="w-full space-y-6">
        {/* Disclaimer banner */}
        <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 sm:p-4">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <p className="text-xs sm:text-sm text-amber-800">
            Messages generated here are for communication purposes only and do not constitute legal advice.
            Always consult a qualified family law attorney before initiating formal legal proceedings.
          </p>
        </div>

        {/* Main grid: form + output */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Left: Form */}
          <div className="rounded-lg border border-gray-200/20 bg-white/50 p-4 sm:p-6 shadow-sm">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-900">
              <Wand2 className="h-4 w-4 text-blue-600" />
              Configure Message
            </h2>

            <div className="space-y-4">
              {/* Template Type */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-gray-700">
                  Message Type <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <select
                    value={templateType}
                    onChange={(e) => setTemplateType(e.target.value as TemplateType)}
                    className="w-full appearance-none rounded-lg border border-gray-300 bg-white py-2.5 pl-3 pr-8 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    {TEMPLATE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                </div>
                <p className="mt-1 text-[10px] text-gray-500">
                  {TEMPLATE_OPTIONS.find((o) => o.value === templateType)?.description}
                </p>
              </div>

              {/* Tone */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-gray-700">
                  Tone <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {TONE_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setTone(opt.value)}
                      className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
                        tone === opt.value
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <span>{opt.icon}</span>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Relationship Type */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-gray-700">
                  Relationship Type <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <div className="relative">
                  <select
                    value={relationshipType}
                    onChange={(e) => setRelationshipType(e.target.value as RelationshipType | '')}
                    className="w-full appearance-none rounded-lg border border-gray-300 bg-white py-2.5 pl-3 pr-8 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="">Select (optional)</option>
                    {RELATIONSHIP_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                </div>
              </div>

              {/* Duration */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-gray-700">
                  Relationship Duration <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. 3 years, 8 months"
                  value={relationshipDuration}
                  onChange={(e) => setRelationshipDuration(e.target.value.slice(0, 100))}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm shadow-sm placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* Key Points */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-gray-700">
                  Key Points to Include <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <textarea
                  placeholder="Brief notes on what you'd like the message to convey (e.g. desire for peaceful resolution, no further contact)..."
                  value={keyPoints}
                  onChange={(e) => setKeyPoints(e.target.value.slice(0, 1000))}
                  rows={3}
                  className="w-full resize-none rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm shadow-sm placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <p className="mt-0.5 text-right text-[10px] text-gray-400">{keyPoints.length}/1000</p>
              </div>

              <button
                onClick={handleGenerate}
                disabled={generating}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-60 transition-colors"
              >
                {generating ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Generating…</>
                ) : (
                  <><Wand2 className="h-4 w-4" /> Generate Message</>
                )}
              </button>
            </div>
          </div>

          {/* Right: Generated Output */}
          <div className="rounded-lg border border-gray-200/20 bg-white/50 p-4 sm:p-6 shadow-sm">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-900">
              <FileText className="h-4 w-4 text-blue-600" />
              Generated Message
            </h2>

            {!generated && !generating && (
              <div className="flex min-h-[300px] flex-col items-center justify-center text-center">
                <Wand2 className="mb-3 h-10 w-10 text-gray-300" />
                <p className="text-sm text-gray-400">Configure options and click Generate to create your message.</p>
              </div>
            )}

            {generating && (
              <div className="flex min-h-[300px] flex-col items-center justify-center gap-3 text-center">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                <p className="text-sm text-gray-500">AI is crafting your message…</p>
              </div>
            )}

            {generated && !generating && (
              <div className="flex flex-col gap-4">
                {/* Message text */}
                <div className="rounded-lg border border-gray-100 bg-gray-50 p-4">
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-800">
                    {generated.message}
                  </p>
                </div>

                {/* Legal notes */}
                {generated.legalNotes && (
                  <div className="flex items-start gap-2 rounded-lg border border-blue-100 bg-blue-50/60 p-3">
                    <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
                    <div>
                      <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-blue-700">Legal Notes</p>
                      <p className="whitespace-pre-wrap text-xs text-blue-800">{generated.legalNotes}</p>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 shadow-sm hover:bg-gray-50 transition-colors"
                  >
                    {copied ? <CheckCircle2 className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                  <button
                    onClick={handleDownload}
                    className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 shadow-sm hover:bg-gray-50 transition-colors"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Download
                  </button>
                  <button
                    onClick={() => setDeleteConfirmId(generated.id)}
                    disabled={deletingId === generated.id}
                    className="flex items-center gap-2 rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-600 shadow-sm hover:bg-red-50 disabled:opacity-50 transition-colors"
                  >
                    {deletingId === generated.id
                      ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      : <Trash2 className="h-3.5 w-3.5" />}
                    Delete
                  </button>
                </div>

                <p className="text-[10px] text-gray-400">
                  This message does not constitute legal advice. Review with a qualified attorney before sending.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Saved Messages History */}
        <div className="rounded-lg border border-gray-200/20 bg-white/50 p-4 sm:p-6 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-900">
            <Clock className="h-4 w-4 text-gray-500" />
            Saved Messages
            {savedMessages.length > 0 && (
              <span className="ml-1 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-600">
                {savedMessages.length}
              </span>
            )}
          </h2>

          {loadingHistory && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
            </div>
          )}

          {!loadingHistory && savedMessages.length === 0 && (
            <div className="py-8 text-center">
              <FileText className="mx-auto mb-2 h-8 w-8 text-gray-300" />
              <p className="text-sm text-gray-400">No saved messages yet. Generate your first one above.</p>
            </div>
          )}

          {!loadingHistory && savedMessages.length > 0 && (
            <div className="space-y-3">
              {savedMessages.map((msg) => (
                <div key={msg.id} className="rounded-lg border border-gray-100 bg-white/60">
                  {/* Header row */}
                  <div className="flex items-center justify-between gap-3 p-3 sm:p-4">
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <div className="flex min-w-0 flex-col">
                        <span className="text-xs font-semibold text-gray-900">
                          {TEMPLATE_LABELS[msg.template_type]}
                        </span>
                        <span className="text-[10px] text-gray-400">
                          {format(new Date(msg.created_at), 'MMM d, yyyy h:mm a')}
                          {msg.relationship_duration && ` · ${msg.relationship_duration}`}
                        </span>
                      </div>
                      <span className="shrink-0 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-700 capitalize">
                        {msg.tone}
                      </span>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        onClick={() => setExpandedId(expandedId === msg.id ? null : msg.id)}
                        className="rounded-lg border border-gray-200 bg-white p-1.5 text-gray-500 hover:bg-gray-50 transition-colors"
                        title={expandedId === msg.id ? 'Collapse' : 'View'}
                      >
                        <FileText className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(msg.generated_message)
                            toast.success('Copied')
                          } catch {
                            toast.error('Copy failed')
                          }
                        }}
                        className="rounded-lg border border-gray-200 bg-white p-1.5 text-gray-500 hover:bg-gray-50 transition-colors"
                        title="Copy"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(msg.id)}
                        disabled={deletingId === msg.id}
                        className="rounded-lg border border-red-100 bg-white p-1.5 text-red-500 hover:bg-red-50 disabled:opacity-50 transition-colors"
                        title="Delete"
                      >
                        {deletingId === msg.id
                          ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          : <Trash2 className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </div>

                  {/* Expanded view */}
                  {expandedId === msg.id && (
                    <div className="border-t border-gray-100 p-3 sm:p-4">
                      <p className="whitespace-pre-wrap text-xs leading-relaxed text-gray-700">
                        {msg.generated_message}
                      </p>
                      {msg.legal_notes && (
                        <div className="mt-3 flex items-start gap-2 rounded-lg border border-blue-100 bg-blue-50/60 p-2.5">
                          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-500" />
                          <p className="whitespace-pre-wrap text-[10px] text-blue-800">{msg.legal_notes}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <ConfirmModal
        open={!!deleteConfirmId}
        onClose={() => setDeleteConfirmId(null)}
        onConfirm={() => deleteConfirmId && handleDelete(deleteConfirmId)}
        title="Delete this message?"
        message="This saved message will be permanently removed. This action cannot be undone."
      />
    </DashboardLayout>
  )
}
