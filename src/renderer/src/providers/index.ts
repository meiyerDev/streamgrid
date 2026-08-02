import type { ComponentType, SVGProps } from 'react'
import type { ProviderId } from '../../../shared/providers'
import { TwitchIcon } from './icons'

export type ProviderIcon = ComponentType<SVGProps<SVGSVGElement>>

export const PROVIDER_ICONS: Record<ProviderId, ProviderIcon> = {
  twitch: TwitchIcon
}
