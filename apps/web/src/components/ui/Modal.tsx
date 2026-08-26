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
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4"
      onClick={handleBackdropClick}
    >
      <div className={`w-full ${maxWidth} flex flex-col overflow-hidden rounded-3xl border border-border bg-background shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh]`}>
        <div className="flex items-center justify-between border-b border-border p-6 shrink-0 bg-secondary/10">
          <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
            {title}
          </h2>
          <button 
            onClick={onClose} 
            className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground shrink-0"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  )
}
