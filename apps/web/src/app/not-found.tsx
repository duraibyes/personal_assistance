import Link from 'next/link'
import { Button } from '@/components/ui/Button'

export default function NotFound() {
  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-zinc-950 px-6 text-center">
      <p className="text-sm font-medium uppercase tracking-[0.2em] text-indigo-400">404</p>
      <h1 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
        Page not found
      </h1>
      <p className="mt-3 max-w-md text-sm text-gray-400">
        The page you are looking for does not exist or may have been moved.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link href="/dashboard">
          <Button variant="primary">Back to dashboard</Button>
        </Link>
        <Link href="/">
          <Button variant="secondary">Go home</Button>
        </Link>
      </div>
    </div>
  )
}
