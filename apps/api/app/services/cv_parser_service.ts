/**
 * CvParserService — Extracts raw text from uploaded CV files.
 *
 * Supports .txt and .pdf files.
 * Ticket 2.4 (CvExtractor AI) will add OpenRouter-based skill extraction on top of this.
 */
import { createRequire } from 'node:module'
import { readFile } from 'node:fs/promises'

const require = createRequire(import.meta.url)
const pdfParse = require('pdf-parse') as (buffer: Buffer) => Promise<{ text: string }>

export default class CvParserService {
  async extractText(filePath: string): Promise<string> {
    const extension = filePath.split('.').pop()?.toLowerCase()

    switch (extension) {
      case 'txt':
        return this.extractFromText(filePath)
      case 'pdf':
        return this.extractFromPdf(filePath)
      default:
        throw new Error(`Type de fichier non supporté : .${extension}. Supportés : .txt, .pdf`)
    }
  }

  private async extractFromText(filePath: string): Promise<string> {
    const content = await readFile(filePath, 'utf-8')
    return content.trim()
  }

  private async extractFromPdf(filePath: string): Promise<string> {
    try {
      const buffer = await readFile(filePath)
      const data = await pdfParse(buffer)
      return data.text.trim()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      throw new Error(`Impossible de lire le PDF : ${message}`)
    }
  }
}
