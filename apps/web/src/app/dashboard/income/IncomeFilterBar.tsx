'use client'

import React, { useEffect, useState } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { Search, X } from 'lucide-react'

type Category = { id: string; name: string; icon: string | null }

const selectClass =
  'rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition-all focus:border-primary/50 focus:ring-2 focus:ring-primary/20'

export function IncomeFilterBar({ categories }: { categories: Category[] }) {
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

  useEffect(() => {
    const current = searchParams.get('q') || ''
    if (search === current) return
    const timeout = setTimeout(() => updateParams({ q: search || null }), 400)
    return () => clearTimeout(timeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search])

  const hasFilters =
    searchParams.get('q') || searchParams.get('categoryId') ||
    searchParams.get('from') || searchParams.get('to') ||
    searchParams.get('min') || searchParams.get('max')

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col md:flex-row gap-3 md:items-center">
        <div className="relative flex-1 min-w-0">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by source or description..."
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

        <div className="flex flex-wrap gap-3">
          <select
            className={selectClass}
            value={searchParams.get('categoryId') || ''}
            onChange={(e) => updateParams({ categoryId: e.target.value || null })}
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.icon ? `${c.icon} ` : ''}{c.name}</option>
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

      <div className="flex flex-wrap gap-3">
        <input
          type="date"
          value={searchParams.get('from') || ''}
          onChange={(e) => updateParams({ from: e.target.value || null })}
          className={selectClass}
          aria-label="From date"
        />
        <input
          type="date"
          value={searchParams.get('to') || ''}
          onChange={(e) => updateParams({ to: e.target.value || null })}
          className={selectClass}
          aria-label="To date"
        />
        <input
          type="number"
          placeholder="Min ₹"
          value={searchParams.get('min') || ''}
          onChange={(e) => updateParams({ min: e.target.value || null })}
          className={`${selectClass} w-28`}
          aria-label="Minimum amount"
        />
        <input
          type="number"
          placeholder="Max ₹"
          value={searchParams.get('max') || ''}
          onChange={(e) => updateParams({ max: e.target.value || null })}
          className={`${selectClass} w-28`}
          aria-label="Maximum amount"
        />
      </div>
    </div>
  )
}
