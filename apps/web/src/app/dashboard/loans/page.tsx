import React from 'react'
import { cookies } from 'next/headers'
import { Plus, Building2, Banknote, Calendar, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import LoanActions from './LoanActions'

export default async function LoansPage() {
  const token = cookies().get('auth_token')?.value
  
  // Fetch loans server-side
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/loans`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    cache: 'no-store'
  })
  
  const loans = res.ok ? await res.json() : []

  return (
    <div className="flex-1 overflow-y-auto p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white drop-shadow-md mb-2">Loan Management</h1>
            <p className="text-sm text-gray-400">Track and manage your active loans and EMI schedules.</p>
          </div>
          <Link
            href="/dashboard/loans/add"
            className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Loan
          </Link>
        </div>

        {/* Loans Table */}
        <div className="rounded-3xl border border-white/5 bg-white/5 p-2 backdrop-blur-md">
          <div className="overflow-hidden rounded-2xl bg-black/40">
            {loans.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="rounded-full bg-white/5 p-4 mb-4">
                  <Banknote className="h-8 w-8 text-indigo-400" />
                </div>
                <h3 className="text-lg font-medium text-white mb-2">No loans found</h3>
                <p className="text-sm text-gray-400 max-w-sm">You haven't added any loans yet. Click the Add Loan button to start tracking.</p>
              </div>
            ) : (
              <table className="w-full text-left text-sm text-gray-300">
                <thead className="bg-white/5 text-xs uppercase text-gray-400">
                  <tr>
                    <th className="px-6 py-4 font-medium">Loan Details</th>
                    <th className="px-6 py-4 font-medium">Principal & Rate</th>
                    <th className="px-6 py-4 font-medium">Monthly EMI</th>
                    <th className="px-6 py-4 font-medium">Status / Progress</th>
                    <th className="px-6 py-4 font-medium"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {loans.map((loan: any) => (
                    <tr key={loan.id} className="transition-colors hover:bg-white/5 group">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-white mb-1">{loan.name}</div>
                        <div className="flex items-center gap-2 text-xs text-gray-400">
                          <Building2 className="h-3 w-3" /> {loan.lender}
                          <span className="rounded bg-indigo-500/20 px-1.5 py-0.5 text-[10px] text-indigo-300 font-medium">
                            {loan.loanType}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-white font-medium">₹{loan.principalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                        <div className="text-xs text-gray-400">{loan.interestRate}% p.a.</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-white font-medium">₹{loan.emiAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                        <div className="flex items-center gap-1 text-xs text-gray-400 mt-1">
                          <Calendar className="h-3 w-3" /> {new Date(loan.nextEmiDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-between mb-1.5 text-xs">
                          <span className={loan.status === 'ACTIVE' ? 'text-emerald-400 font-medium' : 'text-gray-400 font-medium'}>{loan.status}</span>
                          <span className="text-gray-500">{loan.paidEmis} / {loan.numberOfEmis}</span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
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
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
