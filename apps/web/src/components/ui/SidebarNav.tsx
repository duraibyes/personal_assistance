'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Banknote, Wallet, FileText, Menu, X } from 'lucide-react'
import { SignOutButton } from './SignOutButton'

export function SidebarNav({ userEmail }: { userEmail: string }) {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)

  const links = [
    { href: '/dashboard', label: 'Overview', icon: LayoutDashboard, color: 'text-indigo-400' },
    { href: '/dashboard/loans', label: 'Loans', icon: Banknote, color: 'text-emerald-400' },
    { href: '/dashboard/expenses', label: 'Expenses', icon: Wallet, color: 'text-rose-400' },
    { href: '/dashboard/documents', label: 'Documents', icon: FileText, color: 'text-amber-400' },
  ]

  const SidebarContent = (
    <>
      <div className="flex h-16 items-center px-6 border-b border-white/10 justify-between shrink-0">
        <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
          WealthGuard
        </h1>
        <button className="md:hidden text-gray-400" onClick={() => setIsOpen(false)}>
          <X className="h-6 w-6" />
        </button>
      </div>

      <nav className="flex-1 space-y-1 px-4 py-4 overflow-y-auto">
        {links.map(link => {
          const isActive = pathname === link.href || (link.href !== '/dashboard' && pathname.startsWith(link.href))
          const Icon = link.icon
          return (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setIsOpen(false)}
              className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors ${
                isActive ? 'bg-white/10 text-white' : 'text-gray-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <Icon className={`h-5 w-5 shrink-0 ${link.color}`} />
              {link.label}
            </Link>
          )
        })}
      </nav>

      <div className="p-4 border-t border-white/10 shrink-0">
        <div className="flex items-center gap-3 mb-4 px-2">
          <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold uppercase shrink-0">
            {userEmail.charAt(0)}
          </div>
          <div className="text-xs text-gray-400 truncate w-full">{userEmail}</div>
        </div>
        <SignOutButton />
      </div>
    </>
  )

  return (
    <>
      {/* Mobile Header */}
      <div className="h-16 md:hidden flex items-center justify-between border-b border-white/10 px-4 bg-zinc-950 shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => setIsOpen(true)} className="text-white p-1">
            <Menu className="h-6 w-6" />
          </button>
          <h1 className="text-lg font-bold">WealthGuard</h1>
        </div>
      </div>

      {/* Desktop Sidebar */}
      <aside className="w-64 flex-col border-r border-white/10 bg-black/40 backdrop-blur-md hidden md:flex h-full shrink-0">
        {SidebarContent}
      </aside>

      {/* Mobile Drawer Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/80 z-40 md:hidden backdrop-blur-sm" 
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Mobile Drawer */}
      <aside className={`fixed inset-y-0 left-0 w-64 bg-zinc-950 border-r border-white/10 z-50 transform transition-transform duration-300 md:hidden flex flex-col ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        {SidebarContent}
      </aside>
    </>
  )
}
