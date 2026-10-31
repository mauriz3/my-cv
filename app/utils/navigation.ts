/** Destinos de la navegación: única fuente para sidebar, raíl y barra inferior. */
export const NAV_ITEMS = [
  { id: 'profile', path: '/', icon: 'i-lucide-user' },
  { id: 'skills', path: '/skills', icon: 'i-lucide-bar-chart-3' },
  { id: 'experience', path: '/experience', icon: 'i-lucide-briefcase' },
  { id: 'projects', path: '/projects', icon: 'i-lucide-layout-grid' },
  { id: 'education', path: '/education', icon: 'i-lucide-graduation-cap' },
  { id: 'visits', path: '/visits', icon: 'i-lucide-trending-up' }
] as const

export type NavItemId = (typeof NAV_ITEMS)[number]['id']
