import React from 'react'
import { cookies } from 'next/headers'
import { RecurringManager } from './RecurringManager'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'

export default async function RecurringPage() {
  const token = cookies().get('auth_token')?.value

  let recurring: any[] = []
  let categories: any[] = []
  try {
    const [recurringRes, categoriesRes] = await Promise.all([
      fetch(`${API_BASE}/recurring`, {
        headers: { 'Authorization': `Bearer ${token}` },
        cache: 'no-store'
      }),
      fetch(`${API_BASE}/categories?type=EXPENSE`, {
        headers: { 'Authorization': `Bearer ${token}` },
        cache: 'no-store'
      }),
    ])
    if (recurringRes.ok) recurring = await recurringRes.json()
    if (categoriesRes.ok) categories = await categoriesRes.json()
  } catch (error) {
    console.error('Failed to fetch recurring expenses:', error)
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-8">
      <div className="mx-auto max-w-5xl">
        <RecurringManager recurring={recurring} categories={categories} token={token || ''} />
      </div>
    </div>
  )
}
