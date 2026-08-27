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
        <label htmlFor={selectId} className="text-sm font-medium text-foreground">
          {label}
        </label>
        <div className="relative">
          <select
            id={selectId}
            ref={ref}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? `${selectId}-error` : undefined}
            className={`w-full appearance-none rounded-xl border bg-background px-3.5 py-2.5 pr-9 text-sm text-foreground outline-none transition-all focus:bg-accent/10 focus:ring-2 ${
              error
                ? 'border-destructive/50 focus:border-destructive/50 focus:ring-destructive/20'
                : 'border-border focus:border-primary/50 focus:ring-primary/20'
            } ${className}`}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((opt) => (
              <option key={opt.value} value={opt.value} disabled={opt.disabled} className="bg-background text-foreground">
                {opt.label}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        </div>
        {error && (
          <span id={`${selectId}-error`} className="text-xs font-medium text-destructive mt-0.5" role="alert">
            {error}
          </span>
        )}
      </div>
    )
  }
)
Select.displayName = 'Select'
