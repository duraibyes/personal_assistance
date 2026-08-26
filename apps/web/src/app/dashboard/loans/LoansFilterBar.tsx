'use client'

import React, { useEffect, useState } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { Search, X } from 'lucide-react'

const statusOptions = [
  { value: '', label: 'All Statuses' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'CLOSED', label: 'Closed' },
]

const typeOptions = [
  { value: '', label: 'All Types' },
  { value: 'PERSONAL', label: 'Personal' },
  { value: 'HOME', label: 'Home' },
  { value: 'AUTO', label: 'Auto' },
  { value: 'EDUCATION', label: 'Education' },
]

const selectClass =
  'rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition-all focus:border-primary/50 focus:ring-2 focus:ring-primary/20'

export function LoansFilterBar() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [search, setSearch] = useState(searchParams.get('q') || '')

  const updateParams = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString())
    Object.entries(updates).forEach(([key, value]) => {
      if (value) params.set(key, value)
      else params.delete(key)
    })
    params.delete('page')
    router.push(`${pathname}?${params.toString()}`)
  }

  // Debounce search input -> URL
  useEffect(() => {
    const current = searchParams.get('q') || ''
    if (search === current) return
    const timeout = setTimeout(() => updateParams({ q: search || null }), 400)
    return () => clearTimeout(timeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search])

  const hasFilters = searchParams.get('q') || searchParams.get('status') || searchParams.get('type')

  return (
    <div className="flex flex-col md:flex-row gap-3 md:items-center">
      <div className="relative flex-1 min-w-0">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by loan name, lender, or loan number..."
          className="w-full rounded-xl border border-border bg-background pl-10 pr-9 py-2.5 text-sm text-foreground placeholder-muted-foreground outline-none transition-all focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="flex gap-3">
        <select
          className={selectClass}
          value={searchParams.get('status') || ''}
          onChange={(e) => updateParams({ status: e.target.value || null })}
        >
          {statusOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>

        <select
          className={selectClass}
          value={searchParams.get('type') || ''}
          onChange={(e) => updateParams({ type: e.target.value || null })}
        >
          {typeOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>

        {hasFilters && (
          <button
            type="button"
            onClick={() => { setSearch(''); router.push(pathname) }}
            className="rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            Reset
          </button>
        )}
      </div>
    </div>
  )
}
