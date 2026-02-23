import { useState, useEffect } from 'react'
import {
  X,
  FileText,
  Shield,
  Clock,
  Brain,
  TrendingUp,
  CheckCircle2,
  Lock,
  AlertTriangle,
  ChevronDown,
} from 'lucide-react'

const sampleEvidence = [
  { date: '12 Jan 2025', type: 'Screenshot', name: 'WhatsApp_chat_screenshot.png', size: '1.2 MB', encrypted: true },
  { date: '15 Jan 2025', type: 'Document', name: 'Rent_agreement_2024.pdf', size: '340 KB', encrypted: true },
  { date: '18 Jan 2025', type: 'Chat Export', name: 'WhatsApp_chat_with_spouse.txt', size: '86 KB', encrypted: true },
  { date: '22 Jan 2025', type: 'Photo', name: 'Property_documents.jpg', size: '2.1 MB', encrypted: true },
  { date: '28 Jan 2025', type: 'Bank Statement', name: 'SBI_statement_Dec2024.pdf', size: '520 KB', encrypted: true },
]

const sampleAnalysis = {
  platform: 'WhatsApp',
  messages: 847,
  riskScore: 68,
  keyFindings: [
    'Escalating tone detected across 12 messages (Oct–Dec 2024)',
    'Financial pressure language identified in 8 conversations',
    'Contradictory statements found on 3 separate dates',
  ],
}

const sampleFinancials = {
  grossIncome: '₹1,25,000',
  deductions: '₹18,500',
  rent: '₹22,000',
  disposableIncome: '₹84,500',
  period: 'January 2025',
}

interface Props {
  open: boolean
  onClose: () => void
}

export default function SampleCasePreview({ open, onClose }: Props) {
  const [activeTab, setActiveTab] = useState<'overview' | 'evidence' | 'analysis' | 'financials'>('overview')

  useEffect(() => {
    if (!open) return
    document.body.style.overflow = 'hidden'
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handleKey)
    return () => { document.body.style.overflow = ''; window.removeEventListener('keydown', handleKey) }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[200000] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Sample Case File Preview">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />

      <div className="relative w-full max-w-3xl max-h-[85vh] overflow-hidden rounded-2xl bg-white dark:bg-gray-950 shadow-2xl border border-gray-200 dark:border-gray-800 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-800 px-5 py-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-600 shadow-sm">
              <FileText className="h-4 w-4 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900 dark:text-white">Sample Case File</h2>
              <p className="text-xs text-gray-400">This is what your lawyer receives</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 dark:border-gray-800 px-5 shrink-0">
          {([
            { id: 'overview' as const, label: 'Overview' },
            { id: 'evidence' as const, label: 'Evidence Index' },
            { id: 'analysis' as const, label: 'AI Analysis' },
            { id: 'financials' as const, label: 'Financial Summary' },
          ]).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {/* Document-style wrapper */}
          <div className="mx-auto max-w-2xl rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-black shadow-sm">

            {/* Document header — shared */}
            <div className="border-b border-gray-100 dark:border-gray-800 px-6 py-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-primary-500">Confidential Case File</p>
                  <h3 className="mt-1 text-lg font-bold text-gray-900 dark:text-white">Case #BD-2025-00847</h3>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-400">Generated</p>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">02 Feb 2025</p>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-4 text-xs text-gray-400">
                <span className="flex items-center gap-1"><Shield className="h-3 w-3 text-green-500" /> Encrypted</span>
                <span className="flex items-center gap-1"><Lock className="h-3 w-3 text-blue-500" /> Tamper-proof</span>
                <span className="flex items-center gap-1"><Clock className="h-3 w-3 text-amber-500" /> Timestamped</span>
              </div>
            </div>

            {/* ─── OVERVIEW TAB ─── */}
            {activeTab === 'overview' && (
              <div className="p-6 space-y-5">
                <div>
                  <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-3">Case Summary</h4>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {[
                      { label: 'Evidence Files', value: '5', icon: Shield, color: 'text-blue-600' },
                      { label: 'Chats Analyzed', value: '1', icon: Brain, color: 'text-purple-600' },
                      { label: 'Risk Score', value: '68/100', icon: AlertTriangle, color: 'text-amber-600' },
                      { label: 'Financial Records', value: '1 month', icon: TrendingUp, color: 'text-emerald-600' },
                    ].map((stat) => (
                      <div key={stat.label} className="rounded-lg bg-gray-50 dark:bg-gray-900 p-3 text-center">
                        <stat.icon className={`mx-auto h-5 w-5 ${stat.color} mb-1`} />
                        <p className="text-lg font-bold text-gray-900 dark:text-white">{stat.value}</p>
                        <p className="text-[10px] text-gray-500">{stat.label}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-2">Timeline Highlights</h4>
                  <div className="space-y-2">
                    {[
                      { date: '12 Jan', event: 'First evidence uploaded — chat screenshots', color: 'bg-blue-500' },
                      { date: '18 Jan', event: 'WhatsApp conversation analyzed — Risk score: 68', color: 'bg-purple-500' },
                      { date: '22 Jan', event: 'Property documents added to vault', color: 'bg-blue-500' },
                      { date: '28 Jan', event: 'Financial records submitted — Affidavit generated', color: 'bg-emerald-500' },
                    ].map((item) => (
                      <div key={item.date} className="flex items-center gap-3">
                        <div className={`h-2 w-2 rounded-full ${item.color} shrink-0`} />
                        <span className="text-xs font-medium text-gray-500 dark:text-gray-400 w-12 shrink-0">{item.date}</span>
                        <span className="text-xs text-gray-700 dark:text-gray-300">{item.event}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-lg border border-primary-100 dark:border-primary-900/30 bg-primary-50/50 dark:bg-primary-900/10 p-3">
                  <p className="text-xs font-medium text-primary-700 dark:text-primary-300">
                    This case file contains organized evidence, AI conversation analysis, and financial summaries — structured for immediate legal review.
                  </p>
                </div>
              </div>
            )}

            {/* ─── EVIDENCE INDEX TAB ─── */}
            {activeTab === 'evidence' && (
              <div className="p-6">
                <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-3">Evidence Index ({sampleEvidence.length} files)</h4>
                <div className="divide-y divide-gray-100 dark:divide-gray-800 rounded-lg border border-gray-100 dark:border-gray-800 overflow-hidden">
                  {sampleEvidence.map((file, i) => (
                    <div key={i} className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-black">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-900">
                        <FileText className="h-4 w-4 text-gray-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{file.name}</p>
                        <p className="text-[10px] text-gray-400">{file.type} · {file.size}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs text-gray-500">{file.date}</p>
                        {file.encrypted && (
                          <span className="flex items-center gap-1 text-[10px] text-green-600 dark:text-green-400">
                            <Lock className="h-2.5 w-2.5" /> Encrypted
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <p className="mt-3 text-[11px] text-gray-400 italic">All files encrypted with AES-256 and integrity-verified with SHA-256 hashing.</p>
              </div>
            )}

            {/* ─── AI ANALYSIS TAB ─── */}
            {activeTab === 'analysis' && (
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-gray-900 dark:text-white">Conversation Analysis</h4>
                  <span className="rounded-full bg-amber-100 dark:bg-amber-900/30 px-2.5 py-1 text-xs font-bold text-amber-700 dark:text-amber-400">
                    Risk: {sampleAnalysis.riskScore}/100
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg bg-gray-50 dark:bg-gray-900 p-3">
                    <p className="text-[10px] text-gray-500 font-medium">Platform</p>
                    <p className="text-sm font-bold text-gray-900 dark:text-white">{sampleAnalysis.platform}</p>
                  </div>
                  <div className="rounded-lg bg-gray-50 dark:bg-gray-900 p-3">
                    <p className="text-[10px] text-gray-500 font-medium">Messages Analyzed</p>
                    <p className="text-sm font-bold text-gray-900 dark:text-white">{sampleAnalysis.messages}</p>
                  </div>
                </div>

                <div>
                  <h5 className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-2">Key Findings</h5>
                  <div className="space-y-2">
                    {sampleAnalysis.keyFindings.map((finding, i) => (
                      <div key={i} className="flex items-start gap-2.5 rounded-lg border border-amber-100 dark:border-amber-900/30 bg-amber-50/50 dark:bg-amber-900/10 p-3">
                        <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                        <p className="text-xs text-gray-700 dark:text-gray-300">{finding}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-lg bg-gray-50 dark:bg-gray-900 p-3">
                  <h5 className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">AI Summary</h5>
                  <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                    Analysis of 847 messages between Oct 2024 and Jan 2025 reveals a pattern of escalating tension with financial pressure as a recurring theme. Three instances of contradictory statements were identified across separate dates, which may be relevant for legal proceedings.
                  </p>
                </div>
              </div>
            )}

            {/* ─── FINANCIALS TAB ─── */}
            {activeTab === 'financials' && (
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-gray-900 dark:text-white">Financial Summary</h4>
                  <span className="text-xs text-gray-400">{sampleFinancials.period}</span>
                </div>

                <div className="divide-y divide-gray-100 dark:divide-gray-800 rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
                  {[
                    { label: 'Gross Monthly Income', value: sampleFinancials.grossIncome, bold: false },
                    { label: 'Tax & Statutory Deductions', value: `- ${sampleFinancials.deductions}`, bold: false },
                    { label: 'Rent / Housing', value: `- ${sampleFinancials.rent}`, bold: false },
                    { label: 'Disposable Income', value: sampleFinancials.disposableIncome, bold: true },
                  ].map((row) => (
                    <div key={row.label} className={`flex items-center justify-between px-4 py-3 ${row.bold ? 'bg-primary-50/50 dark:bg-primary-900/10' : 'bg-white dark:bg-black'}`}>
                      <span className={`text-sm ${row.bold ? 'font-bold text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-400'}`}>{row.label}</span>
                      <span className={`text-sm ${row.bold ? 'font-bold text-primary-600 dark:text-primary-400' : 'text-gray-900 dark:text-white'}`}>{row.value}</span>
                    </div>
                  ))}
                </div>

                <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    <h5 className="text-xs font-bold text-gray-700 dark:text-gray-300">Court-Format Affidavit</h5>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                    A formatted affidavit following Rajnesh v. Neha guidelines has been generated based on these records. This document is ready for legal submission with proper formatting and attestation fields.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 dark:border-gray-800 px-5 py-3 flex items-center justify-between shrink-0 bg-gray-50 dark:bg-gray-950">
          <p className="text-[11px] text-gray-400">Sample data — not a real case</p>
          <button onClick={onClose} className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-primary-700">
            <span>Start Building Yours</span>
            <ChevronDown className="h-3.5 w-3.5 rotate-[-90deg]" />
          </button>
        </div>
      </div>
    </div>
  )
}
