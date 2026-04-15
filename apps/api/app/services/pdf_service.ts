import PDFDocument from 'pdfkit'

const PDF_FONT_SIZE = 11
const PDF_MARGIN = 50
const PDF_LINE_GAP = 4

export default class PdfService {
  /**
   * Convert plain text to a PDF buffer (A4, Helvetica, standard margins).
   */
  async textToBuffer(text: string, title: string): Promise<Buffer> {
    const doc = new PDFDocument({
      size: 'A4',
      margin: PDF_MARGIN,
      info: { Title: title, Author: 'ExpatHunter' },
    })

    const chunks: Buffer[] = []
    doc.on('data', (chunk: Buffer) => chunks.push(chunk))

    await new Promise<void>((resolve, reject) => {
      doc.on('end', resolve)
      doc.on('error', reject)

      doc.fontSize(PDF_FONT_SIZE)
      doc.font('Helvetica')

      const lines = text.split('\n')
      for (const line of lines) {
        doc.text(line, { lineGap: PDF_LINE_GAP })
      }

      doc.end()
    })

    return Buffer.concat(chunks)
  }
}
