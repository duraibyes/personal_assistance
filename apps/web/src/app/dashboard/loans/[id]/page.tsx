import React from 'react'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { generateAmortizationSchedule } from '@repo/shared'
import { ArrowLeft, Building2, Calendar, ShieldCheck } from 'lucide-react'
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
          <h2 className="text-2xl font-bold text-foreground mb-2">Loan not found</h2>
          <Link href="/dashboard/loans" className="text-primary hover:text-primary/80">
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
          className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Loans
        </Link>

        <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground mb-2">{loan.name}</h1>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5"><Building2 className="h-4 w-4" /> {loan.lender}</span>
              <span className="flex items-center gap-1.5"><Calendar className="h-4 w-4" /> {loan.numberOfEmis} Months</span>
              <span className="rounded bg-primary/10 px-2 py-0.5 text-[10px] text-primary font-medium uppercase tracking-wider">
                {loan.loanType}
              </span>
              {loan.status === 'FORECLOSED' && (
                <span className="rounded bg-amber-500/15 px-2 py-0.5 text-[10px] text-amber-600 dark:text-amber-400 font-medium uppercase tracking-wider">
                  Foreclosed
                </span>
              )}
            </div>
          </div>
          <DeleteLoanButton loanId={loan.id} loanName={loan.name} token={token} />
        </div>

        {loan.status === 'FORECLOSED' && (
          <div className="mb-8 flex flex-wrap items-center gap-x-6 gap-y-2 rounded-3xl border border-amber-500/30 bg-amber-500/10 p-5">
            <span className="flex items-center gap-2 text-sm font-semibold text-amber-700 dark:text-amber-300">
              <ShieldCheck className="h-5 w-5" /> Loan foreclosed
            </span>
            {loan.foreclosureDate && (
              <span className="text-sm text-muted-foreground">
                Closed on{' '}
                <span className="font-medium text-foreground">
                  {new Date(loan.foreclosureDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
              </span>
            )}
            {loan.foreclosureAmount != null && (
              <span className="text-sm text-muted-foreground">
                Settlement amount{' '}
                <span className="font-medium text-foreground">
                  ₹{loan.foreclosureAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </span>
            )}
          </div>
        )}

        {/* Top Stats Cards */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-4 mb-8">
          <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
            <h3 className="text-sm font-medium text-muted-foreground mb-1">Principal Amount</h3>
            <div className="text-2xl font-bold text-foreground">₹{loan.principalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
          </div>
          <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
            <h3 className="text-sm font-medium text-muted-foreground mb-1">Interest Rate</h3>
            <div className="text-2xl font-bold text-foreground">{loan.interestRate}% p.a.</div>
          </div>
          <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
            <h3 className="text-sm font-medium text-muted-foreground mb-1">Monthly EMI</h3>
            <div className="text-2xl font-bold text-primary">₹{loan.emiAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
          </div>
          <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
            <h3 className="text-sm font-medium text-muted-foreground mb-1">Total Payable</h3>
            <div className="text-2xl font-bold text-foreground">₹{totalPayment.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
          </div>
        </div>

        {/* Amortization Schedule Table */}
        <h2 className="text-xl font-bold text-foreground mb-4">Amortization Schedule</h2>
        <div className="rounded-3xl border border-border bg-card p-2 shadow-sm">
          <div className="overflow-x-auto rounded-2xl bg-background">
            <table className="w-full text-left text-sm text-foreground min-w-[800px]">
              <thead className="bg-secondary/40 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-6 py-4 font-medium">Month</th>
                  <th className="px-6 py-4 font-medium">Payment Date</th>
                  <th className="px-6 py-4 font-medium text-right">EMI (₹)</th>
                  <th className="px-6 py-4 font-medium text-right">Principal (₹)</th>
                  <th className="px-6 py-4 font-medium text-right">Interest (₹)</th>
                  <th className="px-6 py-4 font-medium text-right">Balance (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {schedule.map((row) => (
                  <tr key={row.month} className="transition-colors hover:bg-secondary/20">
                    <td className="px-6 py-3 font-medium text-muted-foreground">{row.month}</td>
                    <td className="px-6 py-3 text-foreground">{row.paymentDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                    <td className="px-6 py-3 text-right font-medium text-primary">{row.emiAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    <td className="px-6 py-3 text-right text-emerald-500">{row.principalComponent.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    <td className="px-6 py-3 text-right text-rose-500">{row.interestComponent.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    <td className="px-6 py-3 text-right font-medium text-foreground">{row.outstandingBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
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
