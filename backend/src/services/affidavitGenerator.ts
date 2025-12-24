import PDFDocument from 'pdfkit'

interface AffidavitData {
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

/**
 * Generate a PDF affidavit for income data
 * Follows Rajnesh v. Neha guidelines for disposable income calculation
 */
export async function generateAffidavitPDF(data: AffidavitData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 60, bottom: 60, left: 60, right: 60 },
      })

      const buffers: Buffer[] = []
      doc.on('data', buffers.push.bind(buffers))
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(buffers)
        resolve(pdfBuffer)
      })
      doc.on('error', reject)

      // Helper function to format currency
      const formatCurrency = (amount: number): string => {
        return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      }

      // Header with decorative line
      doc.rect(60, 60, 495, 80).stroke()
      doc.fontSize(20).font('Helvetica-Bold').fillColor('#1e40af').text('AFFIDAVIT', 0, 75, { align: 'center' })
      doc.moveDown(0.3)
      doc.fontSize(12).font('Helvetica').fillColor('#000000').text('Income and Expense Statement', { align: 'center' })
      doc.moveDown(0.5)
      doc.fontSize(10).fillColor('#666666').text('Rajnesh v. Neha Compliant', { align: 'center' })
      
      doc.moveDown(1.5)

      // Date
      const currentDate = new Date().toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
      doc.fontSize(10).font('Helvetica').fillColor('#000000').text(`Date: ${currentDate}`, { align: 'right' })
      doc.moveDown(1.2)

      // Introduction
      doc.fontSize(11).text('I, the undersigned, hereby solemnly affirm and declare as under:', { align: 'justify' })
      doc.moveDown(1)

      // Personal Information
      doc.fontSize(11).font('Helvetica-Bold').fillColor('#1e40af').text('1. Personal Information:', { continued: false })
      doc.font('Helvetica').fillColor('#000000')
      doc.text(`   Email: ${data.userEmail}`, { indent: 20 })
      doc.moveDown(0.6)

      // Income Period
      const monthDate = new Date(data.monthYear + '-01')
      const monthName = monthDate.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
      doc.fontSize(11).font('Helvetica-Bold').fillColor('#1e40af').text('2. Income Period:', { continued: false })
      doc.font('Helvetica').fillColor('#000000')
      doc.text(`   Month: ${monthName}`, { indent: 20 })
      doc.moveDown(0.6)

      // Gross Income
      doc.fontSize(11).font('Helvetica-Bold').fillColor('#1e40af').text('3. Gross Monthly Income:', { continued: false })
      doc.font('Helvetica').fillColor('#000000')
      doc.text(`   ${formatCurrency(data.grossIncome)}`, { indent: 20 })
      doc.moveDown(0.6)

      // Deductions Section
      doc.fontSize(11).font('Helvetica-Bold').fillColor('#1e40af').text('4. Statutory Deductions:', { continued: false })
      doc.font('Helvetica').fillColor('#000000')
      let totalDeductions = 0
      const deductionItems: string[] = []
      
      if (data.deductions.income_tax) {
        deductionItems.push(`   Income Tax: ${formatCurrency(data.deductions.income_tax)}`)
        totalDeductions += data.deductions.income_tax
      }
      if (data.deductions.pf) {
        deductionItems.push(`   Provident Fund (PF): ${formatCurrency(data.deductions.pf)}`)
        totalDeductions += data.deductions.pf
      }
      if (data.deductions.professional_tax) {
        deductionItems.push(`   Professional Tax: ${formatCurrency(data.deductions.professional_tax)}`)
        totalDeductions += data.deductions.professional_tax
      }
      if (data.deductions.other) {
        deductionItems.push(`   Other Deductions: ${formatCurrency(data.deductions.other)}`)
        totalDeductions += data.deductions.other
      }
      
      if (deductionItems.length === 0) {
        doc.text('   None', { indent: 20 })
      } else {
        deductionItems.forEach((item) => doc.text(item, { indent: 20 }))
        doc.moveDown(0.3)
        doc.font('Helvetica-Bold').text(`   Total Deductions: ${formatCurrency(totalDeductions)}`, { indent: 20 })
      }
      doc.moveDown(0.6)

      // Expenses Section
      doc.fontSize(11).font('Helvetica-Bold').fillColor('#1e40af').text('5. Necessary Monthly Expenses:', { continued: false })
      doc.font('Helvetica').fillColor('#000000')
      let totalExpenses = 0
      const expenseItems: string[] = []
      
      if (data.expenses.emi) {
        expenseItems.push(`   EMI / Loan Payments: ${formatCurrency(data.expenses.emi)}`)
        totalExpenses += data.expenses.emi
      }
      if (data.expenses.medical) {
        expenseItems.push(`   Medical Expenses: ${formatCurrency(data.expenses.medical)}`)
        totalExpenses += data.expenses.medical
      }
      if (data.expenses.parents) {
        expenseItems.push(`   Parents Support: ${formatCurrency(data.expenses.parents)}`)
        totalExpenses += data.expenses.parents
      }
      if (data.expenses.rent) {
        expenseItems.push(`   Rent: ${formatCurrency(data.expenses.rent)}`)
        totalExpenses += data.expenses.rent
      }
      if (data.expenses.utilities) {
        expenseItems.push(`   Utilities: ${formatCurrency(data.expenses.utilities)}`)
        totalExpenses += data.expenses.utilities
      }
      if (data.expenses.other) {
        expenseItems.push(`   Other Expenses: ${formatCurrency(data.expenses.other)}`)
        totalExpenses += data.expenses.other
      }
      
      if (expenseItems.length === 0) {
        doc.text('   None', { indent: 20 })
      } else {
        expenseItems.forEach((item) => doc.text(item, { indent: 20 }))
        doc.moveDown(0.3)
        doc.font('Helvetica-Bold').text(`   Total Expenses: ${formatCurrency(totalExpenses)}`, { indent: 20 })
      }
      doc.moveDown(0.6)

      // Disposable Income - Highlighted
      doc.rect(60, doc.y, 495, 50).fillAndStroke('#e0e7ff', '#3b82f6')
      doc.fontSize(12).font('Helvetica-Bold').fillColor('#1e40af').text('6. Disposable Income:', 80, doc.y - 45)
      doc.fontSize(16).text(formatCurrency(data.disposableIncome), 80, doc.y - 25)
      doc.fontSize(9).font('Helvetica').fillColor('#666666').text('(Gross Income - Statutory Deductions - Necessary Expenses)', 80, doc.y - 5)
      doc.moveDown(1.2)

      // Calculation Formula Box
      doc.rect(60, doc.y, 495, 30).fillAndStroke('#f3f4f6', '#9ca3af')
      doc.fontSize(10).font('Helvetica-Oblique').fillColor('#374151').text('Calculation Formula:', 80, doc.y - 25)
      doc.font('Helvetica').text('Disposable Income = Gross Income - Deductions - Expenses', 80, doc.y - 10)
      doc.moveDown(1)

      // Notes (if any)
      if (data.notes && data.notes.trim()) {
        doc.fontSize(11).font('Helvetica-Bold').fillColor('#1e40af').text('7. Additional Notes:', { continued: false })
        doc.font('Helvetica').fillColor('#000000').fontSize(10)
        doc.text(data.notes, { indent: 20, align: 'justify' })
        doc.moveDown(1)
      }

      // Legal Compliance Statement
      doc.moveDown(0.5)
      doc.rect(60, doc.y, 495, 60).fillAndStroke('#dbeafe', '#3b82f6')
      doc.fontSize(10).font('Helvetica-Bold').fillColor('#1e40af').text('Legal Compliance:', 80, doc.y - 55)
      doc.font('Helvetica').fontSize(9).fillColor('#1e3a8a')
      doc.text(
        'This affidavit is prepared in accordance with the guidelines laid down by the Hon\'ble Supreme Court of India in the case of Rajnesh v. Neha (2021) for calculating disposable income for maintenance purposes. The calculation follows the established legal framework for determining maintenance amounts.',
        80,
        doc.y - 40,
        { width: 455, align: 'justify' }
      )
      doc.moveDown(1.5)

      // Declaration Section
      doc.fontSize(11).font('Helvetica-Bold').fillColor('#000000').text('DECLARATION:', { continued: false })
      doc.font('Helvetica').fontSize(10)
      doc.text(
        'I solemnly affirm that the above statements are true and correct to the best of my knowledge and belief. I understand that any false statement made herein may attract penal consequences under the law, including but not limited to proceedings under Section 193 of the Indian Penal Code, 1860.',
        { align: 'justify' }
      )
      doc.moveDown(2)

      // Signature Section
      doc.moveDown(1)
      doc.text('_________________________', { align: 'left' })
      doc.moveDown(0.3)
      doc.font('Helvetica-Bold').fontSize(10).text('Signature of Deponent', { align: 'left' })
      doc.moveDown(0.5)
      doc.font('Helvetica').fontSize(10).text(`Date: ${currentDate}`, { align: 'left' })
      doc.moveDown(1)
      doc.fontSize(10).text('Place: _________________________', { align: 'left' })

      // Footer
      const pageHeight = doc.page.height
      doc.fontSize(7).font('Helvetica-Oblique').fillColor('#9ca3af').text('Generated by Blue Drum AI - Evidence-based legal vigilance', 0, pageHeight - 40, {
        align: 'center',
      })
      doc.text(`Document ID: ${data.monthYear}-${Date.now()}`, 0, pageHeight - 30, {
        align: 'center',
      })

      doc.end()
    } catch (error) {
      reject(error)
    }
  })
}
