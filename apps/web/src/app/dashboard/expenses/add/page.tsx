import React from 'react'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { ExpenseForm } from '@/components/ui/ExpenseForm'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'

export default async function AddExpensePage() {
  const token = cookies().get('auth_token')?.value

  if (!token) {
    redirect('/login')
  }

  let categories: any[] = []
  try {
    const res = await fetch(`${API_BASE}/categories?type=EXPENSE`, {
      headers: { 'Authorization': `Bearer ${token}` },
      cache: 'no-store'
    })
    if (res.ok) categories = await res.json()
  } catch (error) {
    console.error('Failed to fetch categories:', error)
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-8">
      <ExpenseForm token={token} categories={categories} />
    </div>
  )
}
