import { useState, useEffect } from 'react'
import { ChevronDown, ChevronUp, Scale, Lightbulb, FileText, Loader2, AlertCircle } from 'lucide-react'
import { useAuth } from '../../../context/AuthContext'
import { DashboardLayout } from '../../../layouts/DashboardLayout'
import { getEdgeFunctionUrl } from '../../../lib/api'

interface LegalSection {
  title: string
  key: string
  description: string
  eligibility: string[]
  keyPoints: string[]
}

interface ReferenceCase {
  name: string
  summary: string
}

interface RightsData {
  sections: LegalSection[]
  courtFilingTips: string[]
  referenceCases: ReferenceCase[]
}

export default function MaintenanceRights() {
  const { sessionToken } = useAuth()
  const [rights, setRights] = useState<RightsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [expandedSection, setExpandedSection] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    loadRights(controller.signal)
    return () => { controller.abort() }
  }, [])

  const loadRights = async (signal?: AbortSignal) => {
    try {
      if (!sessionToken) return
      const res = await fetch(`${getEdgeFunctionUrl('maintenance')}/rights`, {
        headers: { Authorization: `Bearer ${sessionToken}` },
        signal,
      })
      if (!res.ok) throw new Error('Failed to load rights information')
      const data = await res.json()
      setRights(data.rights)
      if (data.rights?.sections?.length > 0) {
        setExpandedSection(data.rights.sections[0].key)
      }
    } catch (err: any) {
      if (err.name === 'AbortError') return
      setError(err.message || 'Failed to load information')
    } finally {
      setLoading(false)
    }
  }

  const toggleSection = (key: string) => {
    setExpandedSection((prev) => (prev === key ? null : key))
  }

  if (loading) {
    return (
      <DashboardLayout title="Know Your Rights" subtitle="Maintenance rights under Indian law" backHref="/dashboard/maintenance">
        <div className="flex items-center justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout title="Know Your Rights" subtitle="Maintenance rights under Indian law" backHref="/dashboard/maintenance">
      <div className="w-full max-w-4xl mx-auto space-y-6">
        {error && (
          <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-red-800 shadow-sm dark:bg-black dark:border-red-700/40 dark:text-red-300">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {rights && (
          <>
            {/* Legal Provisions */}
            <div className="space-y-3">
              <h2 className="flex items-center gap-2 text-base font-semibold text-gray-900 dark:text-white">
                <Scale className="h-5 w-5 text-teal-600" />
                Legal Provisions
              </h2>

              {rights.sections.map((section) => {
                const isOpen = expandedSection === section.key
                return (
                  <div key={section.key} className="rounded-lg border border-gray-200/40 bg-white/50 shadow-sm overflow-hidden dark:bg-black dark:border-gray-700">
                    <button
                      onClick={() => toggleSection(section.key)}
                      className="w-full flex items-center justify-between p-4 sm:p-5 text-left hover:bg-gray-50/50 transition-colors dark:hover:bg-gray-900"
                    >
                      <h3 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white pr-4">{section.title}</h3>
                      {isOpen ? (
                        <ChevronUp className="h-5 w-5 text-gray-400 shrink-0" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-gray-400 shrink-0" />
                      )}
                    </button>

                    {isOpen && (
                      <div className="px-4 pb-4 sm:px-5 sm:pb-5 border-t border-gray-100 dark:border-gray-700">
                        <p className="mt-3 text-sm text-gray-700 dark:text-gray-300">{section.description}</p>

                        <div className="mt-4">
                          <h4 className="text-xs font-semibold uppercase tracking-wide text-teal-600 mb-2">Eligibility</h4>
                          <ul className="space-y-1.5">
                            {section.eligibility.map((item, i) => (
                              <li key={i} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                                <span className="mt-0.5 text-teal-500">•</span>
                                <span>{item}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div className="mt-4">
                          <h4 className="text-xs font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400 mb-2">Key Points</h4>
                          <ul className="space-y-1.5">
                            {section.keyPoints.map((point, i) => (
                              <li key={i} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                                <span className="mt-0.5 text-blue-500">•</span>
                                <span>{point}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Court Filing Tips */}
            <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-4 sm:p-6 shadow-sm dark:bg-black dark:border-yellow-700/40">
              <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-amber-900 dark:text-yellow-300">
                <Lightbulb className="h-5 w-5 text-amber-600" />
                Court Filing Tips
              </h2>
              <ul className="space-y-2">
                {rights.courtFilingTips.map((tip, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-amber-800 dark:text-yellow-300">
                    <span className="mt-0.5 font-bold text-amber-600">{i + 1}.</span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Reference Cases */}
            <div className="rounded-lg border border-gray-200/20 bg-white/50 p-4 sm:p-6 shadow-sm dark:bg-black dark:border-gray-700">
              <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-gray-900 dark:text-white">
                <FileText className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                Important Case Law
              </h2>
              <div className="space-y-4">
                {rights.referenceCases.map((c, i) => (
                  <div key={i} className="rounded-lg bg-gray-50 p-3 sm:p-4 dark:bg-gray-900">
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white">{c.name}</h4>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{c.summary}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Disclaimer */}
            <div className="rounded-lg border border-gray-200 bg-gray-50/50 p-4 dark:bg-black dark:border-gray-700">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                <strong>Disclaimer:</strong> This information is for educational purposes only and does not constitute legal advice.
                Laws and their interpretation may vary. Always consult a qualified family law attorney for advice specific to your situation.
              </p>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  )
}
