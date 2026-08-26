import React from 'react'
import { cookies } from 'next/headers'
import { Plus, Building2, Banknote, Calendar } from 'lucide-react'
import Link from 'next/link'
import LoanActions from './LoanActions'
import { LoansFilterBar } from './LoansFilterBar'
import { LoansPagination } from './LoansPagination'

interface LoansResponse {
  data: any[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export default async function LoansPage({
  searchParams,
}: {
  searchParams: { q?: string; status?: string; type?: string; page?: string }
}) {
  const token = cookies().get('auth_token')?.value

  const params = new URLSearchParams()
  if (searchParams.q) params.set('search', searchParams.q)
  if (searchParams.status) params.set('status', searchParams.status)
  if (searchParams.type) params.set('loanType', searchParams.type)
  params.set('page', searchParams.page || '1')
  params.set('pageSize', '10')

  let result: LoansResponse = { data: [], total: 0, page: 1, pageSize: 10, totalPages: 1 }
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/loans?${params.toString()}`,
      {
        headers: { 'Authorization': `Bearer ${token}` },
        cache: 'no-store'
      }
    )

    if (res.ok) {
      result = await res.json()
    }
  } catch (error) {
    console.error('Failed to fetch loans:', error)
  }

  const { data: loans, total, page, totalPages, pageSize } = result
  const hasFilters = Boolean(searchParams.q || searchParams.status || searchParams.type)

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground mb-1">Loan Management</h1>
            <p className="text-sm text-muted-foreground">Track and manage your active loans and EMI schedules.</p>
          </div>
          <Link
            href="/dashboard/loans/add"
            className="inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Loan
          </Link>
        </div>

        <div className="mb-4">
          <LoansFilterBar />
        </div>

        {loans.length === 0 ? (
          <div className="rounded-3xl border border-border bg-card p-2 shadow-sm">
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="rounded-full bg-secondary p-4 mb-4">
                <Banknote className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-lg font-medium text-foreground mb-2">
                {hasFilters ? 'No matching loans found' : 'No loans found'}
              </h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                {hasFilters
                  ? 'Try adjusting your search or filters.'
                  : "You haven't added any loans yet. Click the Add Loan button to start tracking."}
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block rounded-3xl border border-border bg-card p-2 shadow-sm">
              <div className="overflow-hidden rounded-2xl bg-background">
                <table className="w-full text-left text-sm text-foreground">
                  <thead className="bg-secondary/20 text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="px-6 py-4 font-medium">Loan Details</th>
                      <th className="px-6 py-4 font-medium">Principal & Rate</th>
                      <th className="px-6 py-4 font-medium">Monthly EMI</th>
                      <th className="px-6 py-4 font-medium">Status / Progress</th>
                      <th className="px-6 py-4 font-medium"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {loans.map((loan: any) => (
                      <tr key={loan.id} className="transition-colors hover:bg-secondary/10 group">
                        <td className="px-6 py-4">
                          <div className="font-semibold text-foreground mb-1">{loan.name}</div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Building2 className="h-3 w-3" /> {loan.lender}
                            <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary font-medium">
                              {loan.loanType}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-foreground font-medium">₹{loan.principalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                          <div className="text-xs text-muted-foreground">{loan.interestRate}% p.a.</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-foreground font-medium">₹{loan.emiAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                            <Calendar className="h-3 w-3" /> {new Date(loan.nextEmiDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-between mb-1.5 text-xs">
                            <span className={loan.status === 'ACTIVE' ? 'text-emerald-500 font-medium' : 'text-muted-foreground font-medium'}>{loan.status}</span>
                            <span className="text-muted-foreground">{loan.paidEmis} / {loan.numberOfEmis}</span>
                          </div>
                          <div className="h-1.5 w-full rounded-full bg-secondary overflow-hidden">
                            <div
                              className="h-full rounded-full bg-emerald-500"
                              style={{ width: `${(loan.paidEmis / loan.numberOfEmis) * 100}%` }}
                            />
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <LoanActions loanId={loan.id} token={token || ''} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile card list */}
            <div className="md:hidden flex flex-col gap-3">
              {loans.map((loan: any) => (
                <div key={loan.id} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="min-w-0">
                      <div className="font-semibold text-foreground truncate">{loan.name}</div>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                        <Building2 className="h-3 w-3 shrink-0" /> <span className="truncate">{loan.lender}</span>
                        <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary font-medium shrink-0">
                          {loan.loanType}
                        </span>
                      </div>
                    </div>
                    <LoanActions loanId={loan.id} token={token || ''} />
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-0.5">Principal</div>
                      <div className="text-sm font-medium text-foreground">₹{loan.principalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                      <div className="text-xs text-muted-foreground">{loan.interestRate}% p.a.</div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-0.5">Monthly EMI</div>
                      <div className="text-sm font-medium text-foreground">₹{loan.emiAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" /> {new Date(loan.nextEmiDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5 text-xs">
                      <span className={loan.status === 'ACTIVE' ? 'text-emerald-500 font-medium' : 'text-muted-foreground font-medium'}>{loan.status}</span>
                      <span className="text-muted-foreground">{loan.paidEmis} / {loan.numberOfEmis} EMIs</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-secondary overflow-hidden">
                      <div
                        className="h-full rounded-full bg-emerald-500"
                        style={{ width: `${(loan.paidEmis / loan.numberOfEmis) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4">
              <LoansPagination page={page} totalPages={totalPages} total={total} pageSize={pageSize} />
            </div>
          </>
        )}
      </div>
    </div>
  )
}
