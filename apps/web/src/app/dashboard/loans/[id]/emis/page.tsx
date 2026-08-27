import React from 'react'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { EmiScheduleManager } from './EmiScheduleManager'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'

export default async function LoanEmisPage({ params }: { params: { id: string } }) {
  const token = cookies().get('auth_token')?.value

  if (!token) {
    redirect('/login')
  }

  let loan: any = null
  let emis: any[] = []
  try {
    const res = await fetch(`${API_BASE}/loans/${params.id}/emis`, {
      headers: { 'Authorization': `Bearer ${token}` },
      cache: 'no-store'
    })
    if (res.ok) {
      const json = await res.json()
      if (json && Array.isArray(json.emis)) {
        loan = json.loan
        emis = json.emis
      }
    }
  } catch (error) {
    console.error('Failed to fetch EMI schedule:', error)
  }

  if (!loan) {
    return (
      <div className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="rounded-2xl border border-border bg-card p-10 text-center shadow-sm">
          <h2 className="text-xl font-bold text-foreground mb-2">Loan Not Found</h2>
          <p className="text-muted-foreground">This loan does not exist or you do not have permission to view it.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex items-center gap-4">
          <Link href="/dashboard/loans" className="p-2 rounded-xl bg-secondary hover:bg-secondary/80 text-muted-foreground transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">{loan.name} — EMI Schedule</h1>
            <p className="text-sm text-muted-foreground">{loan.lender} · {loan.numberOfEmis} monthly installments</p>
          </div>
        </div>

        <EmiScheduleManager loanId={loan.id} emis={emis} token={token} />
      </div>
    </div>
  )
}
