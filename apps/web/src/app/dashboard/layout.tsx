import React from 'react'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { SidebarNav } from '@/components/ui/SidebarNav'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const token = cookies().get('auth_token')?.value

  if (!token) {
    redirect('/login')
  }

  const payloadBase64 = token.split('.')[1]
  const user = payloadBase64
    ? JSON.parse(Buffer.from(payloadBase64, 'base64').toString())
    : { email: 'User' }

  return (
    <div className="flex h-screen w-full bg-zinc-950 text-white overflow-hidden">
      <SidebarNav userEmail={user.email} />
      <main className="flex-1 overflow-y-auto bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-900 via-zinc-950 to-black relative">
        <div className="p-8 max-w-7xl mx-auto min-h-screen">{children}</div>
      </main>
    </div>
  )
}
