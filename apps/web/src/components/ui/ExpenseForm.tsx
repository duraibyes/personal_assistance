'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Wallet, ArrowLeft, Sparkles, Paperclip } from 'lucide-react'
import Link from 'next/link'
import { Input } from './Input'
import { Select } from './Select'
import { SaveButton, CancelButton } from './Button'
import { DocumentUploader } from '../DocumentUploader'
import { PAYMENT_METHOD_OPTIONS } from '@/lib/constants'

const expenseSchema = z.object({
  amount: z.coerce.number().positive('Must be greater than 0'),
  categoryId: z.string().min(1, 'Category is required'),
  description: z.string().min(1, 'Description is required'),
  date: z.string().min(1, 'Date is required'),
  paymentMethod: z.string().min(1, 'Payment method is required'),
  vendorName: z.string().optional(),
  transactionId: z.string().optional(),
  upiId: z.string().optional(),
})

type ExpenseFormValues = z.infer<typeof expenseSchema>

type Category = { id: string; name: string; icon: string | null }

/** What the AI returns for an EXPENSE document (see OcrService.ExpenseExtractionResult). */
type ExpenseExtraction = {
  vendorName?: string
  amount?: number
  date?: string
  category?: string
  transactionId?: string
  upiId?: string
}

/** The model returns a free-text category ("Food"); the form needs one of the user's category ids. */
function matchCategoryId(categories: Category[], label?: string): string | undefined {
  if (!label) return undefined
  const needle = label.trim().toLowerCase()
  if (!needle) return undefined
  const exact = categories.find((c) => c.name.toLowerCase() === needle)
  if (exact) return exact.id
  const partial = categories.find(
    (c) => c.name.toLowerCase().includes(needle) || needle.includes(c.name.toLowerCase())
  )
  return partial?.id
}

const EXTRACTION_LABELS: Record<keyof ExpenseExtraction, string> = {
  vendorName: 'Vendor',
  amount: 'Amount',
  date: 'Date',
  category: 'Category',
  transactionId: 'Transaction ID',
  upiId: 'UPI ID',
}

export function ExpenseForm({
  token,
  categories,
  initialData,
}: {
  token: string
  categories: Category[]
  initialData?: any
}) {
  const router = useRouter()
  const [serverError, setServerError] = useState<string | null>(null)
  const [documentId, setDocumentId] = useState<string | null>(initialData?.documentId ?? null)
  const [documentName, setDocumentName] = useState<string | null>(null)
  const [extractedData, setExtractedData] = useState<ExpenseExtraction | null>(null)

  const categoryOptions = categories.map((c) => ({
    value: c.id,
    label: c.icon ? `${c.icon} ${c.name}` : c.name,
  }))

  const { register, handleSubmit, setValue, getValues, formState: { errors, isValid, isSubmitting } } = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseSchema),
    mode: 'onChange',
    defaultValues: {
      amount: initialData?.amount || undefined,
      categoryId: initialData?.categoryId || '',
      description: initialData?.description || '',
      date: initialData?.date ? new Date(initialData.date).toISOString().substring(0, 10) : new Date().toISOString().substring(0, 10),
      paymentMethod: initialData?.paymentMethod || '',
      vendorName: initialData?.vendorName || '',
      transactionId: initialData?.transactionId || '',
      upiId: initialData?.upiId || '',
    },
  })

  const applyExtraction = (result: any) => {
    const data: ExpenseExtraction = result?.extraction?.structuredData || {}
    setExtractedData(data)
    if (result?.document?.id) setDocumentId(result.document.id)
    if (result?.document?.fileName) setDocumentName(result.document.fileName)

    const set = (field: keyof ExpenseFormValues, value: string | number) =>
      setValue(field, value as never, { shouldValidate: true, shouldDirty: true })

    if (data.amount) set('amount', data.amount)
    if (data.date) set('date', data.date.substring(0, 10))
    if (data.vendorName) set('vendorName', data.vendorName)
    if (data.transactionId) set('transactionId', data.transactionId)
    if (data.upiId) set('upiId', data.upiId)

    const categoryId = matchCategoryId(categories, data.category)
    if (categoryId) set('categoryId', categoryId)

    // The receipt has no "description" of its own — the vendor is the best stand-in,
    // and it is a required field, so fill it rather than leave the form unsubmittable.
    if (data.vendorName && !getValues('description')?.trim()) set('description', data.vendorName)

    // A UPI id on the receipt is a reliable tell for how it was paid.
    if (data.upiId && !getValues('paymentMethod')) set('paymentMethod', 'UPI')
  }

  const onSubmit = async (data: ExpenseFormValues) => {
    setServerError(null)
    try {
      const category = categories.find((c) => c.id === data.categoryId)
      const payload = {
        ...data,
        category: category?.name || 'Other',
        documentId,
      }

      const url = initialData
        ? `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/expenses/${initialData.id}`
        : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/expenses`

      const res = await fetch(url, {
        method: initialData ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      })

      const responseData = await res.json()
      if (!res.ok) throw new Error(responseData.error || `Failed to ${initialData ? 'update' : 'create'} expense`)

      router.push('/dashboard/expenses')
      router.refresh()
    } catch (err: unknown) {
      setServerError(err instanceof Error ? err.message : 'An unexpected error occurred')
    }
  }

  return (
    <div className="mx-auto max-w-2xl animate-in fade-in duration-500">
      <div className="mb-6 flex items-center gap-4">
        <Link href="/dashboard/expenses" className="p-2 rounded-xl bg-secondary hover:bg-secondary/80 text-muted-foreground transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {initialData ? 'Edit Expense' : 'Add Expense'}
          </h1>
          <p className="text-sm text-muted-foreground">{initialData ? 'Update this expense record.' : 'Log a new expense quickly.'}</p>
        </div>
      </div>

      {serverError && (
        <div className="mb-6 rounded-xl bg-destructive/10 p-4 text-sm text-destructive border border-destructive/20 shadow-sm">
          {serverError}
        </div>
      )}

      <div className="mb-6 rounded-3xl border border-border bg-card p-6 md:p-8 shadow-sm">
        <div className="flex items-center gap-3 mb-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-card-foreground">Scan a Receipt</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-5">
          Upload a bill, receipt or payment screenshot. It is stored with the expense and the fields below are filled in for you — review them before saving.
        </p>

        <DocumentUploader
          entityId={initialData?.id || 'pending-expense'}
          documentType="EXPENSE"
          token={token}
          onExtractionComplete={applyExtraction}
        />

        {extractedData && (
          <div className="mt-4 rounded-2xl border border-primary/30 bg-primary/5 p-4">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className="text-sm font-medium text-foreground">Extracted from document</span>
              {documentName && (
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <Paperclip className="h-3 w-3" /> {documentName}
                </span>
              )}
            </div>
            {Object.values(extractedData).some((v) => v !== null && v !== undefined && v !== '') ? (
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
                {(Object.keys(EXTRACTION_LABELS) as (keyof ExpenseExtraction)[]).map((key) => {
                  const value = extractedData[key]
                  if (value === null || value === undefined || value === '') return null
                  return (
                    <div key={key} className="min-w-0">
                      <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">{EXTRACTION_LABELS[key]}</dt>
                      <dd className="text-sm font-medium text-foreground break-words">{String(value)}</dd>
                    </div>
                  )
                })}
              </dl>
            ) : (
              <p className="text-sm text-muted-foreground">
                Nothing could be read from this file. It is still attached — fill the fields in manually.
              </p>
            )}
          </div>
        )}
      </div>

      <div className="rounded-3xl border border-border bg-card p-6 md:p-8 shadow-sm">
        <div className="flex items-center gap-3 mb-6 border-b border-border pb-4">
          <Wallet className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-card-foreground">Expense Details</h2>
          {documentId && (
            <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
              <Paperclip className="h-3 w-3" /> Receipt attached
            </span>
          )}
        </div>

        <form id="expense-form" onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5" noValidate>
          <div className="md:col-span-2">
            <Input
              label="Amount (₹)"
              type="number"
              step="0.01"
              autoFocus
              placeholder="0.00"
              error={errors.amount?.message}
              {...register('amount')}
            />
          </div>

          <div className="md:col-span-2">
            <Input
              label="Description"
              placeholder="e.g. Grocery shopping"
              error={errors.description?.message}
              {...register('description')}
            />
          </div>

          <Select
            label="Category"
            options={categoryOptions}
            placeholder="Select a category"
            error={errors.categoryId?.message}
            {...register('categoryId')}
          />

          <Select
            label="Payment Method"
            options={PAYMENT_METHOD_OPTIONS}
            placeholder="Select a payment method"
            error={errors.paymentMethod?.message}
            {...register('paymentMethod')}
          />

          <Input
            label="Date"
            type="date"
            error={errors.date?.message}
            {...register('date')}
          />

          <Input
            label="Vendor / Notes (Optional)"
            placeholder="e.g. Big Bazaar"
            error={errors.vendorName?.message}
            {...register('vendorName')}
          />

          <Input
            label="Transaction ID (Optional)"
            placeholder="Reference number"
            error={errors.transactionId?.message}
            {...register('transactionId')}
          />

          <Input
            label="UPI ID (Optional)"
            placeholder="name@bank"
            error={errors.upiId?.message}
            {...register('upiId')}
          />
        </form>
      </div>

      <div className="mt-8 flex items-center justify-end gap-4">
        <Link href="/dashboard/expenses">
          <CancelButton disabled={isSubmitting} />
        </Link>
        <SaveButton form="expense-form" type="submit" disabled={!isValid || isSubmitting} loading={isSubmitting} className="px-8">
          {initialData ? 'Save Changes' : 'Add Expense'}
        </SaveButton>
      </div>
    </div>
  )
}
