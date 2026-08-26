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
        <div className="rounded-2xl border border-white/10 bg-black/40 backdrop-blur-md p-10 text-center">
          <h2 className="text-xl font-bold text-white mb-2">Loan Not Found</h2>
          <p className="text-gray-400">The loan you are trying to edit does not exist or you do not have permission.</p>
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
