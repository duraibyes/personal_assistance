'use client'

import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { Button } from '@/components/ui/Button'

export function SignOutButton() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const handleSignOut = () => {
    startTransition(async () => {
      await fetch('/auth/signout', { method: 'POST' })
      router.replace('/login')
      router.refresh()
    })
  }

  return (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      className="w-full"
      loading={isPending}
      onClick={handleSignOut}
    >
      Sign Out
    </Button>
  )
}
