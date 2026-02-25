import {
  Lock,
  Brain,
  FileText,
  TrendingUp,
  Download,
  Shield,
  AlertTriangle,
  Image,
  File,
} from 'lucide-react'

type Variant = 'dashboard' | 'vault' | 'chat' | 'income'

export function DemoMock({ variant = 'dashboard', className = '' }: { variant?: Variant; className?: string }) {
  return (
    <div className={`relative overflow-hidden rounded-xl bg-gradient-to-br from-blue-50 via-yellow-50/30 to-white dark:bg-none dark:bg-gray-950 p-3 sm:p-5 select-none shadow-sm border border-gray-200/60 dark:border-gray-800 ${className}`}>
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-blue-100/20 via-transparent to-yellow-100/20 dark:from-transparent dark:to-transparent" />
      <div className="relative">
        {variant === 'dashboard' && <DashboardMock />}
        {variant === 'vault' && <VaultMock />}
        {variant === 'chat' && <ChatMock />}
        {variant === 'income' && <IncomeMock />}
      </div>
    </div>
  )
}

function DashboardMock() {
  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-500 dark:text-gray-500">Welcome back, Priya</p>

      <div className="grid grid-cols-4 gap-2">
        <div className="rounded-lg border border-gray-200/40 dark:border-gray-800 bg-indigo-50 dark:bg-gray-900/80 p-2 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[9px] uppercase tracking-wide text-gray-500 dark:text-gray-500">Vault</p>
              <p className="mt-0.5 text-lg font-bold text-gray-900 dark:text-white">12</p>
              <p className="text-[9px] text-gray-600 dark:text-gray-500">Files stored</p>
            </div>
            <div className="rounded-md p-1 bg-indigo-100 dark:bg-indigo-500/10">
              <Shield className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
            </div>
          </div>
        </div>
        <div className="rounded-lg border border-gray-200/40 dark:border-gray-800 bg-rose-50 dark:bg-gray-900/80 p-2 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[9px] uppercase tracking-wide text-gray-500 dark:text-gray-500">Avg Risk</p>
              <p className="mt-0.5 text-lg font-bold text-amber-600 dark:text-amber-400">68</p>
              <p className="text-[9px] text-gray-600 dark:text-gray-500">Moderate</p>
            </div>
            <div className="rounded-md p-1 bg-amber-100 dark:bg-amber-500/10">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
            </div>
          </div>
        </div>
        <div className="rounded-lg border border-gray-200/40 dark:border-gray-800 bg-amber-50 dark:bg-gray-900/80 p-2 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[9px] uppercase tracking-wide text-gray-500 dark:text-gray-500">Analyses</p>
              <p className="mt-0.5 text-lg font-bold text-gray-900 dark:text-white">4</p>
              <p className="text-[9px] text-gray-600 dark:text-gray-500">3 red flags</p>
            </div>
            <div className="rounded-md p-1 bg-blue-100 dark:bg-blue-500/10">
              <FileText className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>
        <div className="rounded-lg border border-gray-200/40 dark:border-gray-800 bg-emerald-50 dark:bg-gray-900/80 p-2 shadow-sm">
          <p className="text-[9px] uppercase tracking-wide text-gray-500 dark:text-gray-500">Readiness</p>
          <div className="mt-0.5 flex items-baseline gap-1">
            <span className="text-lg font-bold text-gray-900 dark:text-white">45</span>
            <span className="text-[10px] text-gray-500">/ 100</span>
          </div>
          <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800">
            <div className="h-full w-[45%] rounded-full bg-gradient-to-r from-blue-500 to-blue-600" />
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        <div className="flex-1 rounded-lg border border-gray-200/20 dark:border-gray-800 bg-white/50 dark:bg-gray-900/80 p-2.5 shadow-sm">
          <p className="mb-2 text-[10px] font-semibold text-gray-700 dark:text-gray-400">Quick Actions</p>
          <div className="space-y-1.5">
            {[
              { icon: Shield, label: 'Upload Evidence', color: 'text-blue-600 dark:text-blue-400' },
              { icon: Brain, label: 'Analyze a Chat', color: 'text-purple-600 dark:text-purple-400' },
              { icon: Download, label: 'Export Case File', color: 'text-amber-600 dark:text-amber-400' },
            ].map((a) => (
              <div key={a.label} className="flex items-center gap-2 rounded-md bg-gray-50/80 dark:bg-gray-800/60 px-2 py-1.5">
                <a.icon className={`h-3 w-3 ${a.color}`} />
                <span className="text-[10px] text-gray-700 dark:text-gray-300">{a.label}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="flex-1 rounded-lg border border-gray-200/20 dark:border-gray-800 bg-white/50 dark:bg-gray-900/80 p-2.5 shadow-sm">
          <p className="mb-2 text-[10px] font-semibold text-gray-700 dark:text-gray-400">Recent Activity</p>
          <div className="space-y-1.5">
            {[
              { text: 'WhatsApp chat analyzed', time: '2h ago', dot: 'bg-purple-500 dark:bg-purple-400' },
              { text: 'Screenshot uploaded', time: '5h ago', dot: 'bg-blue-500 dark:bg-blue-400' },
              { text: 'Income entry saved', time: '1d ago', dot: 'bg-emerald-500 dark:bg-emerald-400' },
            ].map((a) => (
              <div key={a.text} className="flex items-start gap-2">
                <div className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${a.dot}`} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[10px] text-gray-700 dark:text-gray-300">{a.text}</p>
                  <p className="text-[9px] text-gray-400 dark:text-gray-600">{a.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function VaultMock() {
  const files = [
    { icon: Image, name: 'WhatsApp_chat_Jan12.png', type: 'Screenshot', size: '1.2 MB', date: '12 Jan 2025', color: 'text-blue-600 dark:text-blue-400' },
    { icon: FileText, name: 'Rent_receipt_Dec.pdf', type: 'Document', size: '340 KB', date: '28 Dec 2024', color: 'text-green-600 dark:text-green-400' },
    { icon: File, name: 'Bank_transfer_proof.pdf', type: 'Receipt', size: '890 KB', date: '15 Dec 2024', color: 'text-orange-600 dark:text-orange-400' },
    { icon: Image, name: 'Property_agreement.jpg', type: 'Photo', size: '2.1 MB', date: '10 Dec 2024', color: 'text-blue-600 dark:text-blue-400' },
  ]

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Lock className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
          <p className="text-xs font-semibold text-gray-900 dark:text-white">Evidence Vault</p>
          <span className="rounded-full bg-emerald-100 dark:bg-emerald-500/20 px-1.5 py-0.5 text-[9px] font-medium text-emerald-700 dark:text-emerald-400">Encrypted</span>
        </div>
        <span className="text-[10px] text-gray-500">4 files - 4.5 MB</span>
      </div>

      <div className="space-y-1.5">
        {files.map((f) => (
          <div key={f.name} className="flex items-center gap-3 rounded-lg border border-gray-200/40 dark:border-gray-800 bg-white/60 dark:bg-gray-900/80 px-3 py-2 shadow-sm transition-colors hover:border-gray-300 dark:hover:border-gray-700">
            <f.icon className={`h-4 w-4 shrink-0 ${f.color}`} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[11px] font-medium text-gray-800 dark:text-gray-200">{f.name}</p>
              <p className="text-[9px] text-gray-500">{f.type} - {f.size}</p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-[9px] text-gray-500">{f.date}</p>
              <div className="mt-0.5 flex items-center gap-1">
                <Lock className="h-2.5 w-2.5 text-emerald-600 dark:text-emerald-500" />
                <span className="text-[8px] text-emerald-600 dark:text-emerald-500">AES-256</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <div className="flex-1">
          <div className="flex items-center justify-between text-[9px] text-gray-500">
            <span>Timeline</span>
            <span>Dec 2024 - Jan 2025</span>
          </div>
          <div className="mt-1 flex gap-0.5">
            {['bg-blue-500', 'bg-green-500', 'bg-orange-500', 'bg-blue-500'].map((c, i) => (
              <div key={i} className={`h-1.5 flex-1 rounded-full ${c}`} />
            ))}
            <div className="h-1.5 flex-[2] rounded-full bg-gray-200 dark:bg-gray-800" />
          </div>
        </div>
      </div>
    </div>
  )
}

function ChatMock() {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" />
          <p className="text-xs font-semibold text-gray-900 dark:text-white">Chat Analysis Results</p>
        </div>
        <span className="text-[10px] text-gray-500">WhatsApp - Jan 12, 2025</span>
      </div>

      <div className="flex gap-2">
        <div className="flex-1 rounded-lg border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 p-2.5 text-center">
          <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">68</p>
          <p className="text-[9px] font-medium text-amber-600/80 dark:text-amber-400/80">Risk Score</p>
          <div className="mx-auto mt-1 h-1 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800">
            <div className="h-full w-[68%] rounded-full bg-gradient-to-r from-amber-500 to-red-500" />
          </div>
        </div>
        <div className="flex-1 rounded-lg border border-gray-200/40 dark:border-gray-800 bg-white/60 dark:bg-gray-900/80 p-2.5 text-center shadow-sm">
          <p className="text-2xl font-bold text-gray-900 dark:text-white">3</p>
          <p className="text-[9px] text-gray-500">Red Flags</p>
        </div>
        <div className="flex-1 rounded-lg border border-gray-200/40 dark:border-gray-800 bg-white/60 dark:bg-gray-900/80 p-2.5 text-center shadow-sm">
          <p className="text-2xl font-bold text-gray-900 dark:text-white">7</p>
          <p className="text-[9px] text-gray-500">Patterns</p>
        </div>
      </div>

      <div className="space-y-1.5">
        <p className="text-[10px] font-semibold text-gray-600 dark:text-gray-400">Red Flags Detected</p>
        {[
          { severity: 'critical', label: 'Financial threat detected', lightBorder: 'border-red-200', darkBorder: 'dark:border-red-500/40', lightBg: 'bg-red-50', darkBg: 'dark:bg-red-500/10', dot: 'bg-red-500', lightText: 'text-red-700', darkText: 'dark:text-red-400' },
          { severity: 'high', label: 'Gaslighting pattern identified', lightBorder: 'border-orange-200', darkBorder: 'dark:border-orange-500/40', lightBg: 'bg-orange-50', darkBg: 'dark:bg-orange-500/10', dot: 'bg-orange-500', lightText: 'text-orange-700', darkText: 'dark:text-orange-400' },
          { severity: 'medium', label: 'Isolation language detected', lightBorder: 'border-amber-200', darkBorder: 'dark:border-amber-500/40', lightBg: 'bg-amber-50', darkBg: 'dark:bg-amber-500/10', dot: 'bg-amber-500', lightText: 'text-amber-700', darkText: 'dark:text-amber-400' },
        ].map((flag) => (
          <div key={flag.label} className={`flex items-center gap-2 rounded-lg border px-3 py-2 ${flag.lightBorder} ${flag.darkBorder} ${flag.lightBg} ${flag.darkBg}`}>
            <div className={`h-1.5 w-1.5 shrink-0 rounded-full ${flag.dot}`} />
            <span className={`text-[10px] font-medium ${flag.lightText} ${flag.darkText}`}>{flag.label}</span>
            <span className="ml-auto rounded-full bg-white/80 dark:bg-gray-800/80 px-1.5 py-0.5 text-[8px] uppercase text-gray-500 dark:text-gray-400">{flag.severity}</span>
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-gray-200/40 dark:border-gray-800 bg-white/60 dark:bg-gray-900/80 p-2.5 shadow-sm">
        <p className="text-[10px] font-semibold text-gray-600 dark:text-gray-400 mb-1">AI Summary</p>
        <p className="text-[10px] leading-relaxed text-gray-700 dark:text-gray-300">
          Multiple concerning patterns found. Financial control language appears 4 times. Emotional manipulation escalating over the last 3 conversations.
        </p>
      </div>
    </div>
  )
}

function IncomeMock() {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />
          <p className="text-xs font-semibold text-gray-900 dark:text-white">Income Tracker</p>
        </div>
        <span className="text-[10px] text-gray-500">January 2025</span>
      </div>

      <div className="grid grid-cols-4 gap-2">
        <div className="rounded-lg border border-gray-200/20 dark:border-gray-800 bg-white/50 dark:bg-gray-900/80 p-2 shadow-sm">
          <p className="text-[9px] uppercase tracking-wide text-gray-500">Gross Income</p>
          <p className="mt-0.5 text-sm font-bold text-gray-900 dark:text-white">₹1,20,000</p>
        </div>
        <div className="rounded-lg border border-red-200/40 dark:border-red-900/30 bg-red-50 dark:bg-red-500/5 p-2">
          <p className="text-[9px] uppercase tracking-wide text-red-600 dark:text-red-400">Deductions</p>
          <p className="mt-0.5 text-sm font-bold text-red-700 dark:text-red-400">-₹18,000</p>
        </div>
        <div className="rounded-lg border border-orange-200/40 dark:border-orange-900/30 bg-orange-50 dark:bg-orange-500/5 p-2">
          <p className="text-[9px] uppercase tracking-wide text-orange-600 dark:text-orange-400">Expenses</p>
          <p className="mt-0.5 text-sm font-bold text-orange-700 dark:text-orange-400">-₹45,000</p>
        </div>
        <div className="rounded-lg border border-blue-200/40 dark:border-blue-900/30 bg-blue-50 dark:bg-blue-500/5 p-2">
          <p className="text-[9px] uppercase tracking-wide text-blue-600 dark:text-blue-400">Disposable</p>
          <p className="mt-0.5 text-sm font-bold text-blue-700 dark:text-blue-400">₹57,000</p>
        </div>
      </div>

      <div className="rounded-lg border border-gray-200/20 dark:border-gray-800 bg-white/50 dark:bg-gray-900/80 p-2.5 shadow-sm">
        <p className="mb-2 text-[10px] font-semibold text-gray-600 dark:text-gray-400">Monthly Breakdown</p>
        <div className="space-y-1.5">
          {[
            { label: 'Salary', amount: '₹1,00,000', type: 'income' },
            { label: 'Rental Income', amount: '₹20,000', type: 'income' },
            { label: 'Income Tax (TDS)', amount: '-₹18,000', type: 'deduction' },
            { label: 'Rent', amount: '-₹25,000', type: 'expense' },
            { label: 'Utilities & Bills', amount: '-₹8,000', type: 'expense' },
            { label: 'EMI Payment', amount: '-₹12,000', type: 'expense' },
          ].map((row) => (
            <div key={row.label} className="flex items-center justify-between rounded-md bg-gray-50 dark:bg-gray-800/40 px-2.5 py-1.5">
              <span className="text-[10px] text-gray-700 dark:text-gray-300">{row.label}</span>
              <span className={`text-[10px] font-medium ${row.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : row.type === 'deduction' ? 'text-red-600 dark:text-red-400' : 'text-orange-600 dark:text-orange-400'}`}>
                {row.amount}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2 rounded-lg border border-teal-200 dark:border-teal-500/30 bg-teal-50 dark:bg-teal-500/10 px-3 py-2">
        <Download className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />
        <span className="text-[10px] font-medium text-teal-700 dark:text-teal-400">Generate Court-Format Affidavit (Rajnesh v. Neha)</span>
      </div>
    </div>
  )
}
