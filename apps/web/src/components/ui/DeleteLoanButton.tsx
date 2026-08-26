'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'

export function DeleteLoanButton({
  loanId,
  loanName,
  token,
}: {
  loanId: string
  loanName: string
  token: string
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleConfirm = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/loans/${loanId}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        }
      )
      if (!res.ok && res.status !== 204) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to delete loan')
      }
      setOpen(false)
      router.push('/dashboard/loans')
      router.refresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete loan')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Button variant="danger" size="sm" onClick={() => setOpen(true)}>
        <Trash2 className="h-4 w-4" />
        Delete
      </Button>
      {error && <p className="text-xs text-red-400 mt-2">{error}</p>}
      <ConfirmDialog
        isOpen={open}
        onClose={() => !loading && setOpen(false)}
        onConfirm={handleConfirm}
        loading={loading}
        title="Delete loan?"
        description={`This will permanently delete "${loanName}" and its payment history. This cannot be undone.`}
        confirmLabel="Delete loan"
        cancelLabel="Cancel"
      />
    </>
  )
}
