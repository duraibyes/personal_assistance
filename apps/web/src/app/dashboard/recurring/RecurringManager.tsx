'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Pencil, Trash2, Repeat, Calendar } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Button, SaveButton, CancelButton } from '@/components/ui/Button'
import { PAYMENT_METHOD_OPTIONS, RECURRING_FREQUENCY_OPTIONS, formatPaymentMethod } from '@/lib/constants'

type Category = { id: string; name: string; icon: string | null }
type Recurring = {
  id: string
  title: string
  amount: number
  categoryId: string | null
  category: Category | null
  frequency: string
  nextDueDate: string
  paymentMethod: string
  notes: string | null
  isActive: boolean
}

const recurringSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  amount: z.coerce.number().positive('Must be greater than 0'),
  categoryId: z.string().optional(),
  frequency: z.enum(['MONTHLY', 'QUARTERLY', 'HALF_YEARLY', 'YEARLY', 'CUSTOM']),
  nextDueDate: z.string().min(1, 'Next due date is required'),
  paymentMethod: z.string().min(1, 'Payment method is required'),
  notes: z.string().optional(),
})
type RecurringFormValues = z.infer<typeof recurringSchema>

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'

const frequencyLabel = (value: string) =>
  RECURRING_FREQUENCY_OPTIONS.find((o) => o.value === value)?.label || value

export function RecurringManager({
  recurring,
  categories,
  token,
}: {
  recurring: Recurring[]
  categories: Category[]
  token: string
}) {
  const router = useRouter()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Recurring | null>(null)
  const [deleting, setDeleting] = useState<Recurring | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const categoryOptions = categories.map((c) => ({ value: c.id, label: c.icon ? `${c.icon} ${c.name}` : c.name }))

  const { register, handleSubmit, reset, formState: { errors, isValid, isSubmitting } } = useForm<RecurringFormValues>({
    resolver: zodResolver(recurringSchema),
    mode: 'onChange',
    defaultValues: { title: '', amount: undefined, categoryId: '', frequency: 'MONTHLY', nextDueDate: '', paymentMethod: '', notes: '' },
  })

  const openAdd = () => {
    setEditing(null)
    reset({ title: '', amount: undefined, categoryId: '', frequency: 'MONTHLY', nextDueDate: new Date().toISOString().substring(0, 10), paymentMethod: '', notes: '' })
    setServerError(null)
    setModalOpen(true)
  }

  const openEdit = (item: Recurring) => {
    setEditing(item)
    reset({
      title: item.title,
      amount: item.amount,
      categoryId: item.categoryId || '',
      frequency: item.frequency as any,
      nextDueDate: item.nextDueDate.substring(0, 10),
      paymentMethod: item.paymentMethod,
      notes: item.notes || '',
    })
    setServerError(null)
    setModalOpen(true)
  }

  const onSubmit = async (data: RecurringFormValues) => {
    setServerError(null)
    try {
      const url = editing ? `${API_BASE}/recurring/${editing.id}` : `${API_BASE}/recurring`
      const res = await fetch(url, {
        method: editing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(data),
      })
      const responseData = await res.json()
      if (!res.ok) throw new Error(responseData.error || 'Failed to save recurring expense')

      setModalOpen(false)
      router.refresh()
    } catch (err: unknown) {
      setServerError(err instanceof Error ? err.message : 'An unexpected error occurred')
    }
  }

  const toggleActive = async (item: Recurring) => {
    try {
      await fetch(`${API_BASE}/recurring/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ isActive: !item.isActive }),
      })
      router.refresh()
    } catch (e) {
      console.error(e)
    }
  }

  const handleDelete = async () => {
    if (!deleting) return
    setIsDeleting(true)
    try {
      await fetch(`${API_BASE}/recurring/${deleting.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      setDeleting(null)
      router.refresh()
    } catch (e) {
      console.error(e)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground mb-1">Recurring Payments</h1>
          <p className="text-sm text-muted-foreground">Bills and commitments that repeat — never forget a due date.</p>
        </div>
        <Button onClick={openAdd}>
          <Plus className="h-4 w-4 mr-2" />
          Add Recurring
        </Button>
      </div>

      {recurring.length === 0 ? (
        <div className="rounded-3xl border border-border bg-card p-2 shadow-sm">
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="rounded-full bg-secondary p-4 mb-4">
              <Repeat className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-2">No recurring payments yet</h3>
            <p className="text-sm text-muted-foreground max-w-sm">Add bills like electricity, internet, or rent so you never miss a due date.</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {recurring.map((item) => (
            <div key={item.id} className={`rounded-2xl border border-border bg-card p-4 shadow-sm ${!item.isActive ? 'opacity-60' : ''}`}>
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="min-w-0">
                  <div className="font-semibold text-foreground truncate">{item.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {item.category?.icon ? `${item.category.icon} ` : ''}{item.category?.name || 'Uncategorized'} · {frequencyLabel(item.frequency)}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => openEdit(item)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-primary/15 hover:text-primary transition-colors" title="Edit">
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => setDeleting(item)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/15 hover:text-destructive transition-colors" title="Delete">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              <div className="text-xl font-bold text-foreground mb-2">₹{item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>

              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1 text-muted-foreground">
                  <Calendar className="h-3 w-3" /> Due {new Date(item.nextDueDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                </span>
                <button
                  type="button"
                  onClick={() => toggleActive(item)}
                  className={`rounded-full px-2.5 py-1 text-[10px] font-medium transition-colors cursor-pointer hover:opacity-80 ${
                    item.isActive ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' : 'bg-secondary text-muted-foreground'
                  }`}
                >
                  {item.isActive ? 'Active' : 'Paused'}
                </button>
              </div>
              <div className="text-[10px] text-muted-foreground mt-2">{formatPaymentMethod(item.paymentMethod)}</div>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Recurring Payment' : 'Add Recurring Payment'} maxWidth="max-w-lg">
        <form id="recurring-form" onSubmit={handleSubmit(onSubmit)} className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4" noValidate>
          {serverError && (
            <div className="md:col-span-2 rounded-xl bg-destructive/10 p-3 text-sm text-destructive border border-destructive/20">
              {serverError}
            </div>
          )}
          <div className="md:col-span-2">
            <Input label="Title" placeholder="e.g. Internet Bill" error={errors.title?.message} {...register('title')} />
          </div>
          <Input label="Amount (₹)" type="number" step="0.01" error={errors.amount?.message} {...register('amount')} />
          <Select label="Frequency" options={RECURRING_FREQUENCY_OPTIONS} error={errors.frequency?.message} {...register('frequency')} />
          <Select label="Category" options={categoryOptions} placeholder="Select a category" error={errors.categoryId?.message} {...register('categoryId')} />
          <Select label="Payment Method" options={PAYMENT_METHOD_OPTIONS} placeholder="Select a payment method" error={errors.paymentMethod?.message} {...register('paymentMethod')} />
          <Input label="Next Due Date" type="date" error={errors.nextDueDate?.message} {...register('nextDueDate')} />
          <div className="md:col-span-2">
            <Input label="Notes (Optional)" placeholder="Any extra detail" error={errors.notes?.message} {...register('notes')} />
          </div>
          <div className="md:col-span-2 flex justify-end gap-3 mt-2">
            <CancelButton onClick={() => setModalOpen(false)} disabled={isSubmitting} />
            <SaveButton form="recurring-form" type="submit" disabled={!isValid || isSubmitting} loading={isSubmitting} />
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={Boolean(deleting)}
        onClose={() => !isDeleting && setDeleting(null)}
        onConfirm={handleDelete}
        loading={isDeleting}
        title="Remove recurring payment?"
        description={`This will deactivate "${deleting?.title}". You can find inactive items greyed out in this list.`}
        confirmLabel="Remove"
      />
    </>
  )
}
