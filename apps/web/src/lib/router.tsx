import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { AnchorHTMLAttributes, ReactNode } from 'react';

/**
 * The router: history-based, dependency-free, and small enough to read in one sitting.
 *
 * Why not a router library: the app needs five patterns and a nav, and a library would add its own
 * upgrade treadmill plus a second source of truth for the URL. What matters here instead is that
 * every navigation is a real `<a href>` (middle-click, open-in-new-tab and crawlers all work), that
 * `back` is the browser's, and that the server already answers any deep link with index.html.
 *
 * Paths are matched with `:param` segments; the first match wins. A trailing slash is ignored, so
 * `/orders/` and `/orders` are the same page.
 */

export type RouteParams = Record<string, string>;
export type RouterValue = {
  path: string;
  query: URLSearchParams;
  navigate: (to: string, options?: { replace?: boolean }) => void;
};

const RouterContext = createContext<RouterValue | null>(null);

const normalize = (value: string): string => {
  if (!value) return '/';
  const withSlash = value.startsWith('/') ? value : `/${value}`;
  return withSlash.length > 1 && withSlash.endsWith('/') ? withSlash.slice(0, -1) : withSlash;
};

function currentPath(): string {
  if (typeof window === 'undefined') return '/';
  return normalize(`${window.location.pathname}${window.location.search}`);
}

export function RouterProvider({ children, initialPath }: { children: ReactNode; initialPath?: string }) {
  const [path, setPath] = useState(() => (initialPath ? normalize(initialPath) : currentPath()));

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onPop = () => setPath(currentPath());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const navigate = useCallback<RouterValue['navigate']>((to, options) => {
    if (typeof window === 'undefined') return;
    const target = normalize(to);
    if (target === `${window.location.pathname}${window.location.search}`) return;
    if (options?.replace) window.history.replaceState(null, '', target);
    else window.history.pushState(null, '', target);
    setPath(target);
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, []);

  const value = useMemo<RouterValue>(
    () => ({
      path,
      query: new URLSearchParams(path.split('?')[1] ?? ''),
      navigate,
    }),
    [path, navigate],
  );

  return <RouterContext.Provider value={value}>{children}</RouterContext.Provider>;
}

export function useRouter(): RouterValue {
  const context = useContext(RouterContext);
  if (!context) throw new Error('useRouter must be used inside RouterProvider');
  return context;
}

/** The path part of the current location, without its query string. */
export function usePathname(): string {
  return useRouter().path.split('?')[0] || '/';
}

/**
 * A navigation link. A plain left-click is handled in-app; anything else (new tab, middle click,
 * copy link, javascript disabled) keeps the browser's own behaviour because the href is real.
 */
export function Link({
  to,
  children,
  ...rest
}: { to: string } & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'>) {
  const { navigate } = useRouter();
  return (
    <a
      href={to}
      onClick={(event) => {
        if (event.defaultPrevented || event.button !== 0) return;
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        navigate(to);
        rest.onClick?.(event);
      }}
      {...rest}
    >
      {children}
    </a>
  );
}

/** `matchPath('/orders/:publicId', '/orders/ORD-1')` → `{ publicId: 'ORD-1' }`, or null. */
export function matchPath(pattern: string, path: string): RouteParams | null {
  const patternParts = normalize(pattern).split('/').filter(Boolean);
  const pathParts = normalize(path).split('/').filter(Boolean);
  if (patternParts.length !== pathParts.length) return null;

  const params: RouteParams = {};
  for (let index = 0; index < patternParts.length; index += 1) {
    const expected = patternParts[index]!;
    const actual = pathParts[index]!;
    if (expected.startsWith(':')) {
      if (!actual) return null;
      params[expected.slice(1)] = decodeURIComponent(actual);
      continue;
    }
    if (expected !== actual) return null;
  }
  return params;
}
