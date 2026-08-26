import React from 'react'
import { cookies } from 'next/headers'
import { TrendingUp, TrendingDown, PiggyBank, Landmark, Calendar, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { TrendBarChart } from '@/components/charts/TrendBarChart'
import { CategoryDonutChart } from '@/components/charts/CategoryDonutChart'
import { formatPaymentMethod } from '@/lib/constants'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'

async function fetchJson(url: string, token: string | undefined, fallback: any) {
  try {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' })
    if (res.ok) {
      const json = await res.json()
      // Guard against a shape mismatch (e.g. a stale deployment) rather than crashing the page.
      const sameShape = Array.isArray(fallback) ? Array.isArray(json) : typeof json === 'object' && json !== null
      if (sameShape) return json
      console.error(`Unexpected response shape from ${url}:`, json)
    }
  } catch (error) {
    console.error(`Failed to fetch ${url}:`, error)
  }
  return fallback
}

export default async function FinanceDashboardPage() {
  const token = cookies().get('auth_token')?.value

  const [summary, trend, breakdown, recent, upcoming] = await Promise.all([
    fetchJson(`${API_BASE}/dashboard/summary`, token, {
      totalIncomeThisMonth: 0, totalExpensesThisMonth: 0, totalMonthlyEmi: 0, balance: 0,
    }),
    fetchJson(`${API_BASE}/dashboard/trend?months=6`, token, []),
    fetchJson(`${API_BASE}/dashboard/category-breakdown`, token, { total: 0, breakdown: [] }),
    fetchJson(`${API_BASE}/dashboard/recent-transactions?limit=8`, token, []),
    fetchJson(`${API_BASE}/dashboard/upcoming`, token, []),
  ])

  const cards = [
    { label: 'Income (This Month)', value: summary.totalIncomeThisMonth, icon: TrendingUp, tone: 'text-emerald-500 bg-emerald-500/15' },
    { label: 'Expenses (This Month)', value: summary.totalExpensesThisMonth, icon: TrendingDown, tone: 'text-rose-500 bg-rose-500/15' },
    { label: 'Loan EMI', value: summary.totalMonthlyEmi, icon: Landmark, tone: 'text-indigo-500 bg-indigo-500/15' },
    { label: 'Savings / Balance', value: summary.balance, icon: PiggyBank, tone: summary.balance >= 0 ? 'text-primary bg-primary/15' : 'text-destructive bg-destructive/15' },
  ]

  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-foreground">Finance Dashboard</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Income, spending, and where your money is going.</p>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-medium text-muted-foreground">{card.label}</h3>
              <div className={`rounded-full p-1.5 ${card.tone}`}>
                <card.icon className="h-3.5 w-3.5" />
              </div>
            </div>
            <span className="text-xl font-bold text-foreground">
              ₹{Math.abs(card.value).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>
        ))}
      </div>

      {/* Trend + Category breakdown */}
      <div className="grid gap-4 lg:grid-cols-5">
        <div className="lg:col-span-3 rounded-3xl border border-border bg-card p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-foreground mb-4">Spending Trend</h3>
          {trend.length > 0 ? (
            <TrendBarChart data={trend} />
          ) : (
            <p className="text-sm text-muted-foreground py-10 text-center">No data yet for this period.</p>
          )}
        </div>

        <div className="lg:col-span-2 rounded-3xl border border-border bg-card p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-foreground mb-4">Category Breakdown</h3>
          <CategoryDonutChart data={breakdown.breakdown} grandTotal={breakdown.total} />
        </div>
      </div>

      {/* Recent transactions + Upcoming */}
      <div className="grid gap-4 lg:grid-cols-5">
        <div className="lg:col-span-3 rounded-3xl border border-border bg-card p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-foreground mb-4">Recent Transactions</h3>
          {recent.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No transactions yet.</p>
          ) : (
            <ul className="divide-y divide-border">
              {recent.map((tx: any) => (
                <li key={`${tx.type}-${tx.id}`} className="flex items-center justify-between gap-3 py-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`rounded-full p-1.5 shrink-0 ${tx.type === 'INCOME' ? 'text-emerald-500 bg-emerald-500/15' : 'text-rose-500 bg-rose-500/15'}`}>
                      {tx.type === 'INCOME' ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-foreground truncate">{tx.description}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {new Date(tx.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} · {tx.category}
                        {tx.paymentMethod ? ` · ${formatPaymentMethod(tx.paymentMethod)}` : ''}
                      </div>
                    </div>
                  </div>
                  <span className={`text-sm font-semibold shrink-0 ${tx.type === 'INCOME' ? 'text-emerald-600 dark:text-emerald-400' : 'text-foreground'}`}>
                    {tx.type === 'INCOME' ? '+' : '-'}₹{tx.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="lg:col-span-2 rounded-3xl border border-border bg-card p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-foreground mb-4">Upcoming</h3>
          {upcoming.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Nothing due soon.</p>
          ) : (
            <ul className="divide-y divide-border">
              {upcoming.map((item: any) => (
                <li key={`${item.kind}-${item.id}`} className="flex items-center justify-between gap-3 py-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="rounded-full p-1.5 shrink-0 text-primary bg-primary/15">
                      <Calendar className="h-3.5 w-3.5" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-foreground truncate">{item.title}</div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(item.dueDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                      </div>
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-foreground shrink-0">
                    ₹{item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
