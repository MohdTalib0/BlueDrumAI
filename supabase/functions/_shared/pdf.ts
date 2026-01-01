// PDF Generation Utilities for Deno Edge Functions
// Uses pdf-lib via esm.sh

import { PDFDocument, PDFFont, PDFPage, rgb, StandardFonts } from 'https://esm.sh/pdf-lib@1.17.1'

export interface PDFOptions {
  title?: string
  author?: string
  subject?: string
}

export async function createPDFDocument(options?: PDFOptions): Promise<PDFDocument> {
  const pdfDoc = await PDFDocument.create()
  
  if (options?.title) pdfDoc.setTitle(options.title)
  if (options?.author) pdfDoc.setAuthor(options.author || 'Blue Drum AI')
  if (options?.subject) pdfDoc.setSubject(options.subject)
  
  return pdfDoc
}

export function formatCurrency(amount: number): string {
  return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
}

export function getRiskLabel(score: number): string {
  if (score >= 80) return 'Critical Risk'
  if (score >= 60) return 'High Risk'
  if (score >= 40) return 'Moderate Risk'
  if (score >= 20) return 'Low Risk'
  return 'Minimal Risk'
}

export function getRiskColor(score: number): { r: number; g: number; b: number } {
  if (score >= 80) return rgb(0.863, 0.149, 0.149) // #dc2626
  if (score >= 60) return rgb(0.918, 0.345, 0.047) // #ea580c
  if (score >= 40) return rgb(0.792, 0.541, 0.016) // #ca8a04
  return rgb(0.086, 0.639, 0.290) // #16a34a
}

export function getSeverityColor(severity: string): { r: number; g: number; b: number } {
  switch (severity.toLowerCase()) {
    case 'critical':
      return rgb(0.863, 0.149, 0.149) // #dc2626
    case 'high':
      return rgb(0.918, 0.345, 0.047) // #ea580c
    case 'medium':
      return rgb(0.792, 0.541, 0.016) // #ca8a04
    default:
      return rgb(0.086, 0.639, 0.290) // #16a34a
  }
}

// Helper to add text with wrapping
export function addWrappedText(
  page: PDFPage,
  font: PDFFont,
  fontSize: number,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  color: { r: number; g: number; b: number } = rgb(0, 0, 0)
): number {
  const words = text.split(' ')
  const lines: string[] = []
  let currentLine = ''

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word
    const width = font.widthOfTextAtSize(testLine, fontSize)
    
    if (width > maxWidth && currentLine) {
      lines.push(currentLine)
      currentLine = word
    } else {
      currentLine = testLine
    }
  }
  if (currentLine) lines.push(currentLine)

  let currentY = y
  for (const line of lines) {
    page.drawText(line, {
      x,
      y: currentY,
      size: fontSize,
      font,
      color,
    })
    currentY -= fontSize * 1.2
  }

  return currentY
}

// Helper to add header
export function addHeader(
  page: PDFPage,
  font: PDFFont,
  boldFont: PDFFont,
  title: string,
  subtitle?: string
): number {
  const pageWidth = page.getWidth()
  const startY = page.getHeight() - 50

  // Title (centered)
  const titleWidth = boldFont.widthOfTextAtSize(title, 20)
  page.drawText(title, {
    x: (pageWidth - titleWidth) / 2,
    y: startY,
    size: 20,
    font: boldFont,
    color: rgb(0.118, 0.251, 0.686), // #1e40af
  })

  let currentY = startY - 25
  if (subtitle) {
    const subtitleWidth = font.widthOfTextAtSize(subtitle, 10)
    page.drawText(subtitle, {
      x: (pageWidth - subtitleWidth) / 2,
      y: currentY,
      size: 10,
      font,
      color: rgb(0.4, 0.4, 0.4),
    })
    currentY -= 20
  }

  return currentY
}

// Helper to add footer
export function addFooter(
  page: PDFPage,
  font: PDFFont,
  text: string
): void {
  const pageWidth = page.getWidth()
  const textWidth = font.widthOfTextAtSize(text, 7)

  page.drawText(text, {
    x: (pageWidth - textWidth) / 2,
    y: 30,
    size: 7,
    font,
    color: rgb(0.612, 0.639, 0.686), // #9ca3af
  })
}

