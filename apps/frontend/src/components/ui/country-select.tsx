'use client'

import { useEffect, useRef, useState } from 'react'
import { useLocale } from 'next-intl'

interface Country {
  code: string
  labelEn: string
  labelFr: string
  flag: string
}

const COUNTRIES: Country[] = [
  { code: 'NZ', labelEn: 'New Zealand', labelFr: 'Nouvelle-Zélande', flag: '🇳🇿' },
  { code: 'AU', labelEn: 'Australia', labelFr: 'Australie', flag: '🇦🇺' },
  { code: 'CA', labelEn: 'Canada', labelFr: 'Canada', flag: '🇨🇦' },
  { code: 'UK', labelEn: 'United Kingdom', labelFr: 'Royaume-Uni', flag: '🇬🇧' },
  { code: 'US', labelEn: 'United States', labelFr: 'États-Unis', flag: '🇺🇸' },
  { code: 'DE', labelEn: 'Germany', labelFr: 'Allemagne', flag: '🇩🇪' },
  { code: 'FR', labelEn: 'France', labelFr: 'France', flag: '🇫🇷' },
  { code: 'NL', labelEn: 'Netherlands', labelFr: 'Pays-Bas', flag: '🇳🇱' },
  { code: 'IE', labelEn: 'Ireland', labelFr: 'Irlande', flag: '🇮🇪' },
  { code: 'SG', labelEn: 'Singapore', labelFr: 'Singapour', flag: '🇸🇬' },
  { code: 'JP', labelEn: 'Japan', labelFr: 'Japon', flag: '🇯🇵' },
  { code: 'CH', labelEn: 'Switzerland', labelFr: 'Suisse', flag: '🇨🇭' },
  { code: 'SE', labelEn: 'Sweden', labelFr: 'Suède', flag: '🇸🇪' },
  { code: 'DK', labelEn: 'Denmark', labelFr: 'Danemark', flag: '🇩🇰' },
  { code: 'NO', labelEn: 'Norway', labelFr: 'Norvège', flag: '🇳🇴' },
]

interface CountrySelectProps {
  value: string[]
  onChange: (codes: string[]) => void
  label?: string
}

export function CountrySelect({ value, onChange, label }: CountrySelectProps) {
  const locale = useLocale()
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)

  const getLabel = (c: Country) => (locale === 'fr' ? c.labelFr : c.labelEn)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const filtered = COUNTRIES.filter((c) => {
    if (value.includes(c.code)) return false
    const q = search.toLowerCase()
    return (
      c.code.toLowerCase().includes(q) ||
      getLabel(c).toLowerCase().includes(q)
    )
  })

  function addCountry(code: string) {
    onChange([...value, code])
    setSearch('')
  }

  function removeCountry(code: string) {
    onChange(value.filter((c) => c !== code))
  }

  function getCountry(code: string): Country | undefined {
    return COUNTRIES.find((c) => c.code === code)
  }

  return (
    <div ref={containerRef} className="relative">
      {label && (
        <label className="block text-sm font-medium mb-1">{label}</label>
      )}

      {/* Selected pills */}
      <div
        className="flex flex-wrap gap-2 rounded-lg border border-[var(--color-border)] px-3 py-2 min-h-[42px] cursor-text focus-within:ring-2 focus-within:ring-primary"
        onClick={() => setIsOpen(true)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') setIsOpen(true)
        }}
        role="button"
        tabIndex={0}
      >
        {value.map((code) => {
          const country = getCountry(code)
          return (
            <span
              key={code}
              className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-0.5 text-sm text-primary"
            >
              {country ? `${country.flag} ${getLabel(country)}` : code}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  removeCountry(code)
                }}
                className="ml-0.5 text-primary/60 hover:text-primary focus:outline-none rounded"
                aria-label={`Remove ${code}`}
              >
                ×
              </button>
            </span>
          )
        })}
        <input
          type="text"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setIsOpen(true)
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={value.length === 0 ? (locale === 'fr' ? 'Sélectionner des pays...' : 'Select countries...') : ''}
          className="flex-1 min-w-[120px] bg-transparent text-sm outline-none"
        />
      </div>

      {/* Dropdown */}
      {isOpen && filtered.length > 0 && (
        <div className="absolute z-20 mt-1 w-full max-h-60 overflow-y-auto rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-light)] shadow-lg">
          {filtered.map((country) => (
            <button
              key={country.code}
              type="button"
              onClick={() => addCountry(country.code)}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-[var(--color-text-main)] hover:bg-primary/5 transition-colors text-left"
            >
              <span>{country.flag}</span>
              <span>{getLabel(country)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
