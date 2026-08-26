import React, { forwardRef, useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
  hint?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, className = '', id, type, ...props }, ref) => {
    const inputId = id || props.name || label.replace(/\s+/g, '-').toLowerCase()
    const isPassword = type === 'password'
    const [showPassword, setShowPassword] = useState(false)

    return (
      <div className="flex flex-col gap-1.5 w-full">
        <label htmlFor={inputId} className="text-sm font-medium text-foreground">
          {label}
        </label>
        <div className="relative">
          <input
            id={inputId}
            ref={ref}
            type={isPassword ? (showPassword ? 'text' : 'password') : type}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? `${inputId}-error` : undefined}
            className={`w-full rounded-xl border bg-background px-4 py-3 text-foreground placeholder-muted-foreground outline-none transition-all focus:bg-accent/10 focus:ring-2 ${
              isPassword ? 'pr-11' : ''
            } ${
              error
                ? 'border-destructive/50 focus:border-destructive/50 focus:ring-destructive/20'
                : 'border-border focus:border-primary/50 focus:ring-primary/20'
            } ${className}`}
            {...props}
          />
          {isPassword && (
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          )}
        </div>
        {error ? (
          <span id={`${inputId}-error`} className="text-xs font-medium text-destructive mt-0.5" role="alert">
            {error}
          </span>
        ) : hint ? (
          <span className="text-xs text-muted-foreground">{hint}</span>
        ) : null}
      </div>
    )
  }
)
Input.displayName = 'Input'
