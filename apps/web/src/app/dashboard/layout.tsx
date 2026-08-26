import React from 'react'
import Link from 'next/link'
import { LayoutDashboard, Banknote, Wallet, FileText } from 'lucide-react'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { SignOutButton } from '@/components/ui/SignOutButton'

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
    <div className="flex h-screen w-full bg-zinc-950 text-white">
      <aside className="w-64 flex-col border-r border-white/10 bg-black/40 backdrop-blur-md hidden md:flex">
        <div className="flex h-16 items-center px-6 border-b border-white/10">
          <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
            WealthGuard
          </h1>
        </div>

        <nav className="flex-1 space-y-1 px-4 py-4">
          <Link
            href="/dashboard"
            className="flex items-center gap-3 rounded-xl bg-white/10 px-4 py-3 text-sm font-medium text-white transition-colors"
          >
            <LayoutDashboard className="h-5 w-5 text-indigo-400" />
            Overview
          </Link>
          <Link
            href="/dashboard/loans"
            className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-gray-400 hover:bg-white/5 hover:text-white transition-colors"
          >
            <Banknote className="h-5 w-5 text-emerald-400" />
            Loans
          </Link>
          <Link
            href="/dashboard/expenses"
            className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-gray-400 hover:bg-white/5 hover:text-white transition-colors"
          >
            <Wallet className="h-5 w-5 text-rose-400" />
            Expenses
          </Link>
          <Link
            href="/dashboard/documents"
            className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-gray-400 hover:bg-white/5 hover:text-white transition-colors"
          >
            <FileText className="h-5 w-5 text-amber-400" />
            Documents
          </Link>
        </nav>

        <div className="p-4 border-t border-white/10">
          <div className="flex items-center gap-3 mb-4 px-2">
            <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold uppercase">
              {user.email?.charAt(0) || 'U'}
            </div>
            <div className="text-xs text-gray-400 truncate w-32">{user.email}</div>
          </div>
          <SignOutButton />
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-900 via-zinc-950 to-black">
        <div className="h-16 md:hidden flex items-center justify-between border-b border-white/10 px-4">
          <h1 className="text-lg font-bold">WealthGuard</h1>
          <SignOutButton />
        </div>
        <div className="p-8 max-w-7xl mx-auto">{children}</div>
      </main>
    </div>
  )
}
