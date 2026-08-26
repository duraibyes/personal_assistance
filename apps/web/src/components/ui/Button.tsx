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
    'bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20',
  secondary:
    'border border-border bg-secondary text-secondary-foreground hover:bg-secondary/70',
  danger:
    'bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-lg shadow-destructive/20',
  ghost: 'bg-transparent text-muted-foreground hover:text-foreground hover:bg-accent',
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
    <Button variant="secondary" type="button" {...rest}>
      {children}
    </Button>
  )
}

export function UploadButton(props: Omit<ButtonProps, 'variant' | 'children'> & { children?: React.ReactNode }) {
  const { children = 'Upload', ...rest } = props
  return (
    <Button variant="primary" type="button" {...rest}>
      {children}
    </Button>
  )
}
