export interface Company {
  id: string // uuid
  name: string
  website: string | null
  sector: string | null
  size: string | null
  city: string | null
  country: string
  linkedinUrl: string | null
  signals: Record<string, unknown> | null
  source: string
}
