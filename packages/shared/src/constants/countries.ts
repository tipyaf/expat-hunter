export interface SupportedCountry {
  code: string
  name: string
  sources: string[]
}

export const SUPPORTED_COUNTRIES: SupportedCountry[] = [
  {
    code: 'CA',
    name: 'Canada',
    sources: ['linkedin', 'indeed', 'jobbank'],
  },
  {
    code: 'AU',
    name: 'Australie',
    sources: ['linkedin', 'seek', 'indeed'],
  },
  {
    code: 'NZ',
    name: 'Nouvelle-Zélande',
    sources: ['linkedin', 'seek', 'trademe'],
  },
  {
    code: 'SG',
    name: 'Singapour',
    sources: ['linkedin', 'jobstreet', 'indeed'],
  },
  {
    code: 'AE',
    name: 'Émirats arabes unis',
    sources: ['linkedin', 'bayt', 'indeed'],
  },
  {
    code: 'DE',
    name: 'Allemagne',
    sources: ['linkedin', 'xing', 'stepstone'],
  },
  {
    code: 'NL',
    name: 'Pays-Bas',
    sources: ['linkedin', 'indeed', 'nationalevacaturebank'],
  },
  {
    code: 'GB',
    name: 'Royaume-Uni',
    sources: ['linkedin', 'reed', 'indeed'],
  },
  {
    code: 'JP',
    name: 'Japon',
    sources: ['linkedin', 'gaijinpot', 'daijob'],
  },
  {
    code: 'CH',
    name: 'Suisse',
    sources: ['linkedin', 'jobs.ch', 'indeed'],
  },
]

export function getCountryByCode(code: string): SupportedCountry | undefined {
  return SUPPORTED_COUNTRIES.find((c) => c.code === code)
}

export function getCountryCodes(): string[] {
  return SUPPORTED_COUNTRIES.map((c) => c.code)
}
