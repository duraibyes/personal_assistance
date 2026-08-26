'use client'

import React, { useState } from 'react'
import { Calculator } from 'lucide-react'
import { calculateEMI } from '@repo/shared'
import { useRouter } from 'next/navigation'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Input } from './Input'
import { Select } from './Select'
import { SaveButton, CancelButton } from './Button'
import { Modal } from './Modal'
import { DocumentUploader } from '../DocumentUploader'
import { FileText, Loader2 } from 'lucide-react'

const loanSchema = z.object({
  name: z.string().min(1, 'Loan Name is required'),
  lender: z.string().min(1, 'Lender is required'),
  loanType: z.enum(['PERSONAL', 'HOME', 'AUTO', 'EDUCATION']),
  principalAmount: z.coerce.number().positive('Must be greater than 0'),
  interestRate: z.coerce.number().positive('Must be greater than 0'),
  tenureMonths: z.coerce.number().int().positive('Must be at least 1 month'),
  startDate: z.string().min(1, 'Start Date is required'),
  firstEmiDate: z.string().min(1, 'First EMI Date is required'),
})

type LoanFormValues = z.infer<typeof loanSchema>

const loanTypeOptions = [
  { value: 'PERSONAL', label: 'Personal' },
  { value: 'HOME', label: 'Home' },
  { value: 'AUTO', label: 'Auto' },
  { value: 'EDUCATION', label: 'Education' },
]

export default function AddLoanModal({
  isOpen,
  onClose,
  token,
}: {
  isOpen: boolean
  onClose: () => void
  token: string
}) {
  const router = useRouter()
  const [serverError, setServerError] = useState<string | null>(null)
  const [uploadedDocumentId, setUploadedDocumentId] = useState<string | null>(null)
  
  const [activeTab, setActiveTab] = useState<'upload' | 'library'>('upload')
  const [libraryDocs, setLibraryDocs] = useState<any[]>([])
  const [isLoadingLibrary, setIsLoadingLibrary] = useState(false)

  const fetchLibrary = async () => {
    setIsLoadingLibrary(true)
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/documents/library?type=LOAN`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        setLibraryDocs(await res.json())
      }
    } catch (e) {
      console.error(e)
    } finally {
      setIsLoadingLibrary(false)
    }
  }

  const handleSelectLibraryDoc = (doc: any) => {
    setUploadedDocumentId(doc.id)
    const data = doc.extractions?.[0]?.structuredData || {}
    if (data.loanName) setValue('name', data.loanName, { shouldValidate: true })
    if (data.lender) setValue('lender', data.lender, { shouldValidate: true })
    if (data.principalAmount) setValue('principalAmount', data.principalAmount, { shouldValidate: true })
    if (data.interestRate) setValue('interestRate', data.interestRate, { shouldValidate: true })
    if (data.tenureMonths) setValue('tenureMonths', data.tenureMonths, { shouldValidate: true })
    if (data.emiDate) setValue('firstEmiDate', data.emiDate.substring(0, 10), { shouldValidate: true })
    if (data.startDate) setValue('startDate', data.startDate.substring(0, 10), { shouldValidate: true })
  }

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors, isValid, isSubmitting },
  } = useForm<LoanFormValues>({
    resolver: zodResolver(loanSchema),
    mode: 'onChange',
    defaultValues: {
      loanType: 'PERSONAL',
    },
  })

  const principalAmount = useWatch({ control, name: 'principalAmount' }) || 0
  const interestRate = useWatch({ control, name: 'interestRate' }) || 0
  const tenureMonths = useWatch({ control, name: 'tenureMonths' }) || 0

  const liveEmi =
    principalAmount > 0 && interestRate > 0 && tenureMonths > 0
      ? calculateEMI(principalAmount, interestRate, tenureMonths)
      : 0

  const onSubmit = async (data: LoanFormValues) => {
    setServerError(null)

    try {
      const payload = {
        ...data,
        documentId: uploadedDocumentId,
        emiAmount: liveEmi,
        numberOfEmis: data.tenureMonths,
        remainingEmis: data.tenureMonths,
        outstandingAmount: data.principalAmount,
        nextEmiDate: data.firstEmiDate,
        status: 'ACTIVE',
      }

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/loans`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        }
      )

      const responseData = await res.json()

      if (!res.ok) {
        throw new Error(responseData.error || 'Failed to create loan')
      }

      router.refresh()
      onClose()
    } catch (err: unknown) {
      setServerError(err instanceof Error ? err.message : 'Failed to create loan')
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="max-w-4xl"
      title={
        <>
          <Calculator className="h-5 w-5 text-indigo-400" />
          Add New Loan
        </>
      }
    >
      <div className="flex flex-col md:flex-row h-full max-h-full">
        <div className="flex-1 p-6 overflow-y-auto">
          {serverError && (
            <div className="mb-4 rounded-xl bg-red-500/20 p-3 text-sm text-red-200">{serverError}</div>
          )}

          <div className="mb-6 bg-white/5 p-4 rounded-xl border border-white/10">
            <div className="flex gap-4 mb-4 border-b border-white/10 pb-2">
              <button
                type="button"
                onClick={() => setActiveTab('upload')}
                className={`text-sm font-medium transition-colors ${activeTab === 'upload' ? 'text-indigo-400' : 'text-gray-400 hover:text-gray-300'}`}
              >
                Upload New
              </button>
              <button
                type="button"
                onClick={() => { setActiveTab('library'); fetchLibrary(); }}
                className={`text-sm font-medium transition-colors ${activeTab === 'library' ? 'text-indigo-400' : 'text-gray-400 hover:text-gray-300'}`}
              >
                Choose from Library
              </button>
            </div>

            {activeTab === 'upload' ? (
              <DocumentUploader
              entityId="pending-loan"
              documentType="LOAN"
              token={token}
              onExtractionComplete={(result: any) => {
                const data = result?.extraction?.structuredData || {}
                if (data.loanName) setValue('name', data.loanName, { shouldValidate: true })
                if (data.lender) setValue('lender', data.lender, { shouldValidate: true })
                if (data.principalAmount) setValue('principalAmount', data.principalAmount, { shouldValidate: true })
                if (data.interestRate) setValue('interestRate', data.interestRate, { shouldValidate: true })
                if (data.tenureMonths) setValue('tenureMonths', data.tenureMonths, { shouldValidate: true })
                if (data.emiDate) setValue('firstEmiDate', data.emiDate.substring(0, 10), { shouldValidate: true })
                if (data.startDate) setValue('startDate', data.startDate.substring(0, 10), { shouldValidate: true })
                
                if (result?.document?.id) {
                  setUploadedDocumentId(result.document.id)
                }
              }}
            />
            ) : (
              <div className="min-h-[150px]">
                {isLoadingLibrary ? (
                  <div className="flex items-center justify-center h-full text-gray-400">
                    <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading library...
                  </div>
                ) : libraryDocs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-gray-500 text-sm py-8">
                    <FileText className="w-8 h-8 mb-2 opacity-50" />
                    No unused loan documents found.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[250px] overflow-y-auto pr-2 custom-scrollbar">
                    {libraryDocs.map(doc => (
                      <div 
                        key={doc.id}
                        onClick={() => handleSelectLibraryDoc(doc)}
                        className={`p-3 rounded-lg border cursor-pointer transition-all flex items-start gap-3 ${uploadedDocumentId === doc.id ? 'bg-indigo-500/20 border-indigo-500' : 'bg-black/20 border-white/5 hover:border-white/20 hover:bg-black/40'}`}
                      >
                        <FileText className={`w-8 h-8 shrink-0 ${uploadedDocumentId === doc.id ? 'text-indigo-400' : 'text-gray-400'}`} />
                        <div className="overflow-hidden">
                          <div className="text-sm text-gray-200 truncate font-medium" title={doc.fileName}>{doc.fileName}</div>
                          <div className="text-xs text-gray-500 mt-1">
                            {new Date(doc.createdAt).toLocaleDateString()} &bull; {doc.extractions?.length ? 'Extracted' : 'No Data'}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <form id="loan-form" onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-2 gap-4" noValidate>
            <div className="md:col-span-2">
              <Input
                label="Loan Name"
                placeholder="e.g. Home Loan"
                error={errors.name?.message}
                {...register('name')}
              />
            </div>

            <Input
              label="Lender (Bank)"
              placeholder="HDFC Bank"
              error={errors.lender?.message}
              {...register('lender')}
            />

            <Select
              label="Type"
              options={loanTypeOptions}
              error={errors.loanType?.message}
              {...register('loanType')}
            />

            <Input
              label="Principal Amount (₹)"
              type="number"
              step="0.01"
              error={errors.principalAmount?.message}
              {...register('principalAmount')}
            />

            <Input
              label="Interest Rate (% p.a.)"
              type="number"
              step="0.01"
              error={errors.interestRate?.message}
              {...register('interestRate')}
            />

            <Input
              label="Tenure (Months)"
              type="number"
              error={errors.tenureMonths?.message}
              {...register('tenureMonths')}
            />

            <Input
              label="Start Date"
              type="date"
              error={errors.startDate?.message}
              {...register('startDate')}
            />

            <div className="md:col-span-2">
              <Input
                label="First EMI Date"
                type="date"
                error={errors.firstEmiDate?.message}
                {...register('firstEmiDate')}
              />
            </div>
          </form>
        </div>

        <div className="w-full md:w-64 bg-black/20 p-6 flex flex-col items-center justify-center border-t md:border-t-0 md:border-l border-white/10 shrink-0">
          <h3 className="text-sm font-medium text-gray-400 mb-2">Monthly EMI Preview</h3>
          <div className="text-4xl font-bold text-white mb-2 text-center">
            ₹{liveEmi.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          {principalAmount > 0 && liveEmi > 0 && (
            <div className="text-xs text-gray-500 text-center">
              Total Payment: ₹{(liveEmi * tenureMonths).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              <br />
              Total Interest: ₹
              {((liveEmi * tenureMonths) - principalAmount).toLocaleString('en-IN', {
                minimumFractionDigits: 2,
              })}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 border-t border-white/10 p-6 bg-black/10 shrink-0">
        <CancelButton onClick={onClose} disabled={isSubmitting} />
        <SaveButton
          form="loan-form"
          type="submit"
          disabled={!isValid || isSubmitting}
          loading={isSubmitting}
        >
          Create Loan
        </SaveButton>
      </div>
    </Modal>
  )
}
