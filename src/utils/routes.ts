export const APP_ROUTES = {
  HOME: '/',
  DASHBOARD: '/dashboard',
  NEW_ORDER: '/new-order',
  ORDERS: '/orders',
  SERVICES: '/services',
  BLOG: '/blog',
  AFFILIATES: '/affiliates',
  ANALYTICS: '/analytics',
  REVIEWS: '/reviews',
  SETTINGS: '/settings',
  HELP: '/help',
  SUPPORT: '/support',
  LOGIN: '/login',
  REGISTER: '/register',
  ADMIN: '/admin'
} as const;

export const TAB_TO_PATH: Record<string, string> = {
  home: '/',
  dashboard: '/dashboard',
  new_order: '/new-order',
  orders: '/orders',
  services: '/services',
  blog: '/blog',
  affiliates: '/affiliates',
  analytics: '/analytics',
  reviews: '/reviews',
  settings: '/settings',
  help: '/help',
  support: '/support',
  login: '/login',
  register: '/register',
  admin_panel: '/admin',
  admin: '/admin'
};

export const PATH_TO_TAB: Record<string, string> = {
  '/': 'home',
  '/dashboard': 'dashboard',
  '/new-order': 'new_order',
  '/orders': 'orders',
  '/services': 'services',
  '/blog': 'blog',
  '/affiliates': 'affiliates',
  '/analytics': 'analytics',
  '/reviews': 'reviews',
  '/settings': 'settings',
  '/help': 'help',
  '/support': 'support',
  '/login': 'login',
  '/register': 'register',
  '/admin': 'admin'
};

export const getTabFromPathname = (pathname: string): { tab: string; isAdmin: boolean } => {
  const cleanPath = pathname.replace(/\/+$/, '') || '/';
  if (cleanPath.startsWith('/admin')) {
    return { tab: 'admin', isAdmin: true };
  }
  const tab = PATH_TO_TAB[cleanPath] || 'dashboard';
  return { tab, isAdmin: false };
};
