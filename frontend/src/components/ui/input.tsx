import * as React from 'react'
import { cn } from '@/lib/utils'

const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <input
    className={cn(
      'flex h-10 w-full rounded-lg bg-transparent px-3 py-2 text-sm',
      // no visible border by default; subtle border on focus
      'border border-transparent focus:border-white/20',
      // remove default indigo focus ring, keep outline control minimal
      'placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-0',
      // caret and selection for better contrast on dark backgrounds
      'caret-white selection:bg-white/10 selection:text-white',
      'disabled:cursor-not-allowed disabled:opacity-50',
      'transition-colors',
      className
    )}
    ref={ref}
    {...props}
  />
))
Input.displayName = 'Input'

export { Input }
