// PDF Generators for Edge Functions
// Ported from backend PDFKit implementations

import { PDFDocument, PDFFont, StandardFonts, rgb } from 'https://esm.sh/pdf-lib@1.17.1'
import {
  createPDFDocument,
  formatCurrency,
  formatDate,
  formatFileSize,
  getRiskLabel,
  getRiskColor,
  getSeverityColor,
  addWrappedText,
  addHeader,
  addFooter,
} from './pdf.ts'

// ============================================================================
// INCOME AFFIDAVIT PDF
// ============================================================================

export interface AffidavitData {
  userEmail: string
  monthYear: string // Format: YYYY-MM
  grossIncome: number
  deductions: {
    income_tax?: number
    pf?: number
    professional_tax?: number
    other?: number
  }
  expenses: {
    emi?: number
    medical?: number
    parents?: number
    rent?: number
    utilities?: number
    other?: number
  }
  disposableIncome: number
  notes?: string
}

export async function generateAffidavitPDF(data: AffidavitData): Promise<Uint8Array> {
  const pdfDoc = await createPDFDocument({
    title: 'Income Affidavit',
    author: 'Blue Drum AI',
    subject: 'Income and Expense Statement',
  })

  const page = pdfDoc.addPage([595, 842]) // A4 size
  const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const helveticaBoldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  const helveticaObliqueFont = await pdfDoc.embedFont(StandardFonts.HelveticaOblique)

  let y = 782 // Start from top

  // Header with border
  page.drawRectangle({
    x: 60,
    y: y - 80,
    width: 475,
    height: 80,
    borderColor: rgb(0, 0, 0),
    borderWidth: 1,
  })

  y = addHeader(page, helveticaFont, helveticaBoldFont, 'AFFIDAVIT', 'Income and Expense Statement')
  y -= 10

  page.drawText('Rajnesh v. Neha Compliant', {
    x: 297.5,
    y: y,
    size: 10,
    font: helveticaFont,
    color: rgb(0.4, 0.4, 0.4),
  })
  y -= 30

  // Date
  const currentDate = new Date().toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
  page.drawText(`Date: ${currentDate}`, {
    x: 475,
    y: y,
    size: 10,
    font: helveticaFont,
  })
  y -= 30

  // Introduction
  y = addWrappedText(page, helveticaFont, 11, 'I, the undersigned, hereby solemnly affirm and declare as under:', 60, y, 475)
  y -= 20

  // Personal Information
  page.drawText('1. Personal Information:', {
    x: 60,
    y: y,
    size: 11,
    font: helveticaBoldFont,
    color: rgb(0.118, 0.251, 0.686),
  })
  y -= 20
  page.drawText(`   Email: ${data.userEmail}`, {
    x: 60,
    y: y,
    size: 11,
    font: helveticaFont,
  })
  y -= 25

  // Income Period
  const monthDate = new Date(data.monthYear + '-01')
  const monthName = monthDate.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
  page.drawText('2. Income Period:', {
    x: 60,
    y: y,
    size: 11,
    font: helveticaBoldFont,
    color: rgb(0.118, 0.251, 0.686),
  })
  y -= 20
  page.drawText(`   Month: ${monthName}`, {
    x: 60,
    y: y,
    size: 11,
    font: helveticaFont,
  })
  y -= 25

  // Gross Income
  page.drawText('3. Gross Monthly Income:', {
    x: 60,
    y: y,
    size: 11,
    font: helveticaBoldFont,
    color: rgb(0.118, 0.251, 0.686),
  })
  y -= 20
  page.drawText(`   ${formatCurrency(data.grossIncome)}`, {
    x: 60,
    y: y,
    size: 11,
    font: helveticaFont,
  })
  y -= 25

  // Deductions
  page.drawText('4. Statutory Deductions:', {
    x: 60,
    y: y,
    size: 11,
    font: helveticaBoldFont,
    color: rgb(0.118, 0.251, 0.686),
  })
  y -= 20

  let totalDeductions = 0
  const deductionItems: Array<{ label: string; amount: number }> = []
  
  if (data.deductions.income_tax) {
    deductionItems.push({ label: 'Income Tax', amount: data.deductions.income_tax })
    totalDeductions += data.deductions.income_tax
  }
  if (data.deductions.pf) {
    deductionItems.push({ label: 'Provident Fund (PF)', amount: data.deductions.pf })
    totalDeductions += data.deductions.pf
  }
  if (data.deductions.professional_tax) {
    deductionItems.push({ label: 'Professional Tax', amount: data.deductions.professional_tax })
    totalDeductions += data.deductions.professional_tax
  }
  if (data.deductions.other) {
    deductionItems.push({ label: 'Other Deductions', amount: data.deductions.other })
    totalDeductions += data.deductions.other
  }

  if (deductionItems.length === 0) {
    page.drawText('   None', {
      x: 60,
      y: y,
      size: 11,
      font: helveticaFont,
    })
    y -= 20
  } else {
    for (const item of deductionItems) {
      page.drawText(`   ${item.label}: ${formatCurrency(item.amount)}`, {
        x: 60,
        y: y,
        size: 11,
        font: helveticaFont,
      })
      y -= 18
    }
    y -= 5
    page.drawText(`   Total Deductions: ${formatCurrency(totalDeductions)}`, {
      x: 60,
      y: y,
      size: 11,
      font: helveticaBoldFont,
    })
    y -= 25
  }

  // Expenses
  page.drawText('5. Necessary Monthly Expenses:', {
    x: 60,
    y: y,
    size: 11,
    font: helveticaBoldFont,
    color: rgb(0.118, 0.251, 0.686),
  })
  y -= 20

  let totalExpenses = 0
  const expenseItems: Array<{ label: string; amount: number }> = []
  
  if (data.expenses.emi) {
    expenseItems.push({ label: 'EMI / Loan Payments', amount: data.expenses.emi })
    totalExpenses += data.expenses.emi
  }
  if (data.expenses.medical) {
    expenseItems.push({ label: 'Medical Expenses', amount: data.expenses.medical })
    totalExpenses += data.expenses.medical
  }
  if (data.expenses.parents) {
    expenseItems.push({ label: 'Parents Support', amount: data.expenses.parents })
    totalExpenses += data.expenses.parents
  }
  if (data.expenses.rent) {
    expenseItems.push({ label: 'Rent', amount: data.expenses.rent })
    totalExpenses += data.expenses.rent
  }
  if (data.expenses.utilities) {
    expenseItems.push({ label: 'Utilities', amount: data.expenses.utilities })
    totalExpenses += data.expenses.utilities
  }
  if (data.expenses.other) {
    expenseItems.push({ label: 'Other Expenses', amount: data.expenses.other })
    totalExpenses += data.expenses.other
  }

  if (expenseItems.length === 0) {
    page.drawText('   None', {
      x: 60,
      y: y,
      size: 11,
      font: helveticaFont,
    })
    y -= 20
  } else {
    for (const item of expenseItems) {
      page.drawText(`   ${item.label}: ${formatCurrency(item.amount)}`, {
        x: 60,
        y: y,
        size: 11,
        font: helveticaFont,
      })
      y -= 18
    }
    y -= 5
    page.drawText(`   Total Expenses: ${formatCurrency(totalExpenses)}`, {
      x: 60,
      y: y,
      size: 11,
      font: helveticaBoldFont,
    })
    y -= 30
  }

  // Disposable Income - Highlighted box
  page.drawRectangle({
    x: 60,
    y: y - 50,
    width: 475,
    height: 50,
    color: rgb(0.878, 0.906, 1.0), // #e0e7ff
    borderColor: rgb(0.231, 0.510, 0.965), // #3b82f6
    borderWidth: 2,
  })
  page.drawText('6. Disposable Income:', {
    x: 80,
    y: y - 5,
    size: 12,
    font: helveticaBoldFont,
    color: rgb(0.118, 0.251, 0.686),
  })
  page.drawText(formatCurrency(data.disposableIncome), {
    x: 80,
    y: y - 25,
    size: 16,
    font: helveticaBoldFont,
    color: rgb(0.118, 0.251, 0.686),
  })
  page.drawText('(Gross Income - Statutory Deductions - Necessary Expenses)', {
    x: 80,
    y: y - 45,
    size: 9,
    font: helveticaFont,
    color: rgb(0.4, 0.4, 0.4),
  })
  y -= 70

  // Calculation Formula Box
  page.drawRectangle({
    x: 60,
    y: y - 30,
    width: 475,
    height: 30,
    color: rgb(0.953, 0.957, 0.961), // #f3f4f6
    borderColor: rgb(0.612, 0.639, 0.686), // #9ca3af
    borderWidth: 1,
  })
  page.drawText('Calculation Formula:', {
    x: 80,
    y: y - 5,
    size: 10,
    font: helveticaObliqueFont,
    color: rgb(0.216, 0.255, 0.318), // #374151
  })
  page.drawText('Disposable Income = Gross Income - Deductions - Expenses', {
    x: 80,
    y: y - 20,
    size: 10,
    font: helveticaFont,
    color: rgb(0.216, 0.255, 0.318),
  })
  y -= 50

  // Notes
  if (data.notes && data.notes.trim()) {
    page.drawText('7. Additional Notes:', {
      x: 60,
      y: y,
      size: 11,
      font: helveticaBoldFont,
      color: rgb(0.118, 0.251, 0.686),
    })
    y -= 20
    y = await addWrappedText(page, helveticaFont, 10, data.notes, 60, y, 475)
    y -= 20
  }

  // Legal Compliance Statement
  y -= 20
  page.drawRectangle({
    x: 60,
    y: y - 60,
    width: 475,
    height: 60,
    color: rgb(0.859, 0.918, 0.996), // #dbeafe
    borderColor: rgb(0.231, 0.510, 0.965), // #3b82f6
    borderWidth: 1,
  })
  page.drawText('Legal Compliance:', {
    x: 80,
    y: y - 5,
    size: 10,
    font: helveticaBoldFont,
    color: rgb(0.118, 0.251, 0.686),
  })
  y = addWrappedText(
    page,
    helveticaFont,
    9,
    'This affidavit is prepared in accordance with the guidelines laid down by the Hon\'ble Supreme Court of India in the case of Rajnesh v. Neha (2021) for calculating disposable income for maintenance purposes.',
    80,
    y - 25,
    435,
    rgb(0.078, 0.227, 0.541) // #1e3a8a
  )
  y -= 30

  // Declaration
  page.drawText('DECLARATION:', {
    x: 60,
    y: y,
    size: 11,
    font: helveticaBoldFont,
  })
  y -= 20
  y = addWrappedText(
    page,
    helveticaFont,
    10,
    'I solemnly affirm that the above statements are true and correct to the best of my knowledge and belief. I understand that any false statement made herein may attract penal consequences under the law.',
    60,
    y,
    475
  )
  y -= 40

  // Signature Section
  page.drawText('_________________________', {
    x: 60,
    y: y,
    size: 10,
    font: helveticaFont,
  })
  y -= 15
  page.drawText('Signature of Deponent', {
    x: 60,
    y: y,
    size: 10,
    font: helveticaBoldFont,
  })
  y -= 15
  page.drawText(`Date: ${currentDate}`, {
    x: 60,
    y: y,
    size: 10,
    font: helveticaFont,
  })
  y -= 20
  page.drawText('Place: _________________________', {
    x: 60,
    y: y,
    size: 10,
    font: helveticaFont,
  })

  // Footer
  addFooter(page, helveticaObliqueFont, 'Generated by Blue Drum AI - Evidence-based legal vigilance')

  const pdfBytes = await pdfDoc.save()
  return pdfBytes
}

// ============================================================================
// VAULT PDF
// ============================================================================

export interface VaultEntry {
  id: string
  type: 'photo' | 'document' | 'ticket' | 'receipt' | 'other'
  file_url: string
  description?: string
  metadata?: {
    filename: string
    mimeType: string
    size: number
    uploadedAt: string
    location?: { lat: number; lng: number }
    dateTaken?: string
  }
  created_at: string
}

export interface VaultPDFData {
  userId: string
  userEmail: string
  entries: VaultEntry[]
  generatedAt: string
}

export async function generateVaultPDF(data: VaultPDFData): Promise<Uint8Array> {
  const pdfDoc = await createPDFDocument({
    title: 'Evidence Vault Export',
    author: 'Blue Drum AI',
    subject: 'Legal Evidence Documentation',
  })

  const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const helveticaBoldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  const helveticaObliqueFont = await pdfDoc.embedFont(StandardFonts.HelveticaOblique)

  let page = pdfDoc.addPage([595, 842]) // A4
  let y = 792

  // Header
  y = addHeader(page, helveticaFont, helveticaBoldFont, 'EVIDENCE VAULT EXPORT', 'Generated by Blue Drum AI - Evidence-based legal vigilance')
  y -= 20

  // User Information
  page.drawText('User Information', {
    x: 60,
    y: y,
    size: 12,
    font: helveticaBoldFont,
    color: rgb(0.118, 0.227, 0.541), // #1e3a8a
  })
  y -= 20
  page.drawText(`Email: ${data.userEmail}`, {
    x: 80,
    y: y,
    size: 10,
    font: helveticaFont,
    color: rgb(0.216, 0.255, 0.318), // #374151
  })
  y -= 15
  page.drawText(`Export Date: ${formatDate(data.generatedAt)}`, {
    x: 80,
    y: y,
    size: 10,
    font: helveticaFont,
    color: rgb(0.216, 0.255, 0.318),
  })
  y -= 15
  page.drawText(`Total Entries: ${data.entries.length}`, {
    x: 80,
    y: y,
    size: 10,
    font: helveticaFont,
    color: rgb(0.216, 0.255, 0.318),
  })
  y -= 30

  // Summary Statistics
  const typeCounts = data.entries.reduce((acc, entry) => {
    acc[entry.type] = (acc[entry.type] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  page.drawText('Summary', {
    x: 60,
    y: y,
    size: 12,
    font: helveticaBoldFont,
    color: rgb(0.118, 0.227, 0.541),
  })
  y -= 20
  for (const [type, count] of Object.entries(typeCounts)) {
    page.drawText(`${type.charAt(0).toUpperCase() + type.slice(1)}: ${count}`, {
      x: 80,
      y: y,
      size: 10,
      font: helveticaFont,
      color: rgb(0.216, 0.255, 0.318),
    })
    y -= 15
  }
  y -= 20

  // Timeline of Entries
  const sortedEntries = [...data.entries].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())

  page.drawText('EVIDENCE TIMELINE', {
    x: 297.5,
    y: y,
    size: 14,
    font: helveticaBoldFont,
    color: rgb(0.118, 0.251, 0.686),
  })
  y -= 30

  for (let index = 0; index < sortedEntries.length; index++) {
    const entry = sortedEntries[index]

    // Check if we need a new page
    if (y < 100) {
      page = pdfDoc.addPage([595, 842])
      y = 792
    }

    // Entry Header
    const entryDate = formatDate(entry.created_at)
    page.drawText(`Entry ${index + 1}: ${entry.type.charAt(0).toUpperCase() + entry.type.slice(1)}`, {
      x: 60,
      y: y,
      size: 11,
      font: helveticaBoldFont,
      color: rgb(0.118, 0.227, 0.541),
    })
    y -= 20

    // Entry Details Box
    const boxY = y
    page.drawRectangle({
      x: 60,
      y: boxY - 80,
      width: 475,
      height: 80,
      borderColor: rgb(0.898, 0.906, 0.922), // #e5e7eb
      borderWidth: 1,
    })

    let detailY = boxY - 10
    page.drawText(`Date Uploaded: ${entryDate}`, {
      x: 70,
      y: detailY,
      size: 9,
      font: helveticaFont,
      color: rgb(0.216, 0.255, 0.318),
    })
    detailY -= 15

    if (entry.metadata?.filename) {
      page.drawText(`Filename: ${entry.metadata.filename}`, {
        x: 70,
        y: detailY,
        size: 9,
        font: helveticaFont,
        color: rgb(0.216, 0.255, 0.318),
      })
      detailY -= 15
    }

    if (entry.metadata?.size) {
      page.drawText(`File Size: ${formatFileSize(entry.metadata.size)}`, {
        x: 70,
        y: detailY,
        size: 9,
        font: helveticaFont,
        color: rgb(0.216, 0.255, 0.318),
      })
      detailY -= 15
    }

    if (entry.metadata?.dateTaken) {
      page.drawText(`Date Taken: ${formatDate(entry.metadata.dateTaken)}`, {
        x: 70,
        y: detailY,
        size: 9,
        font: helveticaFont,
        color: rgb(0.216, 0.255, 0.318),
      })
      detailY -= 15
    }

    if (entry.metadata?.location) {
      page.drawText(
        `Location: ${entry.metadata.location.lat.toFixed(6)}, ${entry.metadata.location.lng.toFixed(6)}`,
        {
          x: 70,
          y: detailY,
          size: 9,
          font: helveticaFont,
          color: rgb(0.216, 0.255, 0.318),
        }
      )
      detailY -= 15
    }

    if (entry.description) {
      page.drawText(`Description: ${entry.description}`, {
        x: 70,
        y: detailY,
        size: 9,
        font: helveticaFont,
        color: rgb(0.216, 0.255, 0.318),
      })
    }

    y = boxY - 90
    y -= 20

    // File URL
    page.drawText(`File Reference: ${entry.file_url}`, {
      x: 70,
      y: y,
      size: 8,
      font: helveticaObliqueFont,
      color: rgb(0.612, 0.639, 0.686),
    })
    y -= 25
  }

  // Add footer to all pages
  const pages = pdfDoc.getPages()
  for (let i = 0; i < pages.length; i++) {
    const currentPage = pages[i]
    addFooter(
      currentPage,
      helveticaObliqueFont,
      `Page ${i + 1} of ${pages.length} | Generated by Blue Drum AI - Evidence-based legal vigilance`
    )
  }

  const pdfBytes = await pdfDoc.save()
  return pdfBytes
}

// ============================================================================
// CHAT ANALYSIS PDF
// ============================================================================

export interface ChatAnalysisPDFData {
  userEmail: string
  analysis: {
    riskScore: number
    summary: string
    redFlags: Array<{
      type: string
      severity: 'low' | 'medium' | 'high' | 'critical'
      message: string
      context?: string
    }>
    recommendations: string[]
    patternsDetected: Array<{
      pattern: string
      description: string
      examples?: string[]
    }>
    keywordsDetected: string[]
    createdAt: string
    chatStats?: {
      totalMessages: number
      participants: string[]
      dateRange: { start: string; end: string }
    }
  }
}

export async function generateChatAnalysisPDF(data: ChatAnalysisPDFData): Promise<Uint8Array> {
  const pdfDoc = await createPDFDocument({
    title: 'Chat Analysis Report',
    author: 'Blue Drum AI',
    subject: 'Chat Analysis and Risk Assessment',
  })

  const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const helveticaBoldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  const helveticaObliqueFont = await pdfDoc.embedFont(StandardFonts.HelveticaOblique)

  let page = pdfDoc.addPage([595, 842]) // A4
  let y = 792

  // Header
  y = addHeader(
    page,
    helveticaFont,
    helveticaBoldFont,
    'Chat Analysis Report',
    `Generated: ${new Date(data.analysis.createdAt).toLocaleString('en-IN')}`
  )
  y -= 30

  // User Info
  page.drawText('User Information', {
    x: 60,
    y: y,
    size: 12,
    font: helveticaBoldFont,
    color: rgb(0.067, 0.094, 0.153), // #111827
  })
  y -= 20
  page.drawText(`Email: ${data.userEmail}`, {
    x: 80,
    y: y,
    size: 10,
    font: helveticaFont,
    color: rgb(0.216, 0.255, 0.318),
  })
  y -= 15

  if (data.analysis.chatStats) {
    page.drawText(`Participants: ${data.analysis.chatStats.participants.join(', ')}`, {
      x: 80,
      y: y,
      size: 10,
      font: helveticaFont,
      color: rgb(0.216, 0.255, 0.318),
    })
    y -= 15
    page.drawText(`Total Messages: ${data.analysis.chatStats.totalMessages}`, {
      x: 80,
      y: y,
      size: 10,
      font: helveticaFont,
      color: rgb(0.216, 0.255, 0.318),
    })
    y -= 15
    page.drawText(
      `Date Range: ${new Date(data.analysis.chatStats.dateRange.start).toLocaleDateString('en-IN')} to ${new Date(data.analysis.chatStats.dateRange.end).toLocaleDateString('en-IN')}`,
      {
        x: 80,
        y: y,
        size: 10,
        font: helveticaFont,
        color: rgb(0.216, 0.255, 0.318),
      }
    )
    y -= 20
  }

  // Risk Score
  const riskColor = getRiskColor(data.analysis.riskScore)
  page.drawText(`Risk Score: ${data.analysis.riskScore}/100`, {
    x: 297.5,
    y: y,
    size: 16,
    font: helveticaBoldFont,
    color: riskColor,
  })
  y -= 20
  page.drawText(`Risk Level: ${getRiskLabel(data.analysis.riskScore)}`, {
    x: 297.5,
    y: y,
    size: 12,
    font: helveticaFont,
    color: rgb(0.216, 0.255, 0.318),
  })
  y -= 30

  // Summary
  page.drawText('Executive Summary', {
    x: 60,
    y: y,
    size: 12,
    font: helveticaBoldFont,
    color: rgb(0.067, 0.094, 0.153),
    underline: true,
  })
  y -= 20
  y = await addWrappedText(page, helveticaFont, 10, data.analysis.summary, 80, y, 435)
  y -= 20

  // Red Flags
  if (data.analysis.redFlags && data.analysis.redFlags.length > 0) {
    if (y < 100) {
      page = pdfDoc.addPage([595, 842])
      y = 792
    }

    page.drawText(`Red Flags Detected (${data.analysis.redFlags.length})`, {
      x: 60,
      y: y,
      size: 12,
      font: helveticaBoldFont,
      color: rgb(0.067, 0.094, 0.153),
    })
    y -= 20

    for (let index = 0; index < data.analysis.redFlags.length; index++) {
      const flag = data.analysis.redFlags[index]

      if (y < 100) {
        page = pdfDoc.addPage([595, 842])
        y = 792
      }

      const severityColor = getSeverityColor(flag.severity)
      page.drawText(`${index + 1}. ${flag.type} [${flag.severity.toUpperCase()}]`, {
        x: 80,
        y: y,
        size: 10,
        font: helveticaBoldFont,
        color: severityColor,
      })
      y -= 15
      y = addWrappedText(page, helveticaFont, 9, flag.message, 100, y, 395)
      y -= 10

      if (flag.context) {
        y = addWrappedText(
          page,
          helveticaObliqueFont,
          8,
          `Context: ${flag.context.substring(0, 150)}...`,
          100,
          y,
          395,
          rgb(0.420, 0.451, 0.502) // #6b7280
        )
        y -= 10
      }
      y -= 15
    }
  }

  // Patterns Detected
  if (data.analysis.patternsDetected && data.analysis.patternsDetected.length > 0) {
    if (y < 100) {
      page = pdfDoc.addPage([595, 842])
      y = 792
    }

    page.drawText(`Behavioral Patterns (${data.analysis.patternsDetected.length})`, {
      x: 60,
      y: y,
      size: 12,
      font: helveticaBoldFont,
      color: rgb(0.067, 0.094, 0.153),
    })
    y -= 20

    for (let index = 0; index < data.analysis.patternsDetected.length; index++) {
      const pattern = data.analysis.patternsDetected[index]

      if (y < 100) {
        page = pdfDoc.addPage([595, 842])
        y = 792
      }

      page.drawText(`${index + 1}. ${pattern.pattern}`, {
        x: 80,
        y: y,
        size: 10,
        font: helveticaBoldFont,
        color: rgb(0.486, 0.227, 0.929), // #7c3aed
      })
      y -= 15
      y = addWrappedText(page, helveticaFont, 9, pattern.description, 100, y, 395)
      y -= 10

      if (pattern.examples && pattern.examples.length > 0) {
        y = addWrappedText(
          page,
          helveticaObliqueFont,
          8,
          `Examples: ${pattern.examples.slice(0, 2).join('; ')}`,
          100,
          y,
          395,
          rgb(0.420, 0.451, 0.502)
        )
        y -= 10
      }
      y -= 15
    }
  }

  // Recommendations
  if (data.analysis.recommendations && data.analysis.recommendations.length > 0) {
    if (y < 100) {
      page = pdfDoc.addPage([595, 842])
      y = 792
    }

    page.drawText('Recommendations', {
      x: 60,
      y: y,
      size: 12,
      font: helveticaBoldFont,
      color: rgb(0.067, 0.094, 0.153),
    })
    y -= 20

    for (let index = 0; index < data.analysis.recommendations.length; index++) {
      const rec = data.analysis.recommendations[index]

      if (y < 50) {
        page = pdfDoc.addPage([595, 842])
        y = 792
      }

      page.drawText(`${index + 1}. ${rec}`, {
        x: 80,
        y: y,
        size: 9,
        font: helveticaFont,
        color: rgb(0.216, 0.255, 0.318),
      })
      y -= 18
    }
  }

  // Keywords
  if (data.analysis.keywordsDetected && data.analysis.keywordsDetected.length > 0) {
    if (y < 100) {
      page = pdfDoc.addPage([595, 842])
      y = 792
    }

    page.drawText(`Keywords Detected (${data.analysis.keywordsDetected.length})`, {
      x: 60,
      y: y,
      size: 12,
      font: helveticaBoldFont,
      color: rgb(0.067, 0.094, 0.153),
    })
    y -= 20
    page.drawText(data.analysis.keywordsDetected.join(', '), {
      x: 80,
      y: y,
      size: 9,
      font: helveticaFont,
      color: rgb(0.216, 0.255, 0.318),
    })
  }

  // Footer
  const pages = pdfDoc.getPages()
  for (let i = 0; i < pages.length; i++) {
    const currentPage = pages[i]
    addFooter(
      currentPage,
      helveticaObliqueFont,
      'Generated by Blue Drum AI - Evidence-based legal vigilance'
    )
  }

  const pdfBytes = await pdfDoc.save()
  return pdfBytes
}

