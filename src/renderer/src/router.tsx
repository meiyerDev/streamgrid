import { createHashHistory } from '@tanstack/history'
import { createRootRoute, createRoute, createRouter } from '@tanstack/react-router'

import { RootLayout } from './components/layouts'
import { AccountPage } from './pages/account'
import { HomePage } from './pages/home'
import { SettingsPage } from './pages/settings'

const rootRoute = createRootRoute({
  component: RootLayout
})

const homeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: HomePage
})

const accountRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/account',
  component: AccountPage
})

const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/settings',
  component: SettingsPage
})

const routeTree = rootRoute.addChildren([homeRoute, accountRoute, settingsRoute])

const router = createRouter({
  routeTree,
  history: createHashHistory()
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

export { routeTree, router }
