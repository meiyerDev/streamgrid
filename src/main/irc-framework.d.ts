declare module 'irc-framework' {
  export interface IRCClientOptions {
    host: string
    port: number
    tls?: boolean
    nick?: string
    username?: string
    password?: string
    realname?: string
    auto_reconnect?: boolean
    auto_rejoin?: boolean
  }

  export interface PrivmsgEvent {
    target: string
    nick: string
    message: string
    tags?: Record<string, string>
  }

  export type IRCClientEvent =
    | 'registered'
    | 'privmsg'
    | 'close'
    | 'nick'
    | 'join'
    | 'part'
    | 'quit'
    | 'kick'
    | 'wallops'
    | 'message'

  export class Client {
    constructor(options: IRCClientOptions)
    connect(options?: IRCClientOptions): void
    quit(message?: string): void
    join(channel: string, key?: string): void
    part(channel: string, message?: string): void
    raw(line: string): void
    on(event: 'registered', listener: (event: { nick: string }) => void): this
    on(event: 'privmsg', listener: (event: PrivmsgEvent) => void): this
    on(event: 'close', listener: () => void): this
    on(event: IRCClientEvent, listener: (...args: never[]) => void): this
  }
}
