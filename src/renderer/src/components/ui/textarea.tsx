import type { ComponentProps } from 'react'

import { cn } from '@renderer/lib/utils'

function Textarea({ className, ...props }: ComponentProps<'textarea'>): React.JSX.Element {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        'w-full rounded-xl bg-surface px-4 py-3 text-sm text-white placeholder:text-white/40 focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-60',
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
