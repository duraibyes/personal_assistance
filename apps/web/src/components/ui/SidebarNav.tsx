'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Banknote, Wallet, FileText, Menu, X, PieChart, TrendingUp, Repeat, Tags } from 'lucide-react'
import { SignOutButton } from './SignOutButton'
import { ThemeToggle } from './ThemeToggle'
import { Logo } from '@/components/Logo'

export function SidebarNav({ userEmail }: { userEmail: string }) {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)

  const links = [
    { href: '/dashboard', label: 'Overview', icon: LayoutDashboard, color: 'text-indigo-400' },
    { href: '/dashboard/finance', label: 'Finance', icon: PieChart, color: 'text-sky-400' },
    { href: '/dashboard/loans', label: 'Loans', icon: Banknote, color: 'text-emerald-400' },
    { href: '/dashboard/expenses', label: 'Expenses', icon: Wallet, color: 'text-rose-400' },
    { href: '/dashboard/income', label: 'Income', icon: TrendingUp, color: 'text-teal-400' },
    { href: '/dashboard/recurring', label: 'Recurring', icon: Repeat, color: 'text-violet-400' },
    { href: '/dashboard/categories', label: 'Categories', icon: Tags, color: 'text-amber-400' },
    { href: '/dashboard/documents', label: 'Documents', icon: FileText, color: 'text-amber-400' },
  ]

  const SidebarContent = (
    <>
      <div className="flex h-16 items-center px-6 border-b border-border justify-between shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <Logo className="h-8 w-8 shrink-0" />
          <div className="flex flex-col leading-none min-w-0">
            <span className="text-base font-bold tracking-tight text-foreground truncate">WealthGuard</span>
            <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Wealth Management</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden md:block">
            <ThemeToggle />
          </div>
          <button className="md:hidden text-muted-foreground hover:text-foreground" onClick={() => setIsOpen(false)}>
            <X className="h-6 w-6" />
          </button>
        </div>
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
                isActive ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
              }`}
            >
              <Icon className={`h-5 w-5 shrink-0 ${isActive ? 'text-primary-foreground' : link.color}`} />
              {link.label}
            </Link>
          )
        })}
      </nav>

      <div className="p-4 border-t border-border shrink-0">
        <div className="flex items-center gap-3 mb-4 px-2">
          <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-bold uppercase shrink-0">
            {userEmail.charAt(0)}
          </div>
          <div className="text-xs text-muted-foreground truncate w-full">{userEmail}</div>
        </div>
        <SignOutButton />
      </div>
    </>
  )

  return (
    <>
      {/* Mobile Header */}
      <div className="h-16 md:hidden flex items-center justify-between border-b border-border px-4 bg-background shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => setIsOpen(true)} className="text-foreground p-1">
            <Menu className="h-6 w-6" />
          </button>
          <Logo className="h-7 w-7" />
          <h1 className="text-lg font-bold text-foreground">WealthGuard</h1>
        </div>
        <ThemeToggle />
      </div>

      {/* Desktop Sidebar */}
      <aside className="w-64 flex-col border-r border-border bg-background hidden md:flex h-full shrink-0">
        {SidebarContent}
      </aside>

      {/* Mobile Drawer Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-background/80 z-40 md:hidden backdrop-blur-sm" 
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Mobile Drawer */}
      <aside className={`fixed inset-y-0 left-0 w-64 bg-background border-r border-border z-50 transform transition-transform duration-300 md:hidden flex flex-col ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        {SidebarContent}
      </aside>
    </>
  )
}
