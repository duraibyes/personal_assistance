'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/Button'
import imageCompression from 'browser-image-compression'
import { FileText, Eye, Trash2 } from 'lucide-react'

interface Document {
  id: string;
  fileName: string;
  storageKey: string;
  createdAt: string;
}

interface MultiDocumentUploaderProps {
  entityId: string;
  token: string;
  documents: Document[];
  onUploadSuccess: (doc: Document) => void;
  onRemoveDocument: (docId: string) => void;
}

export function MultiDocumentUploader({
  entityId,
  token,
  documents,
  onUploadSuccess,
  onRemoveDocument,
}: MultiDocumentUploaderProps) {
  const [file, setFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState('')
  const [docToRemove, setDocToRemove] = useState<string | null>(null)

  const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
      setError('')
    }
  }

  const handleUpload = async () => {
    if (!file) return

    try {
      setIsUploading(true)
      setError('')

      let fileToUpload = file
      if (file.type.startsWith('image/')) {
        const options = { maxSizeMB: 1, maxWidthOrHeight: 1920, useWebWorker: true }
        try { fileToUpload = await imageCompression(file, options) } 
        catch (e) { console.warn('Image compression failed', e) }
      }

      const formData = new FormData()
      formData.append('file', fileToUpload)
      formData.append('documentType', 'LOAN')
      formData.append('entityId', entityId)

      const uploadRes = await fetch(`${apiBase}/documents/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      })

      if (!uploadRes.ok) {
        const data = await uploadRes.json().catch(() => ({}))
        throw new Error(data.error || 'Upload failed.')
      }
      const uploadedDoc = await uploadRes.json()
      
      onUploadSuccess(uploadedDoc)
      setFile(null)
      // reset file input
      const fileInput = document.getElementById('multi-doc-upload') as HTMLInputElement
      if (fileInput) fileInput.value = ''
      
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Upload failed.')
    } finally {
      setIsUploading(false)
    }
  }

  const handleConfirmRemove = () => {
    if (docToRemove) {
      onRemoveDocument(docToRemove)
      setDocToRemove(null)
    }
  }

  return (
    <div className="space-y-4">
      {/* Upload Section */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 flex flex-col md:flex-row items-center gap-4">
        <div className="flex-1 w-full">
          <input
            id="multi-doc-upload"
            type="file"
            accept="image/*,application/pdf"
            onChange={handleFileChange}
            className="block w-full text-sm text-gray-400 file:mr-4 file:rounded-xl file:border-0 file:bg-indigo-500/20 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-indigo-300 hover:file:bg-indigo-500/30"
          />
        </div>
        <Button
          onClick={handleUpload}
          disabled={!file || isUploading}
          loading={isUploading}
          type="button"
          className="shrink-0 w-full md:w-auto"
        >
          {isUploading ? 'Uploading...' : 'Upload Attachment'}
        </Button>
      </div>
      {error && <p className="text-sm text-red-400">{error}</p>}

      {/* Documents List */}
      {documents.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {documents.map((doc) => (
            <div key={doc.id} className="rounded-xl border border-white/10 bg-black/40 p-3 flex flex-col justify-between">
              <div className="flex items-start gap-3 mb-3">
                <FileText className="h-8 w-8 text-indigo-400 shrink-0" />
                <div className="overflow-hidden">
                  <div className="text-sm font-medium text-gray-200 truncate" title={doc.fileName}>{doc.fileName}</div>
                  <div className="text-xs text-gray-500">{new Date(doc.createdAt).toLocaleDateString()}</div>
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-auto">
                <a
                  href={doc.storageKey}
                  target="_blank"
                  rel="noreferrer"
                  className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-gray-300 transition-colors inline-flex"
                  title="Preview"
                >
                  <Eye className="h-4 w-4" />
                </a>
                <button
                  type="button"
                  onClick={() => setDocToRemove(doc.id)}
                  className="p-2 bg-rose-500/10 hover:bg-rose-500/20 rounded-lg text-rose-400 transition-colors inline-flex"
                  title="Remove"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Remove Confirm Dialog */}
      {docToRemove && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-white/10 p-6 rounded-2xl max-w-sm w-full shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-2">Remove Document?</h3>
            <p className="text-gray-400 text-sm mb-6">Are you sure you want to remove this attachment from the loan? This action cannot be undone.</p>
            <div className="flex justify-end gap-3">
              <Button type="button" onClick={() => setDocToRemove(null)}>Cancel</Button>
              <Button type="button" onClick={handleConfirmRemove} className="bg-rose-600 hover:bg-rose-700 text-white border-0">Yes, Remove</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
