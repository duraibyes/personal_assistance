'use client'

import React, { useEffect } from 'react'
import { X } from 'lucide-react'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: React.ReactNode
  children: React.ReactNode
  maxWidth?: string
}

export function Modal({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  maxWidth = 'max-w-2xl' 
}: ModalProps) {
  
  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  // Close when clicking the backdrop
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={handleBackdropClick}
    >
      <div className={`w-full ${maxWidth} flex flex-col overflow-hidden rounded-3xl border border-white/10 bg-zinc-900 shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh]`}>
        <div className="flex items-center justify-between border-b border-white/10 p-6 shrink-0">
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            {title}
          </h2>
          <button 
            onClick={onClose} 
            className="rounded-full p-2 hover:bg-white/10 transition-colors shrink-0"
            aria-label="Close modal"
          >
            <X className="h-5 w-5 text-gray-400" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  )
}
