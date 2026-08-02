import { useState } from 'react'
import { Dialog as DialogPrimitive } from '@base-ui/react/dialog'
import { Save } from 'lucide-react'

interface ProfileSaveDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  profileName: string
  onSave: (name: string) => Promise<void> | void
}

export function ProfileSaveDialog({
  open,
  onOpenChange,
  profileName,
  onSave
}: ProfileSaveDialogProps): React.JSX.Element {
  const [name, setName] = useState(profileName)
  const [saving, setSaving] = useState(false)

  const commitSave = async (): Promise<void> => {
    const value = name.trim()
    if (!value) return
    setSaving(true)
    try {
      await onSave(value)
      onOpenChange(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-xs" />
        <DialogPrimitive.Popup className="fixed left-1/2 top-1/2 z-[60] w-80 max-w-[90vw] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-white/10 bg-onyx p-5 shadow-2xl outline-none">
          <DialogPrimitive.Title className="text-lg font-extrabold tracking-tight text-white">
            Guardar perfil
          </DialogPrimitive.Title>
          <DialogPrimitive.Description className="mt-1 text-sm text-white/60">
            Elige un nombre para guardar este perfil.
          </DialogPrimitive.Description>
          <form
            className="mt-4 flex flex-col gap-4"
            onSubmit={(event) => {
              event.preventDefault()
              void commitSave()
            }}
          >
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold uppercase tracking-wide text-white/50">
                Nombre del perfil
              </span>
              <input
                autoFocus
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Ej. Mis Creadores"
                aria-label="Nombre del perfil"
                className="h-10 rounded-lg border border-white/15 bg-surface px-3 text-sm text-white placeholder:text-white/40 outline-none focus:border-blurple"
              />
            </label>
            <div className="flex justify-end gap-2">
              <DialogPrimitive.Close className="inline-flex items-center justify-center rounded-xl bg-surface px-4 py-2 text-sm font-semibold text-white/70 transition hover:bg-surface hover:text-white">
                Cancelar
              </DialogPrimitive.Close>
              <button
                type="submit"
                disabled={!name.trim() || saving}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blurple px-4 py-2 text-sm font-semibold text-white transition hover:bg-blurple/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Save size={16} aria-hidden="true" />
                Guardar
              </button>
            </div>
          </form>
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
