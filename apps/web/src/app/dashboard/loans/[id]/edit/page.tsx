import React from 'react'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { LoanForm } from '@/components/ui/LoanForm'

export default async function EditLoanPage({ params }: { params: { id: string } }) {
  const token = cookies().get('auth_token')?.value
  
  if (!token) {
    redirect('/login')
  }

  // Fetch existing loan data
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/loans/${params.id}`, {
    headers: { 'Authorization': `Bearer ${token}` },
    cache: 'no-store'
  })

  if (!res.ok) {
    return (
      <div className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="rounded-2xl border border-border bg-card p-10 text-center shadow-sm">
          <h2 className="text-xl font-bold text-foreground mb-2">Loan Not Found</h2>
          <p className="text-muted-foreground">The loan you are trying to edit does not exist or you do not have permission.</p>
        </div>
      </div>
    )
  }

  const loan = await res.json()

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-8">
      <LoanForm token={token} initialData={loan} />
    </div>
  )
}
