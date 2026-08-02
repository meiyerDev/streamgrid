import type { SVGProps } from 'react'

export function TwitchIcon(props: SVGProps<SVGSVGElement>): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M4.27 1 1 4.27v15.46h4.86V24l3.27-3.27h2.73l5.45-5.45V1H4.27Zm13.09 11.73-2.73 2.73h-2.73l-2.18 2.18v-2.18H4.27V4.27h13.09v8.46ZM9.55 5.95h1.64v5.45H9.55V5.95Zm4.91 0h1.63v5.45h-1.63V5.95Z" />
    </svg>
  )
}
