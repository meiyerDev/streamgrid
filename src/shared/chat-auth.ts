export interface TwitchChatStatus {
  authenticated: boolean
  username?: string
  error?: string
}

export interface AuthorizeTwitchResult {
  success: boolean
  cookiesSaved: boolean
  username?: string
  error?: string
}
