'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Pencil, Trash2, Tag, Lock } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Button, SaveButton, CancelButton } from '@/components/ui/Button'

type Category = {
  id: string
  name: string
  type: string
  icon: string | null
  isActive: boolean
  isSystem: boolean
  userId: string | null
}

const categorySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  type: z.enum(['EXPENSE', 'INCOME', 'BOTH']),
  icon: z.string().optional(),
})
type CategoryFormValues = z.infer<typeof categorySchema>

const typeOptions = [
  { value: 'EXPENSE', label: 'Expense' },
  { value: 'INCOME', label: 'Income' },
  { value: 'BOTH', label: 'Both' },
]

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'

export function CategoriesManager({ categories, token }: { categories: Category[]; token: string }) {
  const router = useRouter()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Category | null>(null)
  const [deleting, setDeleting] = useState<Category | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const { register, handleSubmit, reset, formState: { errors, isValid, isSubmitting } } = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    mode: 'onChange',
    defaultValues: { name: '', type: 'EXPENSE', icon: '' },
  })

  const openAdd = () => {
    setEditing(null)
    reset({ name: '', type: 'EXPENSE', icon: '' })
    setServerError(null)
    setModalOpen(true)
  }

  const openEdit = (category: Category) => {
    setEditing(category)
    reset({ name: category.name, type: category.type as any, icon: category.icon || '' })
    setServerError(null)
    setModalOpen(true)
  }

  const onSubmit = async (data: CategoryFormValues) => {
    setServerError(null)
    try {
      const url = editing ? `${API_BASE}/categories/${editing.id}` : `${API_BASE}/categories`
      const res = await fetch(url, {
        method: editing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(data),
      })
      const responseData = await res.json()
      if (!res.ok) throw new Error(responseData.error || 'Failed to save category')

      setModalOpen(false)
      router.refresh()
    } catch (err: unknown) {
      setServerError(err instanceof Error ? err.message : 'An unexpected error occurred')
    }
  }

  const toggleActive = async (category: Category) => {
    try {
      await fetch(`${API_BASE}/categories/${category.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ isActive: !category.isActive }),
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
      await fetch(`${API_BASE}/categories/${deleting.id}`, {
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
          <h1 className="text-2xl font-bold tracking-tight text-foreground mb-1">Categories</h1>
          <p className="text-sm text-muted-foreground">Organize your expenses and income with reusable tags.</p>
        </div>
        <Button onClick={openAdd}>
          <Plus className="h-4 w-4 mr-2" />
          Add Category
        </Button>
      </div>

      <div className="rounded-3xl border border-border bg-card p-2 shadow-sm">
        <div className="overflow-hidden rounded-2xl bg-background">
          <table className="w-full text-left text-sm text-foreground">
            <thead className="bg-secondary/20 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-6 py-4 font-medium">Category</th>
                <th className="px-6 py-4 font-medium">Type</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {categories.map((category) => (
                <tr key={category.id} className="transition-colors hover:bg-secondary/10">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 font-medium text-foreground">
                      <span>{category.icon || <Tag className="h-4 w-4 text-muted-foreground" />}</span>
                      {category.name}
                      {category.isSystem && (
                        <span title="System category">
                          <Lock className="h-3 w-3 text-muted-foreground" />
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-muted-foreground">{category.type}</td>
                  <td className="px-6 py-4">
                    <button
                      type="button"
                      disabled={category.isSystem}
                      onClick={() => toggleActive(category)}
                      className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                        category.isActive
                          ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                          : 'bg-secondary text-muted-foreground'
                      } ${category.isSystem ? 'cursor-default opacity-70' : 'cursor-pointer hover:opacity-80'}`}
                    >
                      {category.isActive ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {!category.isSystem && (
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEdit(category)}
                          className="inline-flex items-center justify-center rounded-xl bg-secondary p-2 text-muted-foreground transition-all hover:bg-primary/15 hover:text-primary"
                          title="Edit Category"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setDeleting(category)}
                          className="inline-flex items-center justify-center rounded-xl bg-secondary p-2 text-muted-foreground transition-all hover:bg-destructive/15 hover:text-destructive"
                          title="Delete Category"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Category' : 'Add Category'} maxWidth="max-w-md">
        <form id="category-form" onSubmit={handleSubmit(onSubmit)} className="p-6 flex flex-col gap-4" noValidate>
          {serverError && (
            <div className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive border border-destructive/20">
              {serverError}
            </div>
          )}
          <Input label="Name" placeholder="e.g. Subscriptions" error={errors.name?.message} {...register('name')} />
          <Select label="Type" options={typeOptions} error={errors.type?.message} {...register('type')} />
          <Input label="Icon (emoji, optional)" placeholder="🎯" error={errors.icon?.message} {...register('icon')} />
          <div className="flex justify-end gap-3 mt-2">
            <CancelButton onClick={() => setModalOpen(false)} disabled={isSubmitting} />
            <SaveButton form="category-form" type="submit" disabled={!isValid || isSubmitting} loading={isSubmitting} />
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={Boolean(deleting)}
        onClose={() => !isDeleting && setDeleting(null)}
        onConfirm={handleDelete}
        loading={isDeleting}
        title="Delete category?"
        description={`This will deactivate "${deleting?.name}". Past transactions keep their existing tag.`}
        confirmLabel="Delete category"
      />
    </>
  )
}
