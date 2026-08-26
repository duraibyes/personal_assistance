import React from 'react'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { LoanForm } from '@/components/ui/LoanForm'

export default function AddLoanPage() {
  const token = cookies().get('auth_token')?.value
  
  if (!token) {
    redirect('/login')
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-8">
      <LoanForm token={token} />
    </div>
  )
}
