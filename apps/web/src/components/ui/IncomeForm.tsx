'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { TrendingUp, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { Input } from './Input'
import { Select } from './Select'
import { SaveButton, CancelButton } from './Button'

const incomeSchema = z.object({
  amount: z.coerce.number().positive('Must be greater than 0'),
  categoryId: z.string().min(1, 'Category is required'),
  description: z.string().optional(),
  date: z.string().min(1, 'Date is required'),
})

type IncomeFormValues = z.infer<typeof incomeSchema>

type Category = { id: string; name: string; icon: string | null }

export function IncomeForm({
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

  const categoryOptions = categories.map((c) => ({
    value: c.id,
    label: c.icon ? `${c.icon} ${c.name}` : c.name,
  }))

  const { register, handleSubmit, formState: { errors, isValid, isSubmitting } } = useForm<IncomeFormValues>({
    resolver: zodResolver(incomeSchema),
    mode: 'onChange',
    defaultValues: {
      amount: initialData?.amount || undefined,
      categoryId: initialData?.categoryId || '',
      description: initialData?.description || '',
      date: initialData?.date ? new Date(initialData.date).toISOString().substring(0, 10) : new Date().toISOString().substring(0, 10),
    },
  })

  const onSubmit = async (data: IncomeFormValues) => {
    setServerError(null)
    try {
      const category = categories.find((c) => c.id === data.categoryId)
      const payload = {
        ...data,
        source: category?.name || 'Other',
      }

      const url = initialData
        ? `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/incomes/${initialData.id}`
        : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/incomes`

      const res = await fetch(url, {
        method: initialData ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      })

      const responseData = await res.json()
      if (!res.ok) throw new Error(responseData.error || `Failed to ${initialData ? 'update' : 'create'} income`)

      router.push('/dashboard/income')
      router.refresh()
    } catch (err: unknown) {
      setServerError(err instanceof Error ? err.message : 'An unexpected error occurred')
    }
  }

  return (
    <div className="mx-auto max-w-2xl animate-in fade-in duration-500">
      <div className="mb-6 flex items-center gap-4">
        <Link href="/dashboard/income" className="p-2 rounded-xl bg-secondary hover:bg-secondary/80 text-muted-foreground transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {initialData ? 'Edit Income' : 'Add Income'}
          </h1>
          <p className="text-sm text-muted-foreground">{initialData ? 'Update this income record.' : 'Log a new income entry.'}</p>
        </div>
      </div>

      {serverError && (
        <div className="mb-6 rounded-xl bg-destructive/10 p-4 text-sm text-destructive border border-destructive/20 shadow-sm">
          {serverError}
        </div>
      )}

      <div className="rounded-3xl border border-border bg-card p-6 md:p-8 shadow-sm">
        <div className="flex items-center gap-3 mb-6 border-b border-border pb-4">
          <TrendingUp className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-card-foreground">Income Details</h2>
        </div>

        <form id="income-form" onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5" noValidate>
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

          <Select
            label="Source / Category"
            options={categoryOptions}
            placeholder="Select a source"
            error={errors.categoryId?.message}
            {...register('categoryId')}
          />

          <Input
            label="Date"
            type="date"
            error={errors.date?.message}
            {...register('date')}
          />

          <div className="md:col-span-2">
            <Input
              label="Notes (Optional)"
              placeholder="e.g. August salary"
              error={errors.description?.message}
              {...register('description')}
            />
          </div>
        </form>
      </div>

      <div className="mt-8 flex items-center justify-end gap-4">
        <Link href="/dashboard/income">
          <CancelButton disabled={isSubmitting} />
        </Link>
        <SaveButton form="income-form" type="submit" disabled={!isValid || isSubmitting} loading={isSubmitting} className="px-8">
          {initialData ? 'Save Changes' : 'Add Income'}
        </SaveButton>
      </div>
    </div>
  )
}
