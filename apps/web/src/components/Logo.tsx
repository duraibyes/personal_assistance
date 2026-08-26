import React from 'react'
import Image from 'next/image'

import LogoIcon from '../logo.png'

/** WealthGuard shield mark. Used in the sidebar, auth screens, and 404 page. */
export function Logo({ className = 'h-9 w-9' }: { className?: string }) {
  return (
    <Image
      src={LogoIcon}
      alt="WealthGuard"
      className={`object-contain ${className}`}
      priority
    />
  )
}
