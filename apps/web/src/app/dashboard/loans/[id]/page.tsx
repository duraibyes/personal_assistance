import React from 'react'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { generateAmortizationSchedule } from '@repo/shared'
import { ArrowLeft, Building2, Calendar } from 'lucide-react'
import Link from 'next/link'
import { DeleteLoanButton } from '@/components/ui/DeleteLoanButton'

export default async function LoanDetailsPage({ params }: { params: { id: string } }) {
  const token = cookies().get('auth_token')?.value
  
  if (!token) redirect('/login')

  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/loans/${params.id}`, {
    headers: { 'Authorization': `Bearer ${token}` },
    cache: 'no-store'
  })
  
  const loan = res.ok ? await res.json() : null

  if (!loan) {
    return (
      <div className="flex-1 p-8 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-2">Loan not found</h2>
          <Link href="/dashboard/loans" className="text-indigo-400 hover:text-indigo-300">
            &larr; Back to Loans
          </Link>
        </div>
      </div>
    )
  }

  const schedule = generateAmortizationSchedule(
    loan.principalAmount,
    loan.interestRate,
    loan.numberOfEmis,
    new Date(loan.nextEmiDate) // Assuming nextEmiDate is a good start date for projection
  )

  const totalInterest = schedule.reduce((sum, row) => sum + row.interestComponent, 0)
  const totalPayment = loan.principalAmount + totalInterest

  return (
    <div className="flex-1 overflow-y-auto p-8">
      <div className="mx-auto max-w-6xl">
        <Link 
          href="/dashboard/loans" 
          className="inline-flex items-center gap-2 text-sm font-medium text-gray-400 hover:text-white transition-colors mb-6"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Loans
        </Link>
        
        <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white drop-shadow-md mb-2">{loan.name}</h1>
            <div className="flex items-center gap-4 text-sm text-gray-400">
              <span className="flex items-center gap-1.5"><Building2 className="h-4 w-4" /> {loan.lender}</span>
              <span className="flex items-center gap-1.5"><Calendar className="h-4 w-4" /> {loan.numberOfEmis} Months</span>
              <span className="rounded bg-indigo-500/20 px-2 py-0.5 text-[10px] text-indigo-300 font-medium uppercase tracking-wider">
                {loan.loanType}
              </span>
            </div>
          </div>
          <DeleteLoanButton loanId={loan.id} loanName={loan.name} token={token} />
        </div>

        {/* Top Stats Cards */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-4 mb-8">
          <div className="rounded-3xl border border-white/5 bg-white/5 p-6 backdrop-blur-md">
            <h3 className="text-sm font-medium text-gray-400 mb-1">Principal Amount</h3>
            <div className="text-2xl font-bold text-white">₹{loan.principalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
          </div>
          <div className="rounded-3xl border border-white/5 bg-white/5 p-6 backdrop-blur-md">
            <h3 className="text-sm font-medium text-gray-400 mb-1">Interest Rate</h3>
            <div className="text-2xl font-bold text-white">{loan.interestRate}% p.a.</div>
          </div>
          <div className="rounded-3xl border border-white/5 bg-white/5 p-6 backdrop-blur-md">
            <h3 className="text-sm font-medium text-gray-400 mb-1">Monthly EMI</h3>
            <div className="text-2xl font-bold text-indigo-400">₹{loan.emiAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
          </div>
          <div className="rounded-3xl border border-white/5 bg-white/5 p-6 backdrop-blur-md">
            <h3 className="text-sm font-medium text-gray-400 mb-1">Total Payable</h3>
            <div className="text-2xl font-bold text-white">₹{totalPayment.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
          </div>
        </div>

        {/* Amortization Schedule Table */}
        <h2 className="text-xl font-bold text-white mb-4">Amortization Schedule</h2>
        <div className="rounded-3xl border border-white/5 bg-white/5 p-2 backdrop-blur-md">
          <div className="overflow-x-auto rounded-2xl bg-black/40">
            <table className="w-full text-left text-sm text-gray-300 min-w-[800px]">
              <thead className="bg-white/5 text-xs uppercase text-gray-400">
                <tr>
                  <th className="px-6 py-4 font-medium">Month</th>
                  <th className="px-6 py-4 font-medium">Payment Date</th>
                  <th className="px-6 py-4 font-medium text-right">EMI (₹)</th>
                  <th className="px-6 py-4 font-medium text-right">Principal (₹)</th>
                  <th className="px-6 py-4 font-medium text-right">Interest (₹)</th>
                  <th className="px-6 py-4 font-medium text-right">Balance (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {schedule.map((row) => (
                  <tr key={row.month} className="transition-colors hover:bg-white/5">
                    <td className="px-6 py-3 font-medium text-gray-400">{row.month}</td>
                    <td className="px-6 py-3 text-white">{row.paymentDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                    <td className="px-6 py-3 text-right font-medium text-indigo-400">{row.emiAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    <td className="px-6 py-3 text-right text-emerald-400">{row.principalComponent.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    <td className="px-6 py-3 text-right text-rose-400">{row.interestComponent.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    <td className="px-6 py-3 text-right font-medium text-white">{row.outstandingBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
