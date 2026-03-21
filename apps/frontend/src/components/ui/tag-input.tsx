'use client'

import { useTranslations } from 'next-intl'
import { type KeyboardEvent, useId, useState } from 'react'

interface TagInputProps {
  label: string
  value: string[]
  onChange: (value: string[]) => void
  placeholder?: string
  maxLength?: number
}

export function TagInput({ label, value, onChange, placeholder, maxLength }: TagInputProps) {
  const [input, setInput] = useState('')
  const inputId = useId()
  const tc = useTranslations('common')

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      const trimmed = input.trim()
      if (trimmed && !value.includes(trimmed)) {
        onChange([...value, trimmed])
      }
      setInput('')
    }
    if (e.key === 'Backspace' && input === '' && value.length > 0) {
      onChange(value.slice(0, -1))
    }
  }

  function removeTag(tag: string) {
    onChange(value.filter((t) => t !== tag))
  }

  return (
    <div>
      <label htmlFor={inputId} className="block text-sm font-medium mb-1">
        {label}
      </label>
      <div className="flex flex-wrap gap-2 rounded-lg border border-[var(--color-border)] px-3 py-2 focus-within:ring-2 focus-within:ring-primary">
        {value.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-0.5 text-sm text-primary"
          >
            {tag}
            <button
              type="button"
              onClick={() => {
                removeTag(tag)
              }}
              aria-label={`Supprimer ${tag}`}
              className="ml-1 text-primary/60 hover:text-primary focus:outline-none focus-visible:ring-1 focus-visible:ring-primary rounded"
            >
              ×
            </button>
          </span>
        ))}
        <input
          id={inputId}
          type="text"
          value={input}
          onChange={(e) => {
            setInput(e.target.value)
          }}
          onKeyDown={handleKeyDown}
          placeholder={value.length === 0 ? placeholder : ''}
          maxLength={maxLength}
          className="flex-1 min-w-[120px] bg-transparent text-sm outline-none"
        />
      </div>
      <p className="mt-1 text-xs text-[var(--color-text-muted)]">
        {tc('tagHint')}
      </p>
    </div>
  )
}
