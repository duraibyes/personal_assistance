import Image from 'next/image'
import Link from 'next/link'
import LogoAuth from '@/logo-auth.png'

export default function Home() {
  return (
    <main className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden bg-brand-gradient px-6 text-center">
      <div className="pointer-events-none absolute -top-32 -left-24 h-96 w-96 rounded-full bg-brand-blue/30 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-24 h-96 w-96 rounded-full bg-brand-green/25 blur-3xl" />

      <div className="relative z-10 flex flex-col items-center">
        <div className="rounded-3xl bg-white px-10 py-8 shadow-2xl">
          <Image src={LogoAuth} alt="WealthGuard — Track, Manage, Grow" className="w-48 h-auto" priority />
        </div>
        <p className="mt-6 max-w-md text-base text-gray-200">
          Your finances, guarded and growing. Track loans, expenses, and assets in one secure place.
        </p>
        <Link
          href="/login"
          className="mt-8 inline-flex items-center justify-center rounded-xl bg-white px-6 py-3.5 text-base font-semibold text-brand-navy shadow-xl transition-colors hover:bg-white/90"
        >
          Get Started
        </Link>
      </div>
    </main>
  );
}
