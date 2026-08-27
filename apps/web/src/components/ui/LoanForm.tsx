'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Calculator, FileText, Loader2, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

import { calculateEMI } from '@repo/shared'
import { Input } from './Input'
import { Select } from './Select'
import { SaveButton, CancelButton } from './Button'
import { DocumentUploader } from '../DocumentUploader'
import { MultiDocumentUploader } from './MultiDocumentUploader'

// Create a client-side version of the schema for the form
const loanSchema = z.object({
  loanNumber: z.string().optional(),
  name: z.string().min(1, 'Loan Name is required'),
  lender: z.string().min(1, 'Lender is required'),
  loanType: z.enum(['PERSONAL', 'HOME', 'AUTO', 'EDUCATION']),
  principalAmount: z.coerce.number().positive('Must be greater than 0'),
  interestRate: z.coerce.number().positive('Must be greater than 0'),
  tenureMonths: z.coerce.number().int().positive('Must be at least 1 month'),
  startDate: z.string().min(1, 'Start Date is required'),
  firstEmiDate: z.string().min(1, 'First EMI Date is required'),
  emiAmount: z.coerce.number().positive('Must be greater than 0'),
  bouncingCharge: z.coerce.number().nonnegative().optional(),
  lenderAddress: z.string().optional(),
  lenderContact: z.string().optional(),
  lenderEmail: z.string().email('Invalid email').optional().or(z.literal('')),
  endDate: z.string().optional(),
})

type LoanFormValues = z.infer<typeof loanSchema>

const loanTypeOptions = [
  { value: 'PERSONAL', label: 'Personal' },
  { value: 'HOME', label: 'Home' },
  { value: 'AUTO', label: 'Auto' },
  { value: 'EDUCATION', label: 'Education' },
]

export function LoanForm({ token, initialData }: { token: string; initialData?: any }) {
  const router = useRouter()
  const [serverError, setServerError] = useState<string | null>(null)
  
  // Extraction State
  const [uploadedDocumentId, setUploadedDocumentId] = useState<string | null>(initialData?.documentId || null)
  const [extractedData, setExtractedData] = useState<any>(null)
  const [activeTab, setActiveTab] = useState<'upload' | 'library'>('upload')
  const [libraryDocs, setLibraryDocs] = useState<any[]>([])
  const [isLoadingLibrary, setIsLoadingLibrary] = useState(false)

  // Attachments State
  const [attachments, setAttachments] = useState<any[]>(initialData?.attachments || [])

  const { register, handleSubmit, control, setValue, formState: { errors, isValid, isSubmitting } } = useForm<LoanFormValues>({
    resolver: zodResolver(loanSchema),
    mode: 'onChange',
    defaultValues: {
      loanNumber: initialData?.loanNumber || '',
      name: initialData?.name || '',
      lender: initialData?.lender || '',
      loanType: initialData?.loanType || 'PERSONAL',
      principalAmount: initialData?.principalAmount || 0,
      interestRate: initialData?.interestRate || 0,
      tenureMonths: initialData?.tenureMonths || 0,
      emiAmount: initialData?.emiAmount || 0,
      startDate: initialData?.startDate ? new Date(initialData.startDate).toISOString().substring(0, 10) : '',
      firstEmiDate: initialData?.firstEmiDate ? new Date(initialData.firstEmiDate).toISOString().substring(0, 10) : '',
      endDate: initialData?.endDate ? new Date(initialData.endDate).toISOString().substring(0, 10) : '',
      bouncingCharge: initialData?.bouncingCharge || '',
      lenderAddress: initialData?.lenderAddress || '',
      lenderContact: initialData?.lenderContact || '',
      lenderEmail: initialData?.lenderEmail || '',
    },
  })

  const principalAmount = useWatch({ control, name: 'principalAmount' }) || 0
  const interestRate = useWatch({ control, name: 'interestRate' }) || 0
  const tenureMonths = useWatch({ control, name: 'tenureMonths' }) || 0

  const liveEmi = principalAmount > 0 && interestRate > 0 && tenureMonths > 0
    ? calculateEMI(principalAmount, interestRate, tenureMonths)
    : 0

  const fetchLibrary = async () => {
    setIsLoadingLibrary(true)
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/documents/library?type=LOAN`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) setLibraryDocs(await res.json())
    } catch (e) { console.error(e) } 
    finally { setIsLoadingLibrary(false) }
  }

  const handleSelectLibraryDoc = (doc: any) => {
    setUploadedDocumentId(doc.id)
    const data = doc.extractions?.[0]?.structuredData || {}
    setExtractedData(data)
    fillExtractedData(data)
    
    // Add to attachments if not already there
    if (!attachments.find(a => a.id === doc.id)) {
      setAttachments(prev => [...prev, doc])
    }
  }

  const fillExtractedData = (data: any) => {
    if (data.loanName) setValue('name', data.loanName, { shouldValidate: true })
    if (data.lender) setValue('lender', data.lender, { shouldValidate: true })
    if (data.principalAmount) setValue('principalAmount', data.principalAmount, { shouldValidate: true })
    if (data.interestRate) setValue('interestRate', data.interestRate, { shouldValidate: true })
    if (data.tenureMonths) setValue('tenureMonths', data.tenureMonths, { shouldValidate: true })
    if (data.emiDate) setValue('firstEmiDate', data.emiDate.substring(0, 10), { shouldValidate: true })
    if (data.startDate) setValue('startDate', data.startDate.substring(0, 10), { shouldValidate: true })
    if (data.emiAmount) setValue('emiAmount', data.emiAmount, { shouldValidate: true })
    if (data.bouncingCharge) setValue('bouncingCharge', data.bouncingCharge, { shouldValidate: true })
    if (data.lenderAddress) setValue('lenderAddress', data.lenderAddress, { shouldValidate: true })
    if (data.lenderContact) setValue('lenderContact', data.lenderContact, { shouldValidate: true })
    if (data.lenderEmail) setValue('lenderEmail', data.lenderEmail, { shouldValidate: true })
    if (data.endDate) setValue('endDate', data.endDate.substring(0, 10), { shouldValidate: true })
  }

  const onSubmit = async (data: LoanFormValues) => {
    setServerError(null)

    try {
      const payload = {
        ...data,
        documentId: uploadedDocumentId,
        attachmentIds: attachments.map(a => a.id),
        emiAmount: data.emiAmount || liveEmi,
        numberOfEmis: data.tenureMonths,
        remainingEmis: initialData ? undefined : data.tenureMonths,
        outstandingAmount: initialData ? undefined : data.principalAmount,
        nextEmiDate: initialData ? undefined : data.firstEmiDate,
        status: initialData?.status || 'ACTIVE',
      }

      const url = initialData 
        ? `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/loans/${initialData.id}`
        : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/loans`
        
      const res = await fetch(url, {
        method: initialData ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      })

      const responseData = await res.json()
      if (!res.ok) throw new Error(responseData.error || `Failed to ${initialData ? 'update' : 'create'} loan`)

      router.push('/dashboard/loans')
      router.refresh()
    } catch (err: unknown) {
      setServerError(err instanceof Error ? err.message : 'An unexpected error occurred')
    }
  }

  return (
    <div className="mx-auto max-w-7xl animate-in fade-in duration-500">
      <div className="sticky top-0 z-20 -mx-4 md:-mx-8 mb-6 flex items-center justify-between gap-3 border-b border-border bg-background/95 px-4 py-3 backdrop-blur-md md:px-8 md:py-4">
        <div className="flex items-center gap-3 min-w-0">
          <Link href="/dashboard/loans" className="p-2 rounded-xl bg-secondary hover:bg-secondary/80 text-muted-foreground transition-colors shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="min-w-0">
            <h1 className="text-base md:text-2xl font-bold tracking-tight text-foreground truncate">
              {initialData ? 'Edit Loan' : 'Add New Loan'}
            </h1>
            <p className="hidden sm:block text-xs md:text-sm text-muted-foreground truncate">{initialData ? 'Update your loan details and attachments.' : 'Upload a document or fill the form manually.'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 md:gap-3 shrink-0">
          <Link href="/dashboard/loans">
            <CancelButton size="sm" disabled={isSubmitting} />
          </Link>
          <SaveButton form="loan-form" type="submit" size="sm" disabled={!isValid || isSubmitting} loading={isSubmitting}>
            {initialData ? 'Save Changes' : 'Create Loan'}
          </SaveButton>
        </div>
      </div>

      {serverError && (
        <div className="mb-6 rounded-xl bg-destructive/10 p-4 text-sm text-destructive border border-destructive/20 shadow-sm">
          {serverError}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left Side: Form Fields */}
        <div className="xl:col-span-2 space-y-6">
          <div className="rounded-3xl border border-border bg-card backdrop-blur-md p-6 md:p-8 shadow-sm">
            <div className="flex items-center gap-3 mb-6 border-b border-border pb-4">
              <Calculator className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold text-card-foreground">Loan Details</h2>
            </div>
            
            <form id="loan-form" onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5" noValidate>
              <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                <Input label="Loan Name" placeholder="e.g. Home Loan" error={errors.name?.message} {...register('name')} />
                <Input label="Loan Number (Optional)" placeholder="e.g. LN-123456" error={errors.loanNumber?.message} {...register('loanNumber')} />
              </div>

              <Input label="Lender (Bank)" placeholder="HDFC Bank" error={errors.lender?.message} {...register('lender')} />
              <Select label="Type" options={loanTypeOptions} error={errors.loanType?.message} {...register('loanType')} />

              <Input label="Principal Amount (₹)" type="number" step="0.01" error={errors.principalAmount?.message} {...register('principalAmount')} />
              <Input label="Interest Rate (% p.a.)" type="number" step="0.01" error={errors.interestRate?.message} {...register('interestRate')} />

              <Input label="Tenure (Months)" type="number" error={errors.tenureMonths?.message} {...register('tenureMonths')} />
              <Input label="Manual EMI Amount (₹)" type="number" step="0.01" placeholder={`Auto: ₹${liveEmi.toFixed(2)}`} error={errors.emiAmount?.message} {...register('emiAmount')} />

              <Input label="Start Date" type="date" error={errors.startDate?.message} {...register('startDate')} />
              <Input label="First EMI Date" type="date" error={errors.firstEmiDate?.message} {...register('firstEmiDate')} />
              
              <Input label="End Date (Optional)" type="date" error={errors.endDate?.message} {...register('endDate')} />
              <Input label="Bouncing Charge (₹)" type="number" step="0.01" error={errors.bouncingCharge?.message} {...register('bouncingCharge')} />

              <Input label="Lender Contact" placeholder="Phone number" error={errors.lenderContact?.message} {...register('lenderContact')} />
              <Input label="Lender Email" type="email" placeholder="email@bank.com" error={errors.lenderEmail?.message} {...register('lenderEmail')} />

              <div className="md:col-span-2">
                <Input label="Lender Address" placeholder="Full branch address" error={errors.lenderAddress?.message} {...register('lenderAddress')} />
              </div>
            </form>
          </div>

          <div className="rounded-3xl border border-border bg-card backdrop-blur-md p-6 md:p-8 shadow-sm">
             <div className="flex items-center gap-3 mb-6 border-b border-border pb-4">
              <FileText className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold text-card-foreground">Attachments</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-4">Upload multiple documents like loan agreements, NOCs, or ID proofs associated with this loan.</p>
            <MultiDocumentUploader 
              entityId={initialData?.id || 'pending-loan'} 
              token={token}
              documents={attachments}
              onUploadSuccess={(doc) => setAttachments(prev => [...prev, doc])}
              onRemoveDocument={(docId) => setAttachments(prev => prev.filter(d => d.id !== docId))}
            />
          </div>
        </div>

        {/* Right Side: Extractor & Preview */}
        <div className="space-y-6">
          <div className="rounded-3xl border border-border bg-card backdrop-blur-md p-6 shadow-sm">
            <h3 className="text-base font-semibold text-card-foreground mb-4 border-b border-border pb-3">AI Data Extractor</h3>
            <div className="flex gap-1 mb-4 rounded-xl bg-secondary/50 p-1">
              <button
                type="button"
                onClick={() => setActiveTab('upload')}
                className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'upload' ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-transparent text-muted-foreground hover:text-foreground'}`}
              >
                Upload New
              </button>
              <button
                type="button"
                onClick={() => { setActiveTab('library'); fetchLibrary(); }}
                className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'library' ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-transparent text-muted-foreground hover:text-foreground'}`}
              >
                From Library
              </button>
            </div>

            {activeTab === 'upload' ? (
              <DocumentUploader
                entityId={initialData?.id || 'pending-loan'}
                documentType="LOAN"
                token={token}
                onExtractionComplete={(result: any) => {
                  if (result?.document?.id) {
                    setUploadedDocumentId(result.document.id)
                    // Auto add to attachments
                    setAttachments(prev => [...prev, result.document])
                  }
                  if (result?.extraction?.structuredData) {
                    setExtractedData(result.extraction.structuredData)
                    fillExtractedData(result.extraction.structuredData)
                  }
                }}
              />
            ) : (
              <div className="min-h-[150px] bg-secondary/10 rounded-xl border border-border p-3">
                {isLoadingLibrary ? (
                  <div className="flex items-center justify-center h-full text-muted-foreground py-8"><Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading...</div>
                ) : libraryDocs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-8 text-sm"><FileText className="w-8 h-8 mb-2 opacity-50" /> No unused docs.</div>
                ) : (
                  <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                    {libraryDocs.map(doc => (
                      <div key={doc.id} onClick={() => handleSelectLibraryDoc(doc)} className={`p-3 rounded-lg border cursor-pointer flex gap-3 items-center transition-colors ${uploadedDocumentId === doc.id ? 'bg-primary/10 border-primary' : 'bg-card border-border hover:border-primary/50'}`}>
                        <FileText className={`w-6 h-6 shrink-0 ${uploadedDocumentId === doc.id ? 'text-primary' : 'text-muted-foreground'}`} />
                        <div className="overflow-hidden w-full">
                          <div className="text-sm font-medium text-foreground truncate" title={doc.fileName}>{doc.fileName}</div>
                          <div className="text-xs text-muted-foreground">{new Date(doc.createdAt).toLocaleDateString()}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="rounded-3xl border border-border bg-card backdrop-blur-md p-6 sticky top-6 shadow-sm">
            <h3 className="text-base font-semibold text-card-foreground mb-4 border-b border-border pb-3">Extracted Data Preview</h3>
            
            {extractedData ? (
              <div className="space-y-3 text-sm text-foreground max-h-[300px] overflow-y-auto custom-scrollbar pr-2 mb-6">
                {Object.entries(extractedData).map(([key, value]) => {
                  if (!value) return null;
                  return (
                    <div key={key} className="flex flex-col">
                      <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                      <span className="font-semibold text-foreground break-words">{String(value)}</span>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground text-center py-6 border border-dashed border-border rounded-xl mb-6">
                No extraction data available.
              </div>
            )}

            <div className="border-t border-border pt-4 bg-secondary/10 rounded-xl p-4 mt-auto">
              <h3 className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-2">Calculated EMI Preview</h3>
              <div className="text-3xl font-bold text-foreground mb-2">₹{liveEmi.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
              {principalAmount > 0 && liveEmi > 0 && (
                <div className="text-xs text-muted-foreground space-y-1">
                  <div>Total Payment: <span className="text-foreground">₹{(liveEmi * tenureMonths).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>
                  <div>Total Interest: <span className="text-foreground">₹{((liveEmi * tenureMonths) - principalAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
