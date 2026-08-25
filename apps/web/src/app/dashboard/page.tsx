import React from 'react'

export default function DashboardPage() {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-white drop-shadow-sm">Dashboard</h2>
        <p className="text-gray-400 mt-1">Here is a summary of your financial assets and liabilities.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl transition-all hover:bg-white/10">
          <h3 className="text-sm font-medium text-gray-300">Total Loans</h3>
          <p className="mt-2 text-3xl font-bold text-white">$0.00</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl transition-all hover:bg-white/10">
          <h3 className="text-sm font-medium text-gray-300">Monthly EMI</h3>
          <p className="mt-2 text-3xl font-bold text-white">$0.00</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl transition-all hover:bg-white/10">
          <h3 className="text-sm font-medium text-gray-300">Total Expenses (This Month)</h3>
          <p className="mt-2 text-3xl font-bold text-white">$0.00</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl transition-all hover:bg-white/10">
          <h3 className="text-sm font-medium text-gray-300">Active Vehicles</h3>
          <p className="mt-2 text-3xl font-bold text-white">0</p>
        </div>
      </div>
    </div>
  )
}
