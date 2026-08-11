import { useContext } from 'react'
import { ToastContext } from '@renderer/components/ui/toast-context'

export function useToast(): NonNullable<React.ContextType<typeof ToastContext>> {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within <ToastProvider>')
  }
  return context
}
