'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'

export default function LoanActions({ loanId, token }: { loanId: string; token: string }) {
  const router = useRouter()
  const [isDeleting, setIsDeleting] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const handleDelete = async () => {
    try {
      setIsDeleting(true)
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/loans/${loanId}`, {
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
          href={`/dashboard/loans/${loanId}/edit`}
          className="inline-flex items-center justify-center rounded-xl bg-white/5 p-2 text-gray-400 transition-all hover:bg-indigo-500/20 hover:text-indigo-400"
          title="Edit Loan"
        >
          <Pencil className="h-4 w-4" />
        </Link>
        <button
          onClick={() => setShowConfirm(true)}
          className="inline-flex items-center justify-center rounded-xl bg-white/5 p-2 text-gray-400 transition-all hover:bg-rose-500/20 hover:text-rose-400"
          title="Delete Loan"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {showConfirm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm text-left">
          <div className="bg-zinc-900 border border-white/10 p-6 rounded-2xl max-w-sm w-full shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-2">Delete Loan?</h3>
            <p className="text-gray-400 text-sm mb-6 whitespace-normal">Are you sure you want to remove this loan? It will be moved to the trash.</p>
            <div className="flex justify-end gap-3">
              <Button type="button" variant="secondary" onClick={() => setShowConfirm(false)} disabled={isDeleting}>Cancel</Button>
              <Button type="button" onClick={handleDelete} loading={isDeleting} className="bg-rose-600 hover:bg-rose-700 text-white border-0">Yes, Delete</Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
