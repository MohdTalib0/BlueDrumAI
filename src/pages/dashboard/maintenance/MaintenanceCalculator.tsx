import { useState } from 'react'
import { Calculator, Loader2, CheckCircle2, AlertCircle, Info } from 'lucide-react'
import { useAuth } from '../../../context/AuthContext'
import { DashboardLayout } from '../../../layouts/DashboardLayout'
import { getEdgeFunctionUrl } from '../../../lib/api'

interface CalculationResult {
  id: string
  husband_net_income: number
  maintenance_for_wife: number
  maintenance_per_child: number
  total_maintenance: number
  percentage_applied: number
}

const LEGAL_BASES = [
  { value: 'section_125_crpc', label: 'Section 125 CrPC' },
  { value: 'hindu_marriage_act', label: 'Hindu Marriage Act' },
  { value: 'dv_act_2005', label: 'DV Act, 2005' },
  { value: 'other', label: 'Other' },
]

export default function MaintenanceCalculator() {
  const { sessionToken } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<CalculationResult | null>(null)

  const [husbandGross, setHusbandGross] = useState<number>(0)
  const [deductions, setDeductions] = useState({
    income_tax: 0,
    pf: 0,
    professional_tax: 0,
    emi: 0,
    other: 0,
  })
  const [wifeIncome, setWifeIncome] = useState<number>(0)
  const [numChildren, setNumChildren] = useState<number>(0)
  const [childrenAges, setChildrenAges] = useState<number[]>([])
  const [legalBasis, setLegalBasis] = useState('section_125_crpc')
  const [notes, setNotes] = useState('')

  const totalDeductions = Object.values(deductions).reduce((s, v) => s + (v || 0), 0)
  const netIncome = Math.max(husbandGross - totalDeductions, 0)

  const handleChildrenChange = (count: number) => {
    const clamped = Math.max(0, Math.min(count, 20))
    setNumChildren(clamped)
    setChildrenAges((prev) => {
      if (clamped > prev.length) {
        return [...prev, ...Array(clamped - prev.length).fill(5)]
      }
      return prev.slice(0, clamped)
    })
  }

  const handleChildAgeChange = (index: number, age: number) => {
    setChildrenAges((prev) => {
      const next = [...prev]
      next[index] = Math.max(0, Math.min(age, 25))
      return next
    })
  }

  const handleCalculate = async () => {
    if (husbandGross <= 0) {
      setError("Husband's gross income must be greater than zero")
      return
    }
    if (!sessionToken) {
      setError('Not authenticated')
      return
    }

    setLoading(true)
    setError('')
    setResult(null)

    try {
      const res = await fetch(`${getEdgeFunctionUrl('maintenance')}/calculate`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${sessionToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          husband_gross_income: husbandGross,
          husband_deductions: deductions,
          wife_income: wifeIncome,
          num_children: numChildren,
          children_ages: childrenAges,
          legal_basis: legalBasis,
          notes: notes || undefined,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Calculation failed' }))
        throw new Error(data.error || 'Calculation failed')
      }

      const data = await res.json()
      setResult(data.calculation)
    } catch (err: any) {
      setError(err.message || 'Calculation failed')
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (v: number) =>
    `₹${v.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`

  return (
    <DashboardLayout title="Calculate Maintenance" subtitle="Estimate your monthly maintenance entitlement" backHref="/dashboard/maintenance">
      <div className="w-full max-w-3xl mx-auto space-y-6">
        {error && (
          <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-red-800 shadow-sm">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Result Card */}
        {result && (
          <div className="rounded-xl border-2 border-teal-300 bg-gradient-to-br from-teal-50 to-teal-100/50 p-5 sm:p-6 shadow-md animate-in slide-in-from-top-5">
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle2 className="h-5 w-5 text-teal-600" />
              <h3 className="font-semibold text-teal-900">Calculation Result</h3>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-lg bg-white/80 p-3">
                <p className="text-[10px] sm:text-xs text-gray-500 font-medium">Husband Net Income</p>
                <p className="mt-0.5 text-base sm:text-lg font-bold text-gray-900">{formatCurrency(result.husband_net_income)}</p>
              </div>
              <div className="rounded-lg bg-white/80 p-3">
                <p className="text-[10px] sm:text-xs text-gray-500 font-medium">Wife Maintenance</p>
                <p className="mt-0.5 text-base sm:text-lg font-bold text-teal-700">{formatCurrency(result.maintenance_for_wife)}</p>
              </div>
              {numChildren > 0 && (
                <div className="rounded-lg bg-white/80 p-3">
                  <p className="text-[10px] sm:text-xs text-gray-500 font-medium">Per Child</p>
                  <p className="mt-0.5 text-base sm:text-lg font-bold text-blue-700">{formatCurrency(result.maintenance_per_child)}</p>
                </div>
              )}
              <div className="rounded-lg bg-teal-200/60 p-3">
                <p className="text-[10px] sm:text-xs text-teal-700 font-medium">Total Monthly</p>
                <p className="mt-0.5 text-base sm:text-lg font-bold text-teal-900">{formatCurrency(result.total_maintenance)}</p>
                <p className="text-[10px] text-teal-600">{result.percentage_applied}% of net income</p>
              </div>
            </div>
            <p className="mt-3 text-xs text-teal-700">
              Saved! You can view past calculations from the dashboard.
            </p>
          </div>
        )}

        {/* Husband's Income */}
        <div className="rounded-lg border border-gray-200/20 bg-white/50 p-4 sm:p-6 shadow-sm">
          <h3 className="mb-4 text-base font-semibold text-gray-900">Husband's Income Details</h3>
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Gross Monthly Income</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₹</span>
                <input
                  type="number"
                  min={0}
                  value={husbandGross || ''}
                  onChange={(e) => setHusbandGross(Math.max(0, parseFloat(e.target.value) || 0))}
                  placeholder="e.g. 100000"
                  className="w-full rounded-lg border border-gray-300 py-2.5 pl-7 pr-3 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <h4 className="mb-2 text-sm font-medium text-gray-700">Monthly Deductions</h4>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {[
                  { key: 'income_tax', label: 'Income Tax (TDS)' },
                  { key: 'pf', label: 'PF / EPF' },
                  { key: 'professional_tax', label: 'Professional Tax' },
                  { key: 'emi', label: 'EMI Payments' },
                  { key: 'other', label: 'Other Deductions' },
                ].map(({ key, label }) => (
                  <div key={key}>
                    <label className="mb-1 block text-xs text-gray-500">{label}</label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">₹</span>
                      <input
                        type="number"
                        min={0}
                        value={deductions[key as keyof typeof deductions] || ''}
                        onChange={(e) =>
                          setDeductions((prev) => ({ ...prev, [key]: Math.max(0, parseFloat(e.target.value) || 0) }))
                        }
                        className="w-full rounded-lg border border-gray-300 py-2 pl-6 pr-2 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-none"
                      />
                    </div>
                  </div>
                ))}
              </div>
              {totalDeductions > 0 && (
                <p className="mt-2 text-xs text-gray-500">
                  Net income: <span className="font-semibold text-gray-900">{formatCurrency(netIncome)}</span>
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Wife & Children */}
        <div className="rounded-lg border border-gray-200/20 bg-white/50 p-4 sm:p-6 shadow-sm">
          <h3 className="mb-4 text-base font-semibold text-gray-900">Your Details</h3>
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Your Monthly Income (if any)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₹</span>
                <input
                  type="number"
                  min={0}
                  value={wifeIncome || ''}
                  onChange={(e) => setWifeIncome(Math.max(0, parseFloat(e.target.value) || 0))}
                  placeholder="0 if no income"
                  className="w-full rounded-lg border border-gray-300 py-2.5 pl-7 pr-3 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-none"
                />
              </div>
              <p className="mt-1 text-xs text-gray-400">Leave blank or 0 if you have no independent income</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Number of Children</label>
                <input
                  type="number"
                  min={0}
                  max={20}
                  value={numChildren}
                  onChange={(e) => handleChildrenChange(parseInt(e.target.value) || 0)}
                  className="w-full rounded-lg border border-gray-300 py-2.5 px-3 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Legal Basis</label>
                <select
                  value={legalBasis}
                  onChange={(e) => setLegalBasis(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 py-2.5 px-3 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-none"
                >
                  {LEGAL_BASES.map((b) => (
                    <option key={b.value} value={b.value}>{b.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {numChildren > 0 && (
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Children's Ages</label>
                <div className="flex flex-wrap gap-2">
                  {childrenAges.map((age, i) => (
                    <div key={i} className="flex items-center gap-1">
                      <span className="text-xs text-gray-400">Child {i + 1}:</span>
                      <input
                        type="number"
                        min={0}
                        max={25}
                        value={age}
                        onChange={(e) => handleChildAgeChange(i, parseInt(e.target.value) || 0)}
                        className="w-16 rounded border border-gray-300 py-1 px-2 text-sm text-center focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-none"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Notes (optional)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any additional details..."
                rows={2}
                maxLength={2000}
                className="w-full rounded-lg border border-gray-300 py-2.5 px-3 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-none resize-none"
              />
            </div>
          </div>
        </div>

        {/* Calculate Button */}
        <button
          onClick={handleCalculate}
          disabled={loading || husbandGross <= 0}
          className="w-full min-h-[48px] rounded-lg bg-teal-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 transition-all"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 inline-block h-4 w-4 animate-spin" />
              Calculating...
            </>
          ) : (
            <>
              <Calculator className="mr-2 inline-block h-4 w-4" />
              Calculate Maintenance
            </>
          )}
        </button>

        {/* Disclaimer */}
        <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-4">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
            <div>
              <h4 className="text-sm font-semibold text-amber-900">Disclaimer</h4>
              <p className="mt-1 text-xs text-amber-800">
                This calculator provides an estimate based on general Indian court guidelines (Rajnesh v. Neha, 2020).
                Actual maintenance amounts vary based on specific circumstances, court jurisdiction, and judicial discretion.
                Always consult a qualified family law attorney for legal advice.
              </p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
