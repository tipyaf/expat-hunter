'use client'

import countries from 'i18n-iso-countries'
import enLocale from 'i18n-iso-countries/langs/en.json'
import frLocale from 'i18n-iso-countries/langs/fr.json'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocale } from 'next-intl'

// Register locales once at module level
countries.registerLocale(enLocale)
countries.registerLocale(frLocale)

/**
 * Map of project-specific country codes that differ from ISO 3166-1 alpha-2.
 * The project uses 'UK' throughout (API, DB, scrapers) instead of ISO 'GB'.
 */
const PROJECT_TO_ISO: Record<string, string> = {
  UK: 'GB',
}
const ISO_TO_PROJECT: Record<string, string> = {
  GB: 'UK',
}

/** Convert a project code to the ISO code used by i18n-iso-countries */
function toIso(code: string): string {
  return PROJECT_TO_ISO[code] ?? code
}

/** Convert an ISO code back to the project code */
function toProject(isoCode: string): string {
  return ISO_TO_PROJECT[isoCode] ?? isoCode
}

/** Derive a flag emoji from an ISO alpha-2 country code */
function countryCodeToFlag(isoCode: string): string {
  const code = isoCode.toUpperCase()
  if (code.length !== 2) return ''
  const offset = 0x1F1E6 - 65 // 'A' char code
  return String.fromCodePoint(code.charCodeAt(0) + offset, code.charCodeAt(1) + offset)
}

interface CountryEntry {
  /** Project-level code (e.g. 'UK' not 'GB') */
  code: string
  /** ISO alpha-2 code used by the library */
  isoCode: string
  label: string
  flag: string
}

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

  /** Build sorted list of all countries for the current locale */
  const allCountries: CountryEntry[] = useMemo(() => {
    const loc = locale === 'fr' ? 'fr' : 'en'
    const names = countries.getNames(loc, { select: 'official' })
    return Object.entries(names)
      .map(([isoCode, name]) => ({
        code: toProject(isoCode),
        isoCode,
        label: name,
        flag: countryCodeToFlag(isoCode),
      }))
      .sort((a, b) => a.label.localeCompare(b.label, loc))
  }, [locale])

  /** Index by project code for fast lookup */
  const countryByCode = useMemo(() => {
    const map = new Map<string, CountryEntry>()
    for (const c of allCountries) {
      map.set(c.code, c)
    }
    return map
  }, [allCountries])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const filtered = useMemo(() => {
    const selectedSet = new Set(value)
    const q = search.toLowerCase()
    return allCountries.filter((c) => {
      if (selectedSet.has(c.code)) return false
      return (
        c.code.toLowerCase().includes(q) ||
        c.isoCode.toLowerCase().includes(q) ||
        c.label.toLowerCase().includes(q)
      )
    })
  }, [allCountries, value, search])

  function addCountry(code: string) {
    onChange([...value, code])
    setSearch('')
  }

  function removeCountry(code: string) {
    onChange(value.filter((c) => c !== code))
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
          const country = countryByCode.get(code)
          return (
            <span
              key={code}
              className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-0.5 text-sm text-primary"
            >
              {country ? `${country.flag} ${country.label}` : code}
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
              <span>{country.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
