import React, { forwardRef } from 'react'
import { ChevronDown } from 'lucide-react'

export type SelectOption = {
  value: string
  label: string
  disabled?: boolean
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string
  error?: string
  options: SelectOption[]
  placeholder?: string
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, placeholder, className = '', id, ...props }, ref) => {
    const selectId = id || props.name || label.replace(/\s+/g, '-').toLowerCase()

    return (
      <div className="flex flex-col gap-1.5 w-full">
        <label htmlFor={selectId} className="text-sm font-medium text-white drop-shadow-sm">
          {label}
        </label>
        <div className="relative">
          <select
            id={selectId}
            ref={ref}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? `${selectId}-error` : undefined}
            className={`w-full appearance-none rounded-xl border bg-black/20 px-4 py-3 pr-10 text-white outline-none transition-all focus:bg-black/40 focus:ring-2 ${
              error
                ? 'border-red-500/50 focus:border-red-500/50 focus:ring-red-500/20'
                : 'border-white/20 focus:border-white/50 focus:ring-white/20'
            } ${className}`}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((opt) => (
              <option key={opt.value} value={opt.value} disabled={opt.disabled} className="bg-zinc-900 text-white">
                {opt.label}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        </div>
        {error && (
          <span id={`${selectId}-error`} className="text-xs text-red-400 mt-0.5" role="alert">
            {error}
          </span>
        )}
      </div>
    )
  }
)
Select.displayName = 'Select'
