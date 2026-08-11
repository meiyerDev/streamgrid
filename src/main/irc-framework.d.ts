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

  export interface ReconnectingEvent {
    attempt: number
    max_retries: number
    wait: number
  }

  export interface NoticeEvent {
    from_server: boolean
    nick: string | null
    target: string
    message: string
    tags?: Record<string, string>
  }

  export interface IrcErrorEvent {
    error: string
    reason?: string
    nick?: string
    channel?: string
    server?: string
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
    say(target: string, message: string): void
    raw(line: string): void
    on(event: 'registered', listener: (event: { nick: string }) => void): this
    on(event: 'privmsg', listener: (event: PrivmsgEvent) => void): this
    on(event: 'close', listener: (hadError: boolean) => void): this
    on(event: 'connecting', listener: () => void): this
    on(event: 'socket connected', listener: () => void): this
    on(event: 'socket error', listener: (error: Error) => void): this
    on(event: 'socket close', listener: (error?: Error) => void): this
    on(event: 'reconnecting', listener: (event: ReconnectingEvent) => void): this
    on(event: 'ping timeout', listener: () => void): this
    on(event: 'debug', listener: (out: string) => void): this
    on(event: 'notice', listener: (event: NoticeEvent) => void): this
    on(event: 'irc error', listener: (event: IrcErrorEvent) => void): this
    on(event: IRCClientEvent, listener: (...args: never[]) => void): this
    off(event: string, listener: (...args: never[]) => void): this
  }
}
