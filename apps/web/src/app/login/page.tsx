'use client'

import React, { useState, useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { login, signup } from './actions'
import Image from 'next/image'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import LogoAuth from '@/logo-auth.png'
import { useRouter } from 'next/navigation'

const authSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters')
})

type AuthFormValues = z.infer<typeof authSchema>

export default function LoginPage() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [serverError, setServerError] = useState<string | null>(null)
  
  const { register, handleSubmit, formState: { errors, isValid } } = useForm<AuthFormValues>({
    resolver: zodResolver(authSchema),
    mode: 'onChange'
  })

  const onSubmit = async (data: AuthFormValues, action: 'login' | 'signup') => {
    setServerError(null)
    
    // Create FormData for the server action
    const formData = new FormData()
    formData.append('email', data.email)
    formData.append('password', data.password)

    startTransition(async () => {
      const result = action === 'login' ? await login(formData) : await signup(formData)
      
      if (result.error) {
        setServerError(result.error)
      } else if (result.success) {
        router.push('/dashboard')
      }
    })
  }

  return (
    <div className="relative flex h-screen w-full items-center justify-center overflow-hidden bg-brand-gradient p-4">
      {/* Decorative glow accents */}
      <div className="pointer-events-none absolute -top-32 -left-24 h-96 w-96 rounded-full bg-brand-blue/30 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-24 h-96 w-96 rounded-full bg-brand-green/25 blur-3xl" />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            'linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      <div className="relative z-10 w-full max-w-md overflow-hidden rounded-3xl border border-border bg-card p-8 shadow-2xl">
        <div className="mb-8 flex flex-col items-center text-center">
          <Image src={LogoAuth} alt="WealthGuard — Track, Manage, Grow" className="w-40 h-auto mb-3" priority />
          <p className="mt-2 text-sm text-muted-foreground">
            Sign in to manage your assets, loans, and expenses
          </p>
        </div>

        <form className="flex flex-col gap-5">
          {serverError && (
            <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-center text-sm font-medium text-destructive">
              {serverError}
            </div>
          )}

          <Input
            label="Email Address"
            type="email"
            placeholder="you@example.com"
            error={errors.email?.message}
            {...register('email')}
          />

          <Input
            label="Password"
            type="password"
            placeholder="••••••••"
            error={errors.password?.message}
            {...register('password')}
          />

          <div className="mt-4 flex flex-col gap-3">
            <Button
              type="button"
              disabled={!isValid || isPending}
              loading={isPending}
              onClick={handleSubmit((data) => onSubmit(data, 'login'))}
            >
              Sign In
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={!isValid || isPending}
              onClick={handleSubmit((data) => onSubmit(data, 'signup'))}
            >
              Create Account
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
