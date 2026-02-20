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

  const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const boldFont    = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  const italicFont  = await pdfDoc.embedFont(StandardFonts.HelveticaOblique)

  // ── Layout constants ──────────────────────────────────────────────────────
  const PAGE_W   = 595
  const PAGE_H   = 842
  const MARGIN_X = 50
  const CONTENT_W = PAGE_W - MARGIN_X * 2   // 495
  const MIN_Y    = 80   // footer reserve

  // ── Colour palette ────────────────────────────────────────────────────────
  const BLUE        = rgb(0.118, 0.251, 0.686)  // #1e40af
  const LIGHT_BLUE  = rgb(0.859, 0.918, 0.996)  // #dbeafe
  const DARK        = rgb(0.118, 0.137, 0.165)  // #1e2329
  const MUTED       = rgb(0.42, 0.45, 0.50)     // #6b7280
  const GREY_BG     = rgb(0.953, 0.957, 0.961)  // #f3f4f6
  const BORDER_GREY = rgb(0.80, 0.82, 0.85)
  const GREEN       = rgb(0.059, 0.541, 0.271)  // #0f8a45

  // ── Page management ───────────────────────────────────────────────────────
  let currentPage = pdfDoc.addPage([PAGE_W, PAGE_H])
  let y = PAGE_H - MARGIN_X

  function addNewPage() {
    addFooter(currentPage, italicFont, 'Blue Drum AI | Income Affidavit | Confidential')
    currentPage = pdfDoc.addPage([PAGE_W, PAGE_H])
    y = PAGE_H - MARGIN_X
  }

  function checkBreak(needed = 60) {
    if (y < MIN_Y + needed) addNewPage()
  }

  // ── Drawing helpers ───────────────────────────────────────────────────────
  function drawText(text: string, x: number, yPos: number, font: PDFFont, size: number, color = DARK) {
    currentPage.drawText(text, { x, y: yPos, size, font, color })
  }

  function drawCenteredText(text: string, yPos: number, font: PDFFont, size: number, color = DARK) {
    const w = font.widthOfTextAtSize(text, size)
    drawText(text, (PAGE_W - w) / 2, yPos, font, size, color)
  }

  function drawRightText(text: string, yPos: number, font: PDFFont, size: number, color = DARK) {
    const w = font.widthOfTextAtSize(text, size)
    drawText(text, PAGE_W - MARGIN_X - w, yPos, font, size, color)
  }

  function wrappedText(text: string, x: number, yPos: number, maxW: number, font: PDFFont, size: number, color = DARK, lineH = size * 1.5): number {
    const words = text.split(' ')
    const lines: string[] = []
    let line = ''
    for (const word of words) {
      const test = line ? `${line} ${word}` : word
      if (font.widthOfTextAtSize(test, size) > maxW && line) {
        lines.push(line); line = word
      } else {
        line = test
      }
    }
    if (line) lines.push(line)
    let cy = yPos
    for (const l of lines) {
      drawText(l, x, cy, font, size, color)
      cy -= lineH
    }
    return cy
  }

  function drawHRule(yPos: number, color = BORDER_GREY) {
    currentPage.drawLine({ start: { x: MARGIN_X, y: yPos }, end: { x: PAGE_W - MARGIN_X, y: yPos }, thickness: 0.5, color })
  }

  function drawRect(x: number, yPos: number, w: number, h: number, fillColor?: { r: number; g: number; b: number }, borderColor?: { r: number; g: number; b: number }, bw = 1) {
    currentPage.drawRectangle({ x, y: yPos, width: w, height: h, ...(fillColor ? { color: fillColor } : {}), ...(borderColor ? { borderColor, borderWidth: bw } : {}) })
  }

  function sectionLabel(num: string, label: string) {
    checkBreak(50)
    drawRect(MARGIN_X, y - 2, 3, 16, BLUE)
    drawText(`${num}.  ${label}`, MARGIN_X + 10, y, boldFont, 10, BLUE)
    y -= 20
  }

  function dataRow(label: string, value: string, bold = false) {
    drawText(label, MARGIN_X + 14, y, bold ? boldFont : regularFont, 10, MUTED)
    drawRightText(value, y, bold ? boldFont : regularFont, 10, bold ? DARK : DARK)
    y -= 16
  }

  // ──────────────────────────────────────────────────────────────────────────
  // HEADER
  // ──────────────────────────────────────────────────────────────────────────
  const HEADER_H = 100
  drawRect(0, PAGE_H - HEADER_H, PAGE_W, HEADER_H, BLUE)

  drawCenteredText('INCOME AFFIDAVIT', y - 12, boldFont, 20, rgb(1, 1, 1))
  drawCenteredText('Income and Expense Statement', y - 36, regularFont, 11, rgb(0.8, 0.87, 1))
  drawCenteredText('Rajnesh v. Neha (2021) Compliant', y - 55, italicFont, 9, rgb(0.7, 0.78, 0.95))

  y = PAGE_H - HEADER_H - 20

  // ── Date & Reference row ─────────────────────────────────────────────────
  const currentDate = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
  const monthDate   = new Date(data.monthYear + '-01')
  const monthName   = monthDate.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })

  drawText(`Period: ${monthName}`, MARGIN_X, y, regularFont, 9, MUTED)
  drawRightText(`Date: ${currentDate}`, y, regularFont, 9, MUTED)
  y -= 8
  drawHRule(y)
  y -= 18

  // ── Intro ────────────────────────────────────────────────────────────────
  y = wrappedText(
    'I, the undersigned, hereby solemnly affirm and declare as under:',
    MARGIN_X, y, CONTENT_W, italicFont, 10, DARK
  )
  y -= 16

  // ── 1. Personal Information ───────────────────────────────────────────────
  sectionLabel('1', 'Personal Information')
  dataRow('Email Address', data.userEmail)
  y -= 8

  // ── 2. Income Period ──────────────────────────────────────────────────────
  sectionLabel('2', 'Income Period')
  dataRow('Month', monthName)
  y -= 8

  // ── 3. Gross Monthly Income ───────────────────────────────────────────────
  sectionLabel('3', 'Gross Monthly Income')
  drawText(formatCurrency(data.grossIncome), MARGIN_X + 14, y, boldFont, 14, GREEN)
  y -= 22

  // ── 4. Statutory Deductions ───────────────────────────────────────────────
  let totalDeductions = 0
  const deductionItems: Array<{ label: string; amount: number }> = []
  if (data.deductions.income_tax)       { deductionItems.push({ label: 'Income Tax',            amount: data.deductions.income_tax });       totalDeductions += data.deductions.income_tax }
  if (data.deductions.pf)               { deductionItems.push({ label: 'Provident Fund (PF)',    amount: data.deductions.pf });               totalDeductions += data.deductions.pf }
  if (data.deductions.professional_tax) { deductionItems.push({ label: 'Professional Tax',       amount: data.deductions.professional_tax }); totalDeductions += data.deductions.professional_tax }
  if (data.deductions.other)            { deductionItems.push({ label: 'Other Deductions',       amount: data.deductions.other });            totalDeductions += data.deductions.other }

  sectionLabel('4', 'Statutory Deductions')
  if (deductionItems.length === 0) {
    drawText('None', MARGIN_X + 14, y, italicFont, 10, MUTED); y -= 16
  } else {
    for (const item of deductionItems) { dataRow(item.label, formatCurrency(item.amount)) }
    drawHRule(y + 4, BORDER_GREY); y -= 6
    dataRow('Total Deductions', formatCurrency(totalDeductions), true)
  }
  y -= 8

  // ── 5. Necessary Monthly Expenses ────────────────────────────────────────
  let totalExpenses = 0
  const expenseItems: Array<{ label: string; amount: number }> = []
  if (data.expenses.emi)        { expenseItems.push({ label: 'EMI / Loan Payments', amount: data.expenses.emi });      totalExpenses += data.expenses.emi }
  if (data.expenses.medical)    { expenseItems.push({ label: 'Medical Expenses',     amount: data.expenses.medical });  totalExpenses += data.expenses.medical }
  if (data.expenses.parents)    { expenseItems.push({ label: 'Parents Support',      amount: data.expenses.parents });  totalExpenses += data.expenses.parents }
  if (data.expenses.rent)       { expenseItems.push({ label: 'Rent',                 amount: data.expenses.rent });     totalExpenses += data.expenses.rent }
  if (data.expenses.utilities)  { expenseItems.push({ label: 'Utilities',            amount: data.expenses.utilities }); totalExpenses += data.expenses.utilities }
  if (data.expenses.other)      { expenseItems.push({ label: 'Other Expenses',       amount: data.expenses.other });    totalExpenses += data.expenses.other }

  sectionLabel('5', 'Necessary Monthly Expenses')
  if (expenseItems.length === 0) {
    drawText('None', MARGIN_X + 14, y, italicFont, 10, MUTED); y -= 16
  } else {
    for (const item of expenseItems) { dataRow(item.label, formatCurrency(item.amount)) }
    drawHRule(y + 4, BORDER_GREY); y -= 6
    dataRow('Total Expenses', formatCurrency(totalExpenses), true)
  }
  y -= 12

  // ── 6. Disposable Income (highlighted) ───────────────────────────────────
  checkBreak(80)
  drawRect(MARGIN_X, y - 68, CONTENT_W, 68, LIGHT_BLUE, BLUE, 1.5)
  drawText('6.  Disposable Income', MARGIN_X + 12, y - 10, boldFont, 10, BLUE)
  drawText(formatCurrency(data.disposableIncome), MARGIN_X + 12, y - 32, boldFont, 18, BLUE)
  drawText(`${formatCurrency(data.grossIncome)} gross  -  ${formatCurrency(totalDeductions)} deductions  -  ${formatCurrency(totalExpenses)} expenses`, MARGIN_X + 12, y - 54, italicFont, 8, MUTED)
  y -= 80

  // ── Notes ─────────────────────────────────────────────────────────────────
  if (data.notes && data.notes.trim()) {
    checkBreak(60)
    sectionLabel('7', 'Additional Notes')
    y = wrappedText(data.notes, MARGIN_X + 14, y, CONTENT_W - 14, regularFont, 10, DARK)
    y -= 12
  }

  // ── Legal Compliance ──────────────────────────────────────────────────────
  checkBreak(80)
  y -= 6
  drawHRule(y)
  y -= 14
  drawText('Legal Compliance', MARGIN_X, y, boldFont, 10, BLUE)
  y -= 14
  y = wrappedText(
    "This affidavit is prepared in accordance with the guidelines laid down by the Hon'ble Supreme Court of India in Rajnesh v. Neha (2021) for calculating disposable income for maintenance purposes under Section 125 CrPC.",
    MARGIN_X, y, CONTENT_W, regularFont, 9, MUTED
  )
  y -= 20

  // ── Declaration ───────────────────────────────────────────────────────────
  checkBreak(120)
  drawRect(MARGIN_X, y - 46, CONTENT_W, 46, GREY_BG, BORDER_GREY)
  drawText('DECLARATION', MARGIN_X + 10, y - 8, boldFont, 10, DARK)
  y = wrappedText(
    'I solemnly affirm that the above statements are true and correct to the best of my knowledge and belief. Any false statement herein may attract penal consequences under law.',
    MARGIN_X + 10, y - 24, CONTENT_W - 20, regularFont, 9, DARK
  )
  y -= 36

  // ── Signature ─────────────────────────────────────────────────────────────
  checkBreak(70)
  drawText('_______________________________', MARGIN_X, y, regularFont, 10, DARK)
  y -= 14
  drawText('Signature of Deponent', MARGIN_X, y, boldFont, 10, DARK)
  y -= 12
  drawText(`Date: ${currentDate}`, MARGIN_X, y, regularFont, 9, MUTED)
  y -= 12
  drawText('Place: _______________________________', MARGIN_X, y, regularFont, 9, MUTED)

  // ── Footer on every page ──────────────────────────────────────────────────
  const pages = pdfDoc.getPages()
  for (let i = 0; i < pages.length; i++) {
    const pg = pages[i]
    const label = `Page ${i + 1} of ${pages.length}  |  Blue Drum AI  |  Income Affidavit  |  Confidential`
    const lw = italicFont.widthOfTextAtSize(label, 7)
    pg.drawText(label, { x: (PAGE_W - lw) / 2, y: 28, size: 7, font: italicFont, color: MUTED })
    pg.drawLine({ start: { x: MARGIN_X, y: 42 }, end: { x: PAGE_W - MARGIN_X, y: 42 }, thickness: 0.5, color: BORDER_GREY })
  }

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

