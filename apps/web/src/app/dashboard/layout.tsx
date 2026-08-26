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
    <div className="flex flex-col md:flex-row h-screen w-full bg-background text-foreground overflow-hidden">
      <SidebarNav userEmail={user.email} />
      <main className="flex-1 overflow-y-auto bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-background via-background to-secondary/20 relative">
        <div className="p-4 md:p-8 max-w-7xl mx-auto min-h-screen">{children}</div>
      </main>
    </div>
  )
}
