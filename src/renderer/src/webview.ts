export interface WebviewEventMap {
  'did-navigate': { url: string }
  'did-navigate-in-page': { url: string }
}

export interface WebviewElement extends HTMLWebViewElement {
  addEventListener<K extends keyof WebviewEventMap>(
    type: K,
    listener: (event: WebviewEventMap[K]) => void
  ): void
  removeEventListener<K extends keyof WebviewEventMap>(
    type: K,
    listener: (event: WebviewEventMap[K]) => void
  ): void
}
