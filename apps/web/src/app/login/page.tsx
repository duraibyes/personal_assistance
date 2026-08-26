'use client'

import React, { useState, useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { login, signup } from './actions'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
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
    <div className="flex h-screen w-full items-center justify-center bg-[url('https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop')] bg-cover bg-center">
      {/* Overlay to darken background */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      
      <div className="relative z-10 w-full max-w-md overflow-hidden rounded-3xl border border-white/20 bg-white/10 p-8 shadow-2xl backdrop-blur-xl">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-white drop-shadow-md">
            Welcome Back
          </h1>
          <p className="mt-2 text-sm text-gray-200">
            Sign in to manage your assets and expenses
          </p>
        </div>

        <form className="flex flex-col gap-5">
          {serverError && (
            <div className="rounded-xl bg-red-500/20 p-3 text-center text-sm font-medium text-red-200 backdrop-blur-md">
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
