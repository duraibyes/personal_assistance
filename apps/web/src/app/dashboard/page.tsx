import React from 'react'
import { cookies } from 'next/headers'
import { Banknote, Wallet, Car, Activity } from 'lucide-react'

export default async function DashboardPage() {
  const token = cookies().get('auth_token')?.value

  let summary = {
    totalLoansCount: 0,
    totalLoansAmount: 0,
    totalMonthlyEmi: 0,
    totalExpensesThisMonth: 0,
    activeVehiclesCount: 0
  }

  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/dashboard/summary`, {
      headers: { 'Authorization': `Bearer ${token}` },
      cache: 'no-store'
    })

    if (res.ok) {
      summary = await res.json()
    }
  } catch (error) {
    console.error('Failed to fetch dashboard summary:', error)
  }

  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-foreground">Dashboard</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Here is a summary of your financial assets and liabilities.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm transition-all hover:border-primary/30 group">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-medium text-muted-foreground">Total Loans</h3>
            <div className="rounded-full bg-indigo-500/15 p-1.5 text-indigo-500 group-hover:bg-indigo-500 group-hover:text-white transition-colors">
              <Banknote className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-bold text-foreground">{summary.totalLoansCount}</span>
            <span className="text-xs text-muted-foreground mt-0.5">₹{summary.totalLoansAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm transition-all hover:border-primary/30 group">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-medium text-muted-foreground">Monthly EMI</h3>
            <div className="rounded-full bg-primary/15 p-1.5 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
              <Activity className="h-3.5 w-3.5" />
            </div>
          </div>
          <p className="text-xl font-bold text-foreground">₹{summary.totalMonthlyEmi.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm transition-all hover:border-primary/30 group">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-medium text-muted-foreground">Total Expenses</h3>
            <div className="rounded-full bg-emerald-500/15 p-1.5 text-emerald-500 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
              <Wallet className="h-3.5 w-3.5" />
            </div>
          </div>
          <p className="text-xl font-bold text-foreground">₹{summary.totalExpensesThisMonth.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm transition-all hover:border-primary/30 group">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-medium text-muted-foreground">Active Vehicles</h3>
            <div className="rounded-full bg-amber-500/15 p-1.5 text-amber-500 group-hover:bg-amber-500 group-hover:text-white transition-colors">
              <Car className="h-3.5 w-3.5" />
            </div>
          </div>
          <p className="text-xl font-bold text-foreground">{summary.activeVehiclesCount}</p>
        </div>
      </div>
    </div>
  )
}
