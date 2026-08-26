'use client'

import React, { useState } from 'react'
import { Plus } from 'lucide-react'
import AddLoanModal from '@/components/ui/AddLoanModal'
import { Button } from '@/components/ui/Button'

export default function LoansClientPage({ token }: { token: string }) {
  const [isModalOpen, setIsModalOpen] = useState(false)

  return (
    <>
      <Button variant="primary" size="sm" onClick={() => setIsModalOpen(true)}>
        <Plus className="h-4 w-4" />
        Add Loan
      </Button>

      <AddLoanModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        token={token}
      />
    </>
  )
}
