import { Select as SelectPrimitive } from '@base-ui/react/select'
import { Check, ChevronsUpDown } from 'lucide-react'

import { cn } from '@renderer/lib/utils'

function Select<Value, Multiple extends boolean | undefined = false>(
  props: SelectPrimitive.Root.Props<Value, Multiple>
): React.JSX.Element {
  return <SelectPrimitive.Root data-slot="select" {...props} />
}

function SelectTrigger({
  className,
  children,
  ...props
}: SelectPrimitive.Trigger.Props): React.JSX.Element {
  return (
    <SelectPrimitive.Trigger
      data-slot="select-trigger"
      className={cn(
        'flex h-11 w-full items-center justify-between gap-2 rounded-xl bg-surface px-4 text-sm text-white transition-colors hover:bg-surface/80 focus-visible:outline-2 focus-visible:outline-offset-2 active:scale-[0.99] data-[popup-open]:bg-surface/80 data-[disabled]:cursor-not-allowed data-[disabled]:opacity-60',
        className
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon data-slot="select-icon" className="shrink-0 text-white/60">
        <ChevronsUpDown size={16} aria-hidden="true" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  )
}

function SelectValue(props: SelectPrimitive.Value.Props): React.JSX.Element {
  return <SelectPrimitive.Value data-slot="select-value" {...props} />
}

function SelectContent({
  className,
  side,
  children,
  ...props
}: SelectPrimitive.Popup.Props & {
  side?: SelectPrimitive.Positioner.Props['side']
}): React.JSX.Element {
  return (
    <SelectPrimitive.Portal data-slot="select-portal">
      <SelectPrimitive.Positioner data-slot="select-positioner" className="z-50" side={side}>
        <SelectPrimitive.Popup
          data-slot="select-popup"
          className={cn(
            'min-w-[var(--anchor-width)] origin-[var(--transform-origin)] overflow-hidden rounded-xl border border-white/10 bg-onyx p-1 text-sm text-white shadow-xl transition-[transform,scale,opacity] duration-150 ease-out data-starting-style:scale-95 data-starting-style:opacity-0 data-ending-style:scale-95 data-ending-style:opacity-0 data-side="bottom":data-align="start":origin-top-left data-side="bottom":data-align="center":origin-top data-side="bottom":data-align="end":origin-top-right',
            className
          )}
          {...props}
        >
          {children}
        </SelectPrimitive.Popup>
      </SelectPrimitive.Positioner>
    </SelectPrimitive.Portal>
  )
}

function SelectItem({
  className,
  children,
  ...props
}: SelectPrimitive.Item.Props): React.JSX.Element {
  return (
    <SelectPrimitive.Item
      data-slot="select-item"
      className={cn(
        'flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 outline-none transition-colors select-none data-highlighted:bg-white/10 data-selected:bg-white/5 data-disabled:cursor-not-allowed data-disabled:opacity-50',
        className
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.ItemIndicator
        data-slot="select-item-indicator"
        className="ml-auto text-white"
      >
        <Check size={16} aria-hidden="true" />
      </SelectPrimitive.ItemIndicator>
    </SelectPrimitive.Item>
  )
}

export { Select, SelectTrigger, SelectValue, SelectContent, SelectItem }
