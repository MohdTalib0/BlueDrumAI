import PDFDocument from 'pdfkit'
import { ChatAnalysisResponse } from '../services/ai'

interface PDFOptions {
  userEmail: string
  analysis: ChatAnalysisResponse & {
    chatStats?: {
      totalMessages: number
      participants: string[]
      dateRange: { start: string; end: string }
    }
    createdAt: string
  }
}

export async function generateChatAnalysisPDF(options: PDFOptions): Promise<Buffer> {
  const { userEmail, analysis } = options
  const doc = new PDFDocument({ margin: 50, size: 'A4' })

  const buffers: Buffer[] = []
  doc.on('data', buffers.push.bind(buffers))
  doc.on('end', () => {})

  // Header
  doc.fontSize(20).font('Helvetica-Bold').fillColor('#1e40af').text('Chat Analysis Report', { align: 'center' })
  doc.moveDown(0.5)
  doc.fontSize(10).font('Helvetica').fillColor('#6b7280').text(`Generated: ${new Date(analysis.createdAt).toLocaleString('en-IN')}`, { align: 'center' })
  doc.moveDown(1)

  // User Info
  doc.fontSize(12).font('Helvetica-Bold').fillColor('#111827').text('User Information', { underline: true })
  doc.moveDown(0.3)
  doc.fontSize(10).font('Helvetica').fillColor('#374151').text(`Email: ${userEmail}`, { indent: 20 })
  if (analysis.chatStats) {
    doc.text(`Participants: ${analysis.chatStats.participants.join(', ')}`, { indent: 20 })
    doc.text(`Total Messages: ${analysis.chatStats.totalMessages}`, { indent: 20 })
    doc.text(`Date Range: ${new Date(analysis.chatStats.dateRange.start).toLocaleDateString('en-IN')} to ${new Date(analysis.chatStats.dateRange.end).toLocaleDateString('en-IN')}`, { indent: 20 })
  }
  doc.moveDown(1)

  // Risk Score
  const riskColor = analysis.riskScore >= 80 ? '#dc2626' : analysis.riskScore >= 60 ? '#ea580c' : analysis.riskScore >= 40 ? '#ca8a04' : '#16a34a'
  doc.fontSize(16).font('Helvetica-Bold').fillColor(riskColor).text(`Risk Score: ${analysis.riskScore}/100`, { align: 'center' })
  doc.moveDown(0.5)
  doc.fontSize(12).font('Helvetica').fillColor('#374151').text(`Risk Level: ${getRiskLabel(analysis.riskScore)}`, { align: 'center' })
  doc.moveDown(1)

  // Summary
  doc.fontSize(12).font('Helvetica-Bold').fillColor('#111827').text('Executive Summary', { underline: true })
  doc.moveDown(0.3)
  doc.fontSize(10).font('Helvetica').fillColor('#374151').text(analysis.summary, { align: 'justify', indent: 20 })
  doc.moveDown(1)

  // Red Flags
  if (analysis.redFlags && analysis.redFlags.length > 0) {
    doc.fontSize(12).font('Helvetica-Bold').fillColor('#111827').text(`Red Flags Detected (${analysis.redFlags.length})`, { underline: true })
    doc.moveDown(0.3)
    
    analysis.redFlags.forEach((flag, index) => {
      if (doc.y > 700) {
        doc.addPage()
      }
      
      const severityColor = flag.severity === 'critical' ? '#dc2626' : flag.severity === 'high' ? '#ea580c' : flag.severity === 'medium' ? '#ca8a04' : '#16a34a'
      
      doc.fontSize(10).font('Helvetica-Bold').fillColor(severityColor).text(`${index + 1}. ${flag.type} [${flag.severity.toUpperCase()}]`, { indent: 20 })
      doc.moveDown(0.2)
      doc.fontSize(9).font('Helvetica').fillColor('#374151').text(flag.message, { indent: 30 })
      if (flag.context) {
        doc.moveDown(0.2)
        doc.fontSize(8).font('Helvetica-Oblique').fillColor('#6b7280').text(`Context: ${flag.context.substring(0, 150)}...`, { indent: 30 })
      }
      doc.moveDown(0.5)
    })
    doc.moveDown(1)
  }

  // Patterns Detected
  if (analysis.patternsDetected && analysis.patternsDetected.length > 0) {
    doc.fontSize(12).font('Helvetica-Bold').fillColor('#111827').text(`Behavioral Patterns (${analysis.patternsDetected.length})`, { underline: true })
    doc.moveDown(0.3)
    
    analysis.patternsDetected.forEach((pattern, index) => {
      if (doc.y > 700) {
        doc.addPage()
      }
      
      doc.fontSize(10).font('Helvetica-Bold').fillColor('#7c3aed').text(`${index + 1}. ${pattern.pattern}`, { indent: 20 })
      doc.moveDown(0.2)
      doc.fontSize(9).font('Helvetica').fillColor('#374151').text(pattern.description, { indent: 30 })
      if (pattern.examples && pattern.examples.length > 0) {
        doc.moveDown(0.2)
        doc.fontSize(8).font('Helvetica-Oblique').fillColor('#6b7280').text(`Examples: ${pattern.examples.slice(0, 2).join('; ')}`, { indent: 30 })
      }
      doc.moveDown(0.5)
    })
    doc.moveDown(1)
  }

  // Recommendations
  if (analysis.recommendations && analysis.recommendations.length > 0) {
    doc.fontSize(12).font('Helvetica-Bold').fillColor('#111827').text('Recommendations', { underline: true })
    doc.moveDown(0.3)
    
    analysis.recommendations.forEach((rec, index) => {
      if (doc.y > 700) {
        doc.addPage()
      }
      doc.fontSize(9).font('Helvetica').fillColor('#374151').text(`${index + 1}. ${rec}`, { indent: 20 })
      doc.moveDown(0.3)
    })
    doc.moveDown(1)
  }

  // Keywords
  if (analysis.keywordsDetected && analysis.keywordsDetected.length > 0) {
    doc.fontSize(12).font('Helvetica-Bold').fillColor('#111827').text(`Keywords Detected (${analysis.keywordsDetected.length})`, { underline: true })
    doc.moveDown(0.3)
    doc.fontSize(9).font('Helvetica').fillColor('#374151').text(analysis.keywordsDetected.join(', '), { indent: 20 })
    doc.moveDown(1)
  }

  // Footer
  doc.moveDown(2)
  doc.fontSize(7).font('Helvetica-Oblique').fillColor('#9ca3af').text('Generated by Blue Drum AI - Evidence-based legal vigilance', { align: 'center' })
  doc.moveDown(0.5)
  doc.fontSize(7).font('Helvetica-Oblique').fillColor('#9ca3af').text('This report is for informational purposes only and does not constitute legal advice.', { align: 'center' })
  doc.fontSize(7).font('Helvetica-Oblique').fillColor('#9ca3af').text('Please consult with a qualified legal professional for specific situations.', { align: 'center' })

  doc.end()

  return new Promise((resolve) => {
    doc.on('end', () => {
      const pdfBuffer = Buffer.concat(buffers)
      resolve(pdfBuffer)
    })
  })
}

function getRiskLabel(score: number): string {
  if (score >= 80) return 'Critical Risk'
  if (score >= 60) return 'High Risk'
  if (score >= 40) return 'Moderate Risk'
  if (score >= 20) return 'Low Risk'
  return 'Minimal Risk'
}

