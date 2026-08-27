'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { CheckCircle2, Clock, AlertTriangle, CircleDollarSign, Paperclip, Pencil, Wallet } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Button, SaveButton, CancelButton } from '@/components/ui/Button'

type Emi = {
  id: string
  emiNumber: number
  dueDate: string
  dueAmount: number
  status: 'PENDING' | 'PAID' | 'OVERDUE' | 'PARTIAL'
  paidAmount: number | null
  paymentDate: string | null
  description: string | null
  documentId: string | null
  document: { id: string; storageKey: string; fileName: string } | null
}

const paymentSchema = z.object({
  paymentDate: z.string().min(1, 'Payment date is required'),
  paidAmount: z.coerce.number().positive('Must be greater than 0'),
  description: z.string().optional(),
})
type PaymentFormValues = z.infer<typeof paymentSchema>

type BulkMode = 'ALL' | 'UNTIL_CURRENT_MONTH'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'

const STATUS_STYLES: Record<string, string> = {
  PENDING: 'bg-secondary text-muted-foreground',
  PAID: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
  OVERDUE: 'bg-destructive/15 text-destructive',
  PARTIAL: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
}

const STATUS_ICONS: Record<string, typeof Clock> = {
  PENDING: Clock,
  PAID: CheckCircle2,
  OVERDUE: AlertTriangle,
  PARTIAL: CircleDollarSign,
}

export function EmiScheduleManager({ loanId, emis, token }: { loanId: string; emis: Emi[]; token: string }) {
  const router = useRouter()
  const [activeEmi, setActiveEmi] = useState<Emi | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const [bulkModalOpen, setBulkModalOpen] = useState(false)
  const [bulkMode, setBulkMode] = useState<BulkMode>('UNTIL_CURRENT_MONTH')
  const [bulkDescription, setBulkDescription] = useState('')
  const [isBulkSubmitting, setIsBulkSubmitting] = useState(false)
  const [bulkError, setBulkError] = useState<string | null>(null)

  const { register, handleSubmit, reset, formState: { errors, isValid, isSubmitting } } = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentSchema),
    mode: 'onChange',
    defaultValues: { paymentDate: '', paidAmount: undefined, description: '' },
  })

  const openPaymentModal = (emi: Emi) => {
    setActiveEmi(emi)
    setFile(null)
    setServerError(null)
    reset({
      paymentDate: emi.paymentDate ? emi.paymentDate.substring(0, 10) : new Date().toISOString().substring(0, 10),
      paidAmount: emi.paidAmount ?? emi.dueAmount,
      description: emi.description || '',
    })
  }

  const onSubmit = async (data: PaymentFormValues) => {
    if (!activeEmi) return
    setServerError(null)
    try {
      let documentId: string | null = activeEmi.documentId

      if (file) {
        setIsUploading(true)
        const formData = new FormData()
        formData.append('file', file)
        formData.append('documentType', 'LOAN')
        formData.append('entityId', loanId)
        const uploadRes = await fetch(`${API_BASE}/documents/upload`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        })
        if (!uploadRes.ok) throw new Error('Failed to upload receipt')
        const uploadedDoc = await uploadRes.json()
        documentId = uploadedDoc.id
        setIsUploading(false)
      }

      const res = await fetch(`${API_BASE}/loans/${loanId}/emis/${activeEmi.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          paidAmount: data.paidAmount,
          paymentDate: data.paymentDate,
          description: data.description || null,
          documentId,
        }),
      })
      const responseData = await res.json()
      if (!res.ok) throw new Error(responseData.error || 'Failed to update payment')

      setActiveEmi(null)
      router.refresh()
    } catch (err: unknown) {
      setIsUploading(false)
      setServerError(err instanceof Error ? err.message : 'An unexpected error occurred')
    }
  }

  const openBulkModal = () => {
    setBulkMode('UNTIL_CURRENT_MONTH')
    setBulkDescription('')
    setBulkError(null)
    setBulkModalOpen(true)
  }

  const submitBulkPay = async () => {
    setBulkError(null)
    setIsBulkSubmitting(true)
    try {
      const res = await fetch(`${API_BASE}/loans/${loanId}/emis/bulk-pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ mode: bulkMode, description: bulkDescription || null }),
      })
      const responseData = await res.json()
      if (!res.ok) throw new Error(responseData.error || 'Failed to update payments')

      setBulkModalOpen(false)
      router.refresh()
    } catch (err: unknown) {
      setBulkError(err instanceof Error ? err.message : 'An unexpected error occurred')
    } finally {
      setIsBulkSubmitting(false)
    }
  }

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button onClick={openBulkModal}>
          <Wallet className="h-4 w-4 mr-2" />
          Update Payment
        </Button>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block rounded-3xl border border-border bg-card p-2 shadow-sm">
        <div className="overflow-hidden rounded-2xl bg-background">
          <table className="w-full text-left text-sm text-foreground">
            <thead className="bg-secondary/20 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-6 py-4 font-medium">#</th>
                <th className="px-6 py-4 font-medium">Due Date</th>
                <th className="px-6 py-4 font-medium">Due Amount</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium">Paid Details</th>
                <th className="px-6 py-4 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {emis.map((emi) => {
                const StatusIcon = STATUS_ICONS[emi.status] || Clock
                return (
                  <tr key={emi.id} className="hover:bg-secondary/10 transition-colors">
                    <td className="px-6 py-4 font-medium text-muted-foreground">{emi.emiNumber}</td>
                    <td className="px-6 py-4 text-foreground">{new Date(emi.dueDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                    <td className="px-6 py-4 text-foreground font-medium">₹{emi.dueAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLES[emi.status]}`}>
                        <StatusIcon className="h-3 w-3" /> {emi.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-muted-foreground">
                      {emi.status === 'PAID' || emi.status === 'PARTIAL' ? (
                        <div>
                          <div>₹{emi.paidAmount?.toLocaleString('en-IN', { minimumFractionDigits: 2 })} on {emi.paymentDate && new Date(emi.paymentDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</div>
                          {emi.document && (
                            <a href={emi.document.storageKey} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline mt-0.5">
                              <Paperclip className="h-3 w-3" /> Receipt
                            </a>
                          )}
                        </div>
                      ) : '—'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => openPaymentModal(emi)}
                        className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium bg-secondary text-foreground hover:bg-primary hover:text-primary-foreground transition-colors"
                        title="Edit this installment"
                      >
                        <Pencil className="h-3 w-3" /> Edit
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden flex flex-col gap-3">
        {emis.map((emi) => {
          const StatusIcon = STATUS_ICONS[emi.status] || Clock
          return (
            <div key={emi.id} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
              <div className="flex items-start justify-between gap-2 mb-3">
                <div>
                  <div className="font-semibold text-foreground">EMI #{emi.emiNumber}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    Due {new Date(emi.dueDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </div>
                </div>
                <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-medium shrink-0 ${STATUS_STYLES[emi.status]}`}>
                  <StatusIcon className="h-3 w-3" /> {emi.status}
                </span>
              </div>
              <div className="text-lg font-bold text-foreground mb-2">₹{emi.dueAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
              {(emi.status === 'PAID' || emi.status === 'PARTIAL') && (
                <div className="text-xs text-muted-foreground mb-3">
                  Paid ₹{emi.paidAmount?.toLocaleString('en-IN', { minimumFractionDigits: 2 })} on {emi.paymentDate && new Date(emi.paymentDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                  {emi.document && (
                    <a href={emi.document.storageKey} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-primary hover:underline mt-1">
                      <Paperclip className="h-3 w-3" /> View Receipt
                    </a>
                  )}
                </div>
              )}
              <button
                onClick={() => openPaymentModal(emi)}
                className="w-full inline-flex items-center justify-center gap-1 rounded-lg px-3 py-2 text-xs font-medium bg-secondary text-foreground hover:bg-primary hover:text-primary-foreground transition-colors"
              >
                <Pencil className="h-3 w-3" /> Edit
              </button>
            </div>
          )
        })}
      </div>

      {/* Per-row edit modal */}
      <Modal isOpen={Boolean(activeEmi)} onClose={() => setActiveEmi(null)} title={`Edit Payment — EMI #${activeEmi?.emiNumber ?? ''}`} maxWidth="max-w-md">
        <form id="emi-payment-form" onSubmit={handleSubmit(onSubmit)} className="p-6 flex flex-col gap-4" noValidate>
          {serverError && (
            <div className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive border border-destructive/20">
              {serverError}
            </div>
          )}
          <Input label="Payment Date" type="date" error={errors.paymentDate?.message} {...register('paymentDate')} />
          <Input label="Amount Paid (₹)" type="number" step="0.01" error={errors.paidAmount?.message} {...register('paidAmount')} />
          <Input label="Description (Optional)" placeholder="e.g. Paid via UPI" error={errors.description?.message} {...register('description')} />

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-foreground">Receipt (Optional)</label>
            <input
              type="file"
              accept="image/*,application/pdf"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="block w-full text-sm text-muted-foreground file:mr-4 file:rounded-xl file:border-0 file:bg-primary/20 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-primary hover:file:bg-primary/30"
            />
            {activeEmi?.document && !file && (
              <p className="text-xs text-muted-foreground">Current receipt: {activeEmi.document.fileName} (uploading a new file will replace it)</p>
            )}
          </div>

          <div className="flex justify-end gap-3 mt-2">
            <CancelButton onClick={() => setActiveEmi(null)} disabled={isSubmitting || isUploading} />
            <SaveButton form="emi-payment-form" type="submit" disabled={!isValid || isSubmitting || isUploading} loading={isSubmitting || isUploading}>
              {isUploading ? 'Uploading...' : 'Save Payment'}
            </SaveButton>
          </div>
        </form>
      </Modal>

      {/* Bulk update payment modal */}
      <Modal isOpen={bulkModalOpen} onClose={() => setBulkModalOpen(false)} title="Update Payment" maxWidth="max-w-md">
        <div className="p-6 flex flex-col gap-4">
          {bulkError && (
            <div className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive border border-destructive/20">
              {bulkError}
            </div>
          )}

          <div className="flex flex-col gap-2">
            <label className="flex items-start gap-3 rounded-xl border border-border p-3 cursor-pointer hover:bg-secondary/40 transition-colors">
              <input
                type="radio"
                name="bulk-mode"
                className="mt-1 accent-primary"
                checked={bulkMode === 'ALL'}
                onChange={() => setBulkMode('ALL')}
              />
              <span>
                <span className="block text-sm font-medium text-foreground">Mark all as paid (using due date)</span>
                <span className="block text-xs text-muted-foreground mt-0.5">Every installment for the full tenure is marked Paid, using each installment&apos;s own due date as its payment date.</span>
              </span>
            </label>

            <label className="flex items-start gap-3 rounded-xl border border-border p-3 cursor-pointer hover:bg-secondary/40 transition-colors">
              <input
                type="radio"
                name="bulk-mode"
                className="mt-1 accent-primary"
                checked={bulkMode === 'UNTIL_CURRENT_MONTH'}
                onChange={() => setBulkMode('UNTIL_CURRENT_MONTH')}
              />
              <span>
                <span className="block text-sm font-medium text-foreground">Mark as paid until current month</span>
                <span className="block text-xs text-muted-foreground mt-0.5">Only installments whose due date has already arrived (today or earlier) are marked Paid. An installment due later this month is left as-is.</span>
              </span>
            </label>
          </div>

          <Input
            label="Description (Optional)"
            placeholder="Applied to every installment marked paid"
            value={bulkDescription}
            onChange={(e) => setBulkDescription(e.target.value)}
          />

          <div className="flex justify-end gap-3 mt-2">
            <CancelButton onClick={() => setBulkModalOpen(false)} disabled={isBulkSubmitting} />
            <SaveButton onClick={submitBulkPay} loading={isBulkSubmitting} disabled={isBulkSubmitting}>
              Apply
            </SaveButton>
          </div>
        </div>
      </Modal>
    </>
  )
}
