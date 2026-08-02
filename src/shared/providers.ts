export type ProviderId = 'twitch'

export interface ProviderColors {
  accent: string
  onAccent: string
  cta: string
  onCta: string
}

export interface ProviderDef {
  id: ProviderId
  name: string
  tagline: string
  partition: string
  homeUrl: string
  loginUrl: string
  colors: ProviderColors
}

export interface ProviderSession {
  providerId: ProviderId
  loggedIn: boolean
  username?: string
  avatarUrl?: string
}

export const PROVIDERS: ProviderDef[] = [
  {
    id: 'twitch',
    name: 'Twitch',
    tagline: 'Sesión para la instancia de Twitch',
    partition: 'persist:twitch',
    homeUrl: 'https://www.twitch.tv',
    loginUrl: 'https://www.twitch.tv/login',
    colors: {
      accent: '#9146ff',
      onAccent: '#ffffff',
      cta: '#ffffff',
      onCta: '#0a0d3a'
    }
  }
]

export function getProvider(id: ProviderId): ProviderDef | undefined {
  return PROVIDERS.find((provider) => provider.id === id)
}
