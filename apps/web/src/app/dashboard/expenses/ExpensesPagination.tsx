'use client'

import React from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export function ExpensesPagination({
  page,
  totalPages,
  total,
  pageSize,
}: {
  page: number
  totalPages: number
  total: number
  pageSize: number
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const goToPage = (target: number) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', String(target))
    router.push(`${pathname}?${params.toString()}`)
  }

  if (total === 0) return null

  const rangeStart = (page - 1) * pageSize + 1
  const rangeEnd = Math.min(page * pageSize, total)

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-2 pt-1">
      <p className="text-xs text-muted-foreground">
        Showing <span className="font-medium text-foreground">{rangeStart}-{rangeEnd}</span> of{' '}
        <span className="font-medium text-foreground">{total}</span> expenses
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => goToPage(page - 1)}
          disabled={page <= 1}
          className="inline-flex items-center justify-center rounded-lg border border-border bg-background p-2 text-foreground transition-colors hover:bg-secondary disabled:opacity-40 disabled:pointer-events-none"
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-xs font-medium text-muted-foreground px-1">
          Page {page} of {totalPages}
        </span>
        <button
          type="button"
          onClick={() => goToPage(page + 1)}
          disabled={page >= totalPages}
          className="inline-flex items-center justify-center rounded-lg border border-border bg-background p-2 text-foreground transition-colors hover:bg-secondary disabled:opacity-40 disabled:pointer-events-none"
          aria-label="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
