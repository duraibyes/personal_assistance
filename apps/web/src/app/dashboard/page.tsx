import React from 'react'
import { cookies } from 'next/headers'
import { Banknote, Wallet, Car, Activity } from 'lucide-react'

export default async function DashboardPage() {
  const token = cookies().get('auth_token')?.value
  
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/dashboard/summary`, {
    headers: { 'Authorization': `Bearer ${token}` },
    cache: 'no-store'
  })

  // Default values if API fails
  let summary = {
    totalLoansCount: 0,
    totalLoansAmount: 0,
    totalMonthlyEmi: 0,
    totalExpensesThisMonth: 0,
    activeVehiclesCount: 0
  }

  if (res.ok) {
    summary = await res.json()
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-white drop-shadow-sm">Dashboard</h2>
        <p className="text-gray-400 mt-1">Here is a summary of your financial assets and liabilities.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-3xl border border-white/5 bg-white/5 p-6 backdrop-blur-xl transition-all hover:bg-white/10 group">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-400">Total Loans</h3>
            <div className="rounded-full bg-indigo-500/20 p-2 text-indigo-400 group-hover:bg-indigo-500 group-hover:text-white transition-colors">
              <Banknote className="h-4 w-4" />
            </div>
          </div>
          <div className="flex flex-col">
            <span className="text-3xl font-bold text-white">{summary.totalLoansCount}</span>
            <span className="text-sm text-gray-400 mt-1">₹{summary.totalLoansAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
          </div>
        </div>
        
        <div className="rounded-3xl border border-white/5 bg-white/5 p-6 backdrop-blur-xl transition-all hover:bg-white/10 group">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-400">Monthly EMI</h3>
            <div className="rounded-full bg-rose-500/20 p-2 text-rose-400 group-hover:bg-rose-500 group-hover:text-white transition-colors">
              <Activity className="h-4 w-4" />
            </div>
          </div>
          <p className="text-3xl font-bold text-white">₹{summary.totalMonthlyEmi.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
        </div>
        
        <div className="rounded-3xl border border-white/5 bg-white/5 p-6 backdrop-blur-xl transition-all hover:bg-white/10 group">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-400">Total Expenses</h3>
            <div className="rounded-full bg-emerald-500/20 p-2 text-emerald-400 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
              <Wallet className="h-4 w-4" />
            </div>
          </div>
          <p className="text-3xl font-bold text-white">₹{summary.totalExpensesThisMonth.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
        </div>
        
        <div className="rounded-3xl border border-white/5 bg-white/5 p-6 backdrop-blur-xl transition-all hover:bg-white/10 group">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-400">Active Vehicles</h3>
            <div className="rounded-full bg-amber-500/20 p-2 text-amber-400 group-hover:bg-amber-500 group-hover:text-white transition-colors">
              <Car className="h-4 w-4" />
            </div>
          </div>
          <p className="text-3xl font-bold text-white">{summary.activeVehiclesCount}</p>
        </div>
      </div>
    </div>
  )
}
