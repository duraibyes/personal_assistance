import React from 'react'
import { Loader2 } from 'lucide-react'

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost'
type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean
  variant?: ButtonVariant
  size?: ButtonSize
  children: React.ReactNode
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-indigo-500 text-white hover:bg-indigo-400 shadow-lg shadow-indigo-500/20',
  secondary:
    'border border-white/20 bg-transparent text-white hover:bg-white/10',
  danger:
    'bg-rose-600 text-white hover:bg-rose-500 shadow-lg shadow-rose-500/20',
  ghost: 'bg-transparent text-gray-300 hover:text-white hover:bg-white/5',
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-3 py-2 text-sm',
  md: 'px-4 py-3 text-sm',
  lg: 'px-5 py-3.5 text-base',
}

export function Button({
  loading = false,
  disabled,
  children,
  className = '',
  variant = 'primary',
  size = 'md',
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={loading || disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100 ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      {...props}
    >
      {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : children}
    </button>
  )
}

/** Convenience wrappers for common actions */
export function SaveButton(props: Omit<ButtonProps, 'variant' | 'children'> & { children?: React.ReactNode }) {
  const { children = 'Save', ...rest } = props
  return (
    <Button variant="primary" type="submit" {...rest}>
      {children}
    </Button>
  )
}

export function CancelButton(props: Omit<ButtonProps, 'variant' | 'children'> & { children?: React.ReactNode }) {
  const { children = 'Cancel', ...rest } = props
  return (
    <Button variant="ghost" type="button" {...rest}>
      {children}
    </Button>
  )
}
