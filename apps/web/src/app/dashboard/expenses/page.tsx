import React from 'react'
import { cookies } from 'next/headers'
import { Plus, Wallet, Calendar, Tag } from 'lucide-react'
import Link from 'next/link'
import ExpenseActions from './ExpenseActions'
import { ExpensesFilterBar } from './ExpensesFilterBar'
import { ExpensesPagination } from './ExpensesPagination'
import { formatPaymentMethod } from '@/lib/constants'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'

interface ExpensesResponse {
  data: any[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: { q?: string; categoryId?: string; paymentMethod?: string; from?: string; to?: string; min?: string; max?: string; page?: string }
}) {
  const token = cookies().get('auth_token')?.value

  const params = new URLSearchParams()
  if (searchParams.q) params.set('search', searchParams.q)
  if (searchParams.categoryId) params.set('categoryId', searchParams.categoryId)
  if (searchParams.paymentMethod) params.set('paymentMethod', searchParams.paymentMethod)
  if (searchParams.from) params.set('dateFrom', searchParams.from)
  if (searchParams.to) params.set('dateTo', searchParams.to)
  if (searchParams.min) params.set('minAmount', searchParams.min)
  if (searchParams.max) params.set('maxAmount', searchParams.max)
  params.set('page', searchParams.page || '1')
  params.set('pageSize', '10')

  let result: ExpensesResponse = { data: [], total: 0, page: 1, pageSize: 10, totalPages: 1 }
  let categories: any[] = []

  try {
    const [expensesRes, categoriesRes] = await Promise.all([
      fetch(`${API_BASE}/expenses?${params.toString()}`, {
        headers: { 'Authorization': `Bearer ${token}` },
        cache: 'no-store'
      }),
      fetch(`${API_BASE}/categories?type=EXPENSE`, {
        headers: { 'Authorization': `Bearer ${token}` },
        cache: 'no-store'
      }),
    ])
    if (expensesRes.ok) {
      const json = await expensesRes.json()
      if (json && Array.isArray(json.data)) result = json
      else console.error('Unexpected /expenses response shape:', json)
    }
    if (categoriesRes.ok) {
      const json = await categoriesRes.json()
      if (Array.isArray(json)) categories = json
    }
  } catch (error) {
    console.error('Failed to fetch expenses:', error)
  }

  const { data: expenses, total, page, totalPages, pageSize } = result
  const hasFilters = Boolean(
    searchParams.q || searchParams.categoryId || searchParams.paymentMethod ||
    searchParams.from || searchParams.to || searchParams.min || searchParams.max
  )

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground mb-1">Expenses</h1>
            <p className="text-sm text-muted-foreground">Track and categorize your daily spending.</p>
          </div>
          <Link
            href="/dashboard/expenses/add"
            className="inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Expense
          </Link>
        </div>

        <div className="mb-4">
          <ExpensesFilterBar categories={categories} />
        </div>

        {expenses.length === 0 ? (
          <div className="rounded-3xl border border-border bg-card p-2 shadow-sm">
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="rounded-full bg-secondary p-4 mb-4">
                <Wallet className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-lg font-medium text-foreground mb-2">
                {hasFilters ? 'No matching expenses found' : 'No expenses yet'}
              </h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                {hasFilters
                  ? 'Try adjusting your search or filters.'
                  : 'Add your first expense to start tracking where your money goes.'}
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
                      <th className="px-6 py-4 font-medium">Description</th>
                      <th className="px-6 py-4 font-medium">Category</th>
                      <th className="px-6 py-4 font-medium">Payment Method</th>
                      <th className="px-6 py-4 font-medium">Date</th>
                      <th className="px-6 py-4 font-medium text-right">Amount</th>
                      <th className="px-6 py-4 font-medium"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {expenses.map((expense: any) => (
                      <tr key={expense.id} className="transition-colors hover:bg-secondary/10 group">
                        <td className="px-6 py-4">
                          <div className="font-semibold text-foreground mb-1">{expense.description}</div>
                          {expense.vendorName && (
                            <div className="text-xs text-muted-foreground">{expense.vendorName}</div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center gap-1 rounded bg-primary/10 px-2 py-0.5 text-xs text-primary font-medium">
                            {expense.categoryRef?.icon ? `${expense.categoryRef.icon} ` : ''}{expense.categoryRef?.name || expense.category}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-muted-foreground">{formatPaymentMethod(expense.paymentMethod)}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3" /> {new Date(expense.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right font-medium text-foreground">
                          ₹{expense.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <ExpenseActions expenseId={expense.id} token={token || ''} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile card list */}
            <div className="md:hidden flex flex-col gap-3">
              {expenses.map((expense: any) => (
                <div key={expense.id} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="min-w-0">
                      <div className="font-semibold text-foreground truncate">{expense.description}</div>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                        <Calendar className="h-3 w-3 shrink-0" />
                        {new Date(expense.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </div>
                    </div>
                    <ExpenseActions expenseId={expense.id} token={token || ''} />
                  </div>

                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    <span className="inline-flex items-center gap-1 rounded bg-primary/10 px-2 py-0.5 text-[10px] text-primary font-medium">
                      <Tag className="h-2.5 w-2.5" />
                      {expense.categoryRef?.icon ? `${expense.categoryRef.icon} ` : ''}{expense.categoryRef?.name || expense.category}
                    </span>
                    <span className="text-[10px] text-muted-foreground">{formatPaymentMethod(expense.paymentMethod)}</span>
                  </div>

                  <div className="text-lg font-bold text-foreground">
                    ₹{expense.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4">
              <ExpensesPagination page={page} totalPages={totalPages} total={total} pageSize={pageSize} />
            </div>
          </>
        )}
      </div>
    </div>
  )
}
