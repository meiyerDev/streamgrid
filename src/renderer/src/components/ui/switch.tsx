import { Switch as SwitchPrimitive } from '@base-ui/react/switch'

import { cn } from '@renderer/lib/utils'

function Switch({ className, ...props }: SwitchPrimitive.Root.Props): React.JSX.Element {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        'peer inline-flex h-5 w-9 shrink-0 items-center rounded-full border-2 border-transparent shadow-xs transition-colors outline-none focus-visible:ring-2 focus-visible:ring-blurple/50 data-[checked]:bg-blurple data-[unchecked]:bg-surface data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50',
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          'pointer-events-none block size-4 rounded-full bg-white shadow-sm transition-transform data-[checked]:translate-x-4 data-[unchecked]:translate-x-0'
        )}
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
