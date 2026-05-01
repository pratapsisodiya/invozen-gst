'use client'
import { useState, useCallback } from 'react'
import { Search, X } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

interface SearchBarProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

export function SearchBar({ value, onChange, placeholder = 'Search...', className }: SearchBarProps) {
  return (
    <div className={cn('relative flex items-center', className)}>
      <Search className="absolute left-3 w-4 h-4 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full h-9 rounded-lg border pl-9 pr-8 text-sm outline-none transition-colors focus:ring-2 focus:ring-brand-600/20 focus:border-brand-600"
        style={{ borderColor: 'var(--border)', color: 'var(--text)', background: 'white' }}
      />
      {value && (
        <button
          onClick={() => onChange('')}
          className="absolute right-3"
          aria-label="Clear search"
        >
          <X className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
        </button>
      )}
    </div>
  )
}
