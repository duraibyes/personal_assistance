import React from 'react'
import { cookies } from 'next/headers'
import { CategoriesManager } from './CategoriesManager'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'

export default async function CategoriesPage() {
  const token = cookies().get('auth_token')?.value

  let categories: any[] = []
  try {
    const res = await fetch(`${API_BASE}/categories?includeInactive=true`, {
      headers: { 'Authorization': `Bearer ${token}` },
      cache: 'no-store'
    })
    if (res.ok) categories = await res.json()
  } catch (error) {
    console.error('Failed to fetch categories:', error)
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-8">
      <div className="mx-auto max-w-4xl">
        <CategoriesManager categories={categories} token={token || ''} />
      </div>
    </div>
  )
}
