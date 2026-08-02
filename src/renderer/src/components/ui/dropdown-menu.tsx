import { Menu as MenuPrimitive } from '@base-ui/react/menu'

import { cn } from '@renderer/lib/utils'

function MenuRoot(props: MenuPrimitive.Root.Props): React.JSX.Element {
  return <MenuPrimitive.Root data-slot="dropdown-menu" {...props} />
}

function MenuTrigger({
  className,
  children,
  ...props
}: MenuPrimitive.Trigger.Props): React.JSX.Element {
  return (
    <MenuPrimitive.Trigger
      data-slot="dropdown-menu-trigger"
      className={cn(
        'inline-flex items-center justify-center gap-1 rounded-lg bg-surface/40 text-white/70 transition-colors hover:bg-surface hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 active:scale-[0.97] data-[popup-open]:bg-surface data-[popup-open]:text-white',
        className
      )}
      {...props}
    >
      {children}
    </MenuPrimitive.Trigger>
  )
}

function MenuContent({
  className,
  children,
  ...props
}: MenuPrimitive.Popup.Props): React.JSX.Element {
  return (
    <MenuPrimitive.Portal data-slot="dropdown-menu-portal">
      <MenuPrimitive.Positioner data-slot="dropdown-menu-positioner" className="z-50">
        <MenuPrimitive.Popup
          data-slot="dropdown-menu-popup"
          className={cn(
            'min-w-[var(--anchor-width)] origin-[var(--transform-origin)] overflow-hidden rounded-xl border border-white/10 bg-onyx p-1 text-sm text-white shadow-xl transition-[transform,scale,opacity] duration-150 ease-out data-starting-style:scale-95 data-starting-style:opacity-0 data-ending-style:scale-95 data-ending-style:opacity-0 data-side="bottom":data-align="start":origin-top-left data-side="bottom":data-align="center":origin-top data-side="bottom":data-align="end":origin-top-right',
            'max-h-[50vh] overflow-y-auto',
            className
          )}
          {...props}
        >
          {children}
        </MenuPrimitive.Popup>
      </MenuPrimitive.Positioner>
    </MenuPrimitive.Portal>
  )
}

function MenuItem({ className, children, ...props }: MenuPrimitive.Item.Props): React.JSX.Element {
  return (
    <MenuPrimitive.Item
      data-slot="dropdown-menu-item"
      className={cn(
        'flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 outline-none transition-colors select-none data-highlighted:bg-white/10 data-selected:bg-white/5 data-disabled:cursor-not-allowed data-disabled:opacity-50',
        className
      )}
      {...props}
    >
      {children}
    </MenuPrimitive.Item>
  )
}

export { MenuRoot, MenuTrigger, MenuContent, MenuItem }
