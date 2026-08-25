import React from 'react'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="flex h-screen w-full bg-zinc-950 text-white">
      {/* Sidebar */}
      <aside className="w-64 flex-col border-r border-white/10 bg-black/40 backdrop-blur-md hidden md:flex">
        <div className="flex h-16 items-center px-6 border-b border-white/10">
          <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
            WealthGuard
          </h1>
        </div>
        
        <nav className="flex-1 space-y-1 p-4">
          <Link href="/dashboard" className="block px-4 py-3 rounded-xl hover:bg-white/5 transition-colors text-sm font-medium text-gray-300 hover:text-white">
            Dashboard Overview
          </Link>
          <Link href="/dashboard/loans" className="block px-4 py-3 rounded-xl hover:bg-white/5 transition-colors text-sm font-medium text-gray-300 hover:text-white">
            Loans & EMI
          </Link>
          <Link href="/dashboard/expenses" className="block px-4 py-3 rounded-xl hover:bg-white/5 transition-colors text-sm font-medium text-gray-300 hover:text-white">
            Expenses
          </Link>
          <Link href="/dashboard/vehicles" className="block px-4 py-3 rounded-xl hover:bg-white/5 transition-colors text-sm font-medium text-gray-300 hover:text-white">
            Vehicles
          </Link>
          <Link href="/dashboard/documents" className="block px-4 py-3 rounded-xl hover:bg-white/5 transition-colors text-sm font-medium text-gray-300 hover:text-white">
            OCR Processing
          </Link>
        </nav>

        <div className="p-4 border-t border-white/10">
          <div className="flex items-center gap-3 mb-4 px-2">
            <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold uppercase">
              {user.email?.charAt(0) || 'U'}
            </div>
            <div className="text-xs text-gray-400 truncate w-32">{user.email}</div>
          </div>
          <form action="/auth/signout" method="post">
            <button className="w-full rounded-xl bg-white/5 px-4 py-2 text-sm font-medium hover:bg-white/10 transition-colors">
              Sign Out
            </button>
          </form>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-900 via-zinc-950 to-black">
        <div className="h-16 md:hidden flex items-center border-b border-white/10 px-4">
           {/* Mobile Header logic here */}
           <h1 className="text-lg font-bold">WealthGuard</h1>
        </div>
        <div className="p-8 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  )
}
