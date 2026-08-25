import { login, signup } from './actions'

export default function LoginPage({ searchParams }: { searchParams: { error: string } }) {
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
          {searchParams?.error && (
            <div className="rounded-xl bg-red-500/20 p-3 text-center text-sm font-medium text-red-200 backdrop-blur-md">
              {searchParams.error}
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-white drop-shadow-sm" htmlFor="email">
              Email Address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              placeholder="you@example.com"
              className="rounded-xl border border-white/20 bg-black/20 px-4 py-3 text-white placeholder-gray-400 outline-none transition-all focus:border-white/50 focus:bg-black/40 focus:ring-2 focus:ring-white/20"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-white drop-shadow-sm" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              placeholder="••••••••"
              className="rounded-xl border border-white/20 bg-black/20 px-4 py-3 text-white placeholder-gray-400 outline-none transition-all focus:border-white/50 focus:bg-black/40 focus:ring-2 focus:ring-white/20"
            />
          </div>

          <div className="mt-4 flex flex-col gap-3">
            <button
              formAction={login}
              className="group relative flex w-full items-center justify-center overflow-hidden rounded-xl bg-white px-4 py-3 font-semibold text-black transition-transform active:scale-95"
            >
              <div className="absolute inset-0 flex h-full w-full justify-center [transform:skew(-12deg)_translateX(-100%)] group-hover:duration-1000 group-hover:[transform:skew(-12deg)_translateX(100%)]">
                <div className="relative h-full w-8 bg-white/20" />
              </div>
              Sign In
            </button>
            <button
              formAction={signup}
              className="rounded-xl border border-white/30 bg-transparent px-4 py-3 font-semibold text-white transition-all hover:bg-white/10 active:scale-95"
            >
              Create Account
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
