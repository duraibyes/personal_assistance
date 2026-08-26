import React, { forwardRef } from 'react'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
  hint?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, className = '', id, ...props }, ref) => {
    const inputId = id || props.name || label.replace(/\s+/g, '-').toLowerCase()

    return (
      <div className="flex flex-col gap-1.5 w-full">
        <label htmlFor={inputId} className="text-sm font-medium text-white drop-shadow-sm">
          {label}
        </label>
        <input
          id={inputId}
          ref={ref}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${inputId}-error` : undefined}
          className={`rounded-xl border bg-black/20 px-4 py-3 text-white placeholder-gray-400 outline-none transition-all focus:bg-black/40 focus:ring-2 ${
            error
              ? 'border-red-500/50 focus:border-red-500/50 focus:ring-red-500/20'
              : 'border-white/20 focus:border-white/50 focus:ring-white/20'
          } ${className}`}
          {...props}
        />
        {error ? (
          <span id={`${inputId}-error`} className="text-xs text-red-400 mt-0.5" role="alert">
            {error}
          </span>
        ) : hint ? (
          <span className="text-xs text-gray-500">{hint}</span>
        ) : null}
      </div>
    )
  }
)
Input.displayName = 'Input'
