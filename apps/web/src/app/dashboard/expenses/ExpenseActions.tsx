'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Pencil, Trash2 } from 'lucide-react'
import { Button, CancelButton } from '@/components/ui/Button'

export default function ExpenseActions({ expenseId, token }: { expenseId: string; token: string }) {
  const router = useRouter()
  const [isDeleting, setIsDeleting] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const handleDelete = async () => {
    try {
      setIsDeleting(true)
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/expenses/${expenseId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!res.ok) throw new Error('Failed to delete')
      router.refresh()
    } catch (e) {
      console.error(e)
    } finally {
      setIsDeleting(false)
      setShowConfirm(false)
    }
  }

  return (
    <>
      <div className="flex items-center justify-end gap-2">
        <Link
          href={`/dashboard/expenses/${expenseId}/edit`}
          className="inline-flex items-center justify-center rounded-xl bg-secondary p-2 text-muted-foreground transition-all hover:bg-primary/15 hover:text-primary"
          title="Edit Expense"
        >
          <Pencil className="h-4 w-4" />
        </Link>
        <button
          onClick={() => setShowConfirm(true)}
          className="inline-flex items-center justify-center rounded-xl bg-secondary p-2 text-muted-foreground transition-all hover:bg-destructive/15 hover:text-destructive"
          title="Delete Expense"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {showConfirm && (
        <div className="fixed inset-0 bg-background/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm text-left">
          <div className="bg-card border border-border p-6 rounded-2xl max-w-sm w-full shadow-2xl">
            <h3 className="text-lg font-bold text-foreground mb-2">Delete Expense?</h3>
            <p className="text-muted-foreground text-sm mb-6 whitespace-normal">Are you sure you want to remove this expense? This cannot be undone.</p>
            <div className="flex justify-end gap-3">
              <CancelButton onClick={() => setShowConfirm(false)} disabled={isDeleting} />
              <Button type="button" onClick={handleDelete} loading={isDeleting} variant="danger">Yes, Delete</Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
