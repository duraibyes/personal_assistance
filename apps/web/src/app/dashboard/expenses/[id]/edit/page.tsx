import React from 'react'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { ExpenseForm } from '@/components/ui/ExpenseForm'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'

export default async function EditExpensePage({ params }: { params: { id: string } }) {
  const token = cookies().get('auth_token')?.value

  if (!token) {
    redirect('/login')
  }

  const [expenseRes, categoriesRes] = await Promise.all([
    fetch(`${API_BASE}/expenses/${params.id}`, {
      headers: { 'Authorization': `Bearer ${token}` },
      cache: 'no-store'
    }),
    fetch(`${API_BASE}/categories?type=EXPENSE`, {
      headers: { 'Authorization': `Bearer ${token}` },
      cache: 'no-store'
    }),
  ])

  if (!expenseRes.ok) {
    return (
      <div className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="rounded-2xl border border-border bg-card p-10 text-center shadow-sm">
          <h2 className="text-xl font-bold text-foreground mb-2">Expense Not Found</h2>
          <p className="text-muted-foreground">The expense you are trying to edit does not exist or you do not have permission.</p>
        </div>
      </div>
    )
  }

  const expense = await expenseRes.json()
  const categories = categoriesRes.ok ? await categoriesRes.json() : []

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-8">
      <ExpenseForm token={token} categories={categories} initialData={expense} />
    </div>
  )
}
