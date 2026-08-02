import { ChevronDown, Plus, X } from 'lucide-react'
import type { StreamProfile } from '../../../shared/streams'
import { cn } from '@renderer/lib/utils'
import { MenuContent, MenuItem, MenuRoot, MenuTrigger } from './ui/dropdown-menu'

const MAX_VISIBLE_TABS = 5

interface ProfileTabsProps {
  profiles: StreamProfile[]
  activeProfileId: string
  onSelect: (id: string) => void
  onRemove: (id: string) => void
  onCreate: () => Promise<void>
}

export function ProfileTabs({
  profiles,
  activeProfileId,
  onSelect,
  onRemove,
  onCreate
}: ProfileTabsProps): React.JSX.Element {
  const visible = profiles.slice(0, MAX_VISIBLE_TABS)
  const overflow = profiles.slice(MAX_VISIBLE_TABS)

  const confirmRemove = (profile: StreamProfile): void => {
    if (window.confirm(`¿Eliminar el perfil "${profile.name}"?`)) {
      onRemove(profile.id)
    }
  }

  return (
    <div className="flex min-w-0 items-center gap-1">
      {visible.map((profile) => {
        const active = profile.id === activeProfileId
        return (
          <div
            key={profile.id}
            className={cn(
              'group flex h-9 max-w-44 cursor-pointer items-center gap-1 rounded-lg border px-3 text-sm font-medium transition-colors',
              active
                ? 'border-blurple bg-blurple/15 text-white'
                : 'border-transparent bg-surface/40 text-white/70 hover:bg-surface hover:text-white'
            )}
            onClick={() => onSelect(profile.id)}
            role="tab"
            aria-selected={active}
            tabIndex={0}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                onSelect(profile.id)
              }
            }}
          >
            <span className="truncate">{profile.name}</span>
            <span
              role="button"
              aria-label={`Eliminar perfil ${profile.name}`}
              title={`Eliminar perfil ${profile.name}`}
              tabIndex={-1}
              className={cn(
                'shrink-0 rounded p-0.5 transition-colors',
                active
                  ? 'text-white/60 hover:bg-white/10 hover:text-white'
                  : 'text-white/0 hover:bg-white/10 hover:text-white group-hover:text-white/50'
              )}
              onClick={(event) => {
                event.stopPropagation()
                confirmRemove(profile)
              }}
            >
              <X size={12} aria-hidden="true" />
            </span>
          </div>
        )
      })}

      {overflow.length > 0 && (
        <MenuRoot>
          <MenuTrigger
            aria-label="Más perfiles"
            title="Más perfiles"
            className="size-9 shrink-0 rounded-lg p-0"
          >
            <ChevronDown size={18} aria-hidden="true" />
          </MenuTrigger>
          <MenuContent>
            {overflow.map((profile) => {
              const active = profile.id === activeProfileId
              return (
                <MenuItem key={profile.id} onClick={() => onSelect(profile.id)}>
                  <span className={cn('truncate', active ? 'text-blurple' : 'text-white/80')}>
                    {profile.name}
                  </span>
                  {active && <span className="ml-auto text-blurple">✓</span>}
                </MenuItem>
              )
            })}
          </MenuContent>
        </MenuRoot>
      )}

      <button
        onClick={() => void onCreate()}
        aria-label="Crear perfil"
        title="Crear perfil"
        className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-surface/5 text-white/60 transition-colors hover:bg-surface hover:text-white"
      >
        <Plus size={18} aria-hidden="true" />
      </button>
    </div>
  )
}
