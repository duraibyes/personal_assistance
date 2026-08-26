import { cookies } from 'next/headers'
import { type NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const cookieStore = cookies()
  cookieStore.delete('auth_token')

  // Also clear via response for immediate client effect
  const response = NextResponse.json({ success: true }, { status: 200 })
  response.cookies.set('auth_token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  })

  // Support form posts that expect a redirect
  const accept = req.headers.get('accept') || ''
  if (accept.includes('text/html')) {
    const redirect = NextResponse.redirect(new URL('/login', req.url), { status: 302 })
    redirect.cookies.set('auth_token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
    })
    return redirect
  }

  return response
}
