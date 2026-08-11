import { useMemo, type ReactNode } from 'react'
import { Toast, type ToastManagerAddOptions } from '@base-ui/react/toast'

import { cn } from '@renderer/lib/utils'
import { ToastContext, type ToastOptions } from './toast-context'

interface ToastData {
  render?: ReactNode
}

function toToastOptions(options: ToastOptions): ToastManagerAddOptions<ToastData> {
  return {
    title: options.title,
    description: options.description,
    actionProps: options.action
      ? { onClick: options.action.onClick, children: options.action.label }
      : undefined,
    timeout: options.timeout,
    type: options.type,
    priority: options.action ? 'high' : 'low',
    data: { render: options.render }
  }
}

export function ToastProvider({ children }: { children: ReactNode }): React.JSX.Element {
  return (
    <Toast.Provider>
      <ToastRegistry>{children}</ToastRegistry>
    </Toast.Provider>
  )
}

function ToastRegistry({ children }: { children: ReactNode }): React.JSX.Element {
  const manager = Toast.useToastManager<ToastData>()
  const value = useMemo(
    () => ({
      toast: (options: ToastOptions) => manager.add(toToastOptions(options)),
      update: (id: string, options: ToastOptions) => manager.update(id, toToastOptions(options)),
      dismiss: (id?: string) => manager.close(id)
    }),
    [manager]
  )

  return (
    <ToastContext.Provider value={value}>
      {children}
      <Toast.Portal>
        <Toast.Viewport className="pointer-events-none fixed right-6 top-6 z-[60] flex w-80 max-w-[calc(100vw-3rem)] flex-col gap-2 outline-none">
          {manager.toasts.map((toast) => (
            <Toast.Root
              key={toast.id}
              toast={toast}
              className="group/toast pointer-events-auto transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] outline-none translate-x-(--toast-swipe-movement-x) data-swiping:duration-0 data-starting-style:translate-x-4 data-starting-style:opacity-0 data-ending-style:translate-x-4 data-ending-style:opacity-0"
            >
              <Toast.Content className="overflow-hidden rounded-xl border border-white/10 bg-onyx shadow-2xl shadow-black/50">
                <div
                  className="h-1 w-full bg-gradient-to-r from-blurple to-magenta opacity-0 transition-opacity duration-300 group-data-[type=progress]/toast:opacity-100"
                  aria-hidden="true"
                />
                <div className="flex items-start gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    {toast.data?.render ? (
                      <>
                        {toast.title && (
                          <Toast.Title className="sr-only">{toast.title}</Toast.Title>
                        )}
                        {toast.data.render}
                      </>
                    ) : (
                      <>
                        {toast.title && (
                          <Toast.Title className="text-sm font-bold text-white">
                            {toast.title}
                          </Toast.Title>
                        )}
                        {toast.description && (
                          <Toast.Description className="mt-1 text-xs text-white/60">
                            {toast.description}
                          </Toast.Description>
                        )}
                      </>
                    )}
                  </div>
                  {toast.actionProps && (
                    <Toast.Action
                      {...toast.actionProps}
                      className="shrink-0 rounded-lg bg-blurple px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-blurple/90"
                    />
                  )}
                  <Toast.Close
                    aria-label="Cerrar"
                    className={cn(
                      'shrink-0 rounded-md p-1 text-white/40 transition-colors hover:bg-white/10 hover:text-white',
                      toast.actionProps && 'hidden'
                    )}
                  >
                    <svg viewBox="0 0 16 16" className="size-3.5" fill="none" aria-hidden="true">
                      <path
                        d="M4 4l8 8M12 4l-8 8"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                      />
                    </svg>
                  </Toast.Close>
                </div>
              </Toast.Content>
            </Toast.Root>
          ))}
        </Toast.Viewport>
      </Toast.Portal>
    </ToastContext.Provider>
  )
}
