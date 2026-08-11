import { createContext, type ReactNode } from 'react'

interface ToastAction {
  label: string
  onClick: () => void
}

export interface ToastOptions {
  title?: ReactNode
  description?: ReactNode
  action?: ToastAction
  render?: ReactNode
  timeout?: number
  type?: string
}

export interface ToastContextValue {
  toast: (options: ToastOptions) => string
  update: (id: string, options: ToastOptions) => void
  dismiss: (id?: string) => void
}

export const ToastContext = createContext<ToastContextValue | null>(null)
