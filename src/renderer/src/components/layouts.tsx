import { Outlet } from '@tanstack/react-router'

export function RootLayout(): React.JSX.Element {
  return (
    <div className="flex h-screen w-screen items-center justify-center overflow-hidden bg-canvas text-white">
      <Outlet />
    </div>
  )
}
