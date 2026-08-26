import { NextResponse } from 'next/server'

/**
 * Legacy OAuth callback stub (Supabase removed).
 * JWT auth uses /login — redirect any hits here to login.
 */
export async function GET(request: Request) {
  const { origin, searchParams } = new URL(request.url)
  const next = searchParams.get('next') ?? '/dashboard'
  return NextResponse.redirect(`${origin}/login?next=${encodeURIComponent(next)}`)
}
