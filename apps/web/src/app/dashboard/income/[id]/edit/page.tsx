import React from 'react'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { IncomeForm } from '@/components/ui/IncomeForm'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'

export default async function EditIncomePage({ params }: { params: { id: string } }) {
  const token = cookies().get('auth_token')?.value

  if (!token) {
    redirect('/login')
  }

  const [incomeRes, categoriesRes] = await Promise.all([
    fetch(`${API_BASE}/incomes/${params.id}`, {
      headers: { 'Authorization': `Bearer ${token}` },
      cache: 'no-store'
    }),
    fetch(`${API_BASE}/categories?type=INCOME`, {
      headers: { 'Authorization': `Bearer ${token}` },
      cache: 'no-store'
    }),
  ])

  if (!incomeRes.ok) {
    return (
      <div className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="rounded-2xl border border-border bg-card p-10 text-center shadow-sm">
          <h2 className="text-xl font-bold text-foreground mb-2">Income Not Found</h2>
          <p className="text-muted-foreground">The income record you are trying to edit does not exist or you do not have permission.</p>
        </div>
      </div>
    )
  }

  const income = await incomeRes.json()
  const categories = categoriesRes.ok ? await categoriesRes.json() : []

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-8">
      <IncomeForm token={token} categories={categories} initialData={income} />
    </div>
  )
}
