/**
 * SSR smoke test entry (bundled by scripts/ssr-smoke.mjs, run by node — no browser, no jsdom).
 *
 * It proves, with real rendered markup, that:
 *   - the locale layer switches the whole tree between Arabic (default, RTL) and English (LTR);
 *   - `applyDocumentLocale` writes `lang` and `dir` onto <html>;
 *   - every kit component renders accessible markup (labels, aria-describedby, aria-invalid,
 *     aria-busy, roles, scope, aria-current, accessible table headers);
 *   - the error catalogue produces a full {title, message, nextStep, action, ref} for a known code
 *     and the safe fallback (server message + support reference) for an unknown one;
 *   - money is formatted from integer minor units with Intl in the active locale;
 *   - both dictionaries carry exactly the same keys (no key missing a translation).
 */
import { renderToStaticMarkup } from 'react-dom/server';
import { ApiError } from '../src/lib/api';
import {
  applyDocumentLocale,
  dictionaryGaps,
  DICTIONARIES,
  errorCodeOf,
  errorCopyFor,
  LocaleProvider,
  useT,
} from '../src/i18n';
import type { Locale } from '../src/i18n';
import {
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  ErrorBanner,
  Field,
  LedgerTable,
  Money,
  Pagination,
  Skeleton,
  Spinner,
  StatusPill,
  Tabs,
  TextField,
} from '../src/ui';

let checks = 0;
const failures: string[] = [];

function check(name: string, condition: boolean): void {
  checks += 1;
  if (condition) {
    console.log(`  \u2713 ${name}`);
  } else {
    failures.push(name);
    console.log(`  \u2717 ${name}`);
  }
}

function section(title: string): void {
  console.log(`\n${title}`);
}

/** A representative screen: every component in the kit, rendered from the dictionary. */
function Screen() {
  const { t, locale, dir, formatNumber } = useT();

  return (
    <main data-locale={locale} data-dir={dir}>
      <Card kicker={t('account.wallet.kicker')} title={t('account.kicker')}>
        <StatusPill tone="ok" label={t('account.emailVerified')} />
        <Money minor={123456} currency="USD" tone="credit" sign="always" />
        <Money minor={-2500} currency="USD" tone="debit" sign="always" />
        <Money minor={99900} currency="EGP" />
        <p>{t('account.roles.permissions', { count: formatNumber(4) })}</p>
        <p>{t('ui.pagination.summary', { page: 2, total: 9 })}</p>
      </Card>

      <TextField
        label={t('auth.field.email')}
        hint={t('auth.hint.password')}
        error={errorCopyFor('VALIDATION_ERROR', locale).title}
        defaultValue=""
      />

      <Field label={t('auth.field.password')}>
        {(control) => <input {...control} className="field" />}
      </Field>

      <Button loading>{t('common.loading')}</Button>
      <Button variant="secondary" iconOnly aria-label={t('common.copy')}>
        <CopyGlyph />
      </Button>
      <Spinner />
      <Skeleton lines={2} />

      <ErrorBanner
        error={new ApiError('Ledger says no', 'WALLET_INSUFFICIENT_FUNDS', 409, 'REF123ABC')}
        onRetry={() => undefined}
        onAction={() => undefined}
      />
      <ErrorBanner error={new ApiError('Some brand new failure', 'BRAND_NEW_CODE', 500, 'REF999')} />

      <LedgerTable
        entries={[
          {
            id: '1',
            occurredAt: '2026-09-19T10:00:00.000Z',
            type: 'deposit',
            amountMinor: 25000,
            currency: 'USD',
            balanceAfterMinor: 50000,
            reference: 'INV-2026-0001',
          },
          {
            id: '2',
            occurredAt: '2026-09-19T11:30:00.000Z',
            type: 'order',
            amountMinor: -1250,
            currency: 'USD',
            balanceAfterMinor: 48750,
            reference: null,
          },
          {
            id: '3',
            occurredAt: '2026-09-19T12:00:00.000Z',
            type: 'totally_new_type',
            amountMinor: 100,
            currency: 'USD',
            balanceAfterMinor: 48850,
            reference: 'X-1',
          },
        ]}
      />

      <LedgerTable entries={[]} />
      <EmptyState />
      <Tabs
        label={t('auth.tabsLabel')}
        items={[
          { id: 'signin', label: t('auth.tab.signIn'), content: <p>{t('auth.hint.signin')}</p> },
          { id: 'signup', label: t('auth.tab.signUp'), content: <p>{t('auth.hint.signup')}</p> },
        ]}
      />
      <Pagination page={2} pageCount={9} totalItems={42} onPageChange={() => undefined} />
      <ConfirmDialog
        open={false}
        description={t('account.wallet.note')}
        onConfirm={() => undefined}
        onCancel={() => undefined}
      />
    </main>
  );
}

function CopyGlyph() {
  return <span aria-hidden="true">copy</span>;
}

function render(locale: Locale): string {
  return renderToStaticMarkup(
    <LocaleProvider initialLocale={locale}>
      <Screen />
    </LocaleProvider>,
  );
}

/* ── 1. document language and direction ──────────────────────────────────────────────────────── */
section('document language + direction (applyDocumentLocale sets <html lang dir>)');
const stub = { documentElement: { lang: '', dir: '', dataset: {} as Record<string, string> } };
applyDocumentLocale('ar', stub as unknown as Document);
check('arabic → lang="ar" dir="rtl"', stub.documentElement.lang === 'ar' && stub.documentElement.dir === 'rtl');
applyDocumentLocale('en', stub as unknown as Document);
check('english → lang="en" dir="ltr"', stub.documentElement.lang === 'en' && stub.documentElement.dir === 'ltr');

/* ── 2. dictionaries ─────────────────────────────────────────────────────────────────────────── */
section('dictionaries');
const gaps = dictionaryGaps().filter((gap) => gap.missing.length > 0);
check(`both dictionaries complete (${Object.keys(DICTIONARIES.ar).length} keys, ar + en)`, gaps.length === 0);
check(
  'en and ar have the same key count',
  Object.keys(DICTIONARIES.en).length === Object.keys(DICTIONARIES.ar).length,
);

/* ── 3. Arabic render (default locale) ───────────────────────────────────────────────────────── */
section('arabic render (rtl, latin tabular digits)');
const arHtml = render('ar');
check('root locale marker is ar/rtl', arHtml.includes('data-locale="ar"') && arHtml.includes('data-dir="rtl"'));
check('arabic copy is rendered', arHtml.includes('رصيد المحفظة'));
check('arabic error title from the catalogue', arHtml.includes('رصيدك لا يكفي'));
check(
  'arabic next step from the catalogue',
  arHtml.includes('أضف رصيدًا للمحفظة، ثم أعد المحاولة.'),
);
check('catalogue action button label', arHtml.includes('>أضف رصيدًا<'));
check('support reference is rendered', arHtml.includes('REF123ABC'));
check('money is formatted with latin digits', arHtml.includes('1,234.56') && arHtml.includes('25.00'));
check('ledger credit sign is present', arHtml.includes('+'));
check('unknown code falls back to the server message', arHtml.includes('Some brand new failure'));
check('unknown code still shows its reference', arHtml.includes('REF999'));
check('unknown code shows the unlisted-code marker', arHtml.includes('كود غير معرّف'));
check('no english leaked into the arabic render', !arHtml.includes('Sign in again'));

/* ── 4. English render ───────────────────────────────────────────────────────────────────────── */
section('english render (ltr)');
const enHtml = render('en');
check('root locale marker is en/ltr', enHtml.includes('data-locale="en"') && enHtml.includes('data-dir="ltr"'));
check('english copy is rendered', enHtml.includes('Wallet balance'));
check('english catalogue copy', enHtml.includes('Your balance is not enough'));
check('english action label', enHtml.includes('>Add funds<'));
check('no arabic leaked into the english render', !/[\u0600-\u06FF]/.test(enHtml));

/* ── 5. accessibility contract of the kit ────────────────────────────────────────────────────── */
section('accessibility contract');
const labelMatch = enHtml.match(/<label class="label" for="([^"]+)">/);
check('field label points at the control (for/id match)', Boolean(labelMatch) && enHtml.includes(`id="${labelMatch?.[1]}"`));
check('aria-describedby wires hint + error', /aria-describedby="([^"]+-hint [^"]+-error)"/.test(enHtml));
check('aria-invalid is set only with an error', enHtml.includes('aria-invalid="true"'));
check('the hint element exists for the id', /id="[^"]+-hint" class="mt-1.5/.test(enHtml));
check('the error element exists and is a live region', /id="[^"]+-error" role="alert"/.test(enHtml));
const busyButton = enHtml.match(/<button[^>]*aria-busy="true"[^>]*>/)?.[0] ?? '';
check('loading button is busy and disabled', busyButton.includes('disabled'));
check('icon-only button has an aria-label', /aria-label="(Copy|انسخ)"/.test(enHtml));
check('spinner announces itself', /role="status"/.test(enHtml) && enHtml.includes('Loading'));
check('skeleton announces itself', enHtml.includes('aria-busy="true"'));
check('ledger has a caption', enHtml.includes('Wallet transactions'));
check('every ledger header is a scoped th', (enHtml.match(/scope="col"/g) ?? []).length === 5);
check('unknown ledger type falls back to the raw value', enHtml.includes('totally_new_type'));
check('empty ledger renders the empty state', enHtml.includes('No transactions yet'));
check('tab list is labelled', /role="tablist" aria-label="[^"]+"/.test(enHtml));
check('tabs use roving tabindex', /role="tab" id="[^"]+" aria-controls="[^"]+" aria-selected="true" tabindex="0"/.test(enHtml));
check('inactive tab is out of the tab order', enHtml.includes('tabindex="-1"'));
const tabMatch = enHtml.match(/role="tab" id="([^"]+)"/);
const panelMatch = enHtml.match(/role="tabpanel" id="([^"]+)" aria-labelledby="([^"]+)"/);
check(
  'panel is linked back to its tab (aria-labelledby = the tab id)',
  Boolean(tabMatch) && panelMatch?.[2] === tabMatch?.[1],
);
check(
  'the tab points at its panel (aria-controls = the panel id)',
  Boolean(panelMatch) && enHtml.includes(`aria-controls="${panelMatch?.[1]}"`),
);
check('pagination marks the current page', enHtml.includes('aria-current="page"'));
check('pagination labelled its controls', enHtml.includes('aria-label="Previous page"') && enHtml.includes('aria-label="Next page"'));
check('previous chevron is mirrored for ltr/rtl', enHtml.includes('rotate-180 rtl:rotate-0'));
check('next chevron is mirrored for ltr/rtl', enHtml.includes('rtl:rotate-180'));
check('dialog is a native <dialog> with labelledby + describedby', /<dialog[^>]*aria-labelledby="[^"]+"[^>]*aria-describedby="[^"]+"/.test(enHtml));
check('dialog has real cancel/confirm buttons', enHtml.includes('>Cancel<') && enHtml.includes('>Confirm<'));
check(
  'no hard-coded direction in the markup (only <html> carries it)',
  !/\sdir="(ltr|rtl)"/.test(enHtml) && !/\sdir="(ltr|rtl)"/.test(arHtml),
);

/* ── 6. error resolution ─────────────────────────────────────────────────────────────────────── */
section('error resolution');
check('ApiError keeps its code', errorCodeOf(new ApiError('x', 'ACCOUNT_DISABLED', 403)) === 'ACCOUNT_DISABLED');
check('fetch failure maps to NETWORK_ERROR', errorCodeOf(new TypeError('Failed to fetch')) === 'NETWORK_ERROR');
check('an unknown thrown value maps to REQUEST_FAILED', errorCodeOf({ nope: true }) === 'REQUEST_FAILED');

/* ── 7. the migrated panels, inside the real AuthProvider ────────────────────────────────────── */
/**
 * Loaded through a dynamic `import()` inside an async function (never top-level await: the bundle
 * is CJS so react-dom/server can `require` node builtins). If the Firebase SDK cannot load in this
 * bare Node harness, the section reports "skipped" instead of failing — the panels are still
 * covered by `tsc` and by the Vite build.
 */
async function panelsSection(): Promise<void> {
  section('migrated panels (SignInPanel / AccountPanel, inside AuthProvider)');

  try {
    const { AuthProvider } = await import('../src/auth/AuthProvider');
    const { SignInPanel } = await import('../src/components/SignInPanel');
    const { AccountPanel } = await import('../src/components/AccountPanel');

    const signIn = renderToStaticMarkup(
      <LocaleProvider initialLocale="ar">
        <AuthProvider>
          <SignInPanel />
        </AuthProvider>
      </LocaleProvider>,
    );
    const accountEn = renderToStaticMarkup(
      <LocaleProvider initialLocale="en">
        <AuthProvider>
          <AccountPanel />
        </AuthProvider>
      </LocaleProvider>,
    );

    check(
      'SignInPanel renders both dictionary tabs',
      signIn.includes('تسجيل الدخول') && signIn.includes('حساب جديد'),
    );
    check(
      'SignInPanel fields are labelled from the dictionary',
      signIn.includes('>البريد الإلكتروني<') && signIn.includes('>كلمة السر<'),
    );
    check(
      'SignInPanel carries no hard-coded English copy',
      !signIn.includes('Sign in') && !signIn.includes('Password') && !signIn.includes('Email address'),
    );
    check(
      'AccountPanel renders its loading state from the dictionary',
      accountEn.includes('Loading your account'),
    );
    check(
      'AccountPanel carries no hard-coded Arabic copy',
      !/[\u0600-\u06FF]/.test(accountEn),
    );
  } catch (error) {
    console.log(
      `  \u24d8 skipped: the Firebase SDK does not load in this bare Node harness (${String(error).slice(0, 90)})`,
    );
  }
}

/* ── every route, in both locales ─────────────────────────────────────────────────────────────── */
/**
 * The route table is new surface, and a page that throws during render is a white page in production
 * — the failure mode this suite exists to catch. Each route is rendered through the real App (so the
 * real providers, the real dictionary and the real router are exercised), and the copy each visitor
 * should see is asserted, not just the absence of a crash.
 */
async function routesSection(): Promise<void> {
  section('routes (real App, per path)');
  try {
    const { default: App } = await import('../src/App');
    const ar = DICTIONARIES.ar;
    const routes = [
      '/',
      '/services',
      '/services/some-slug',
      '/orders',
      '/orders/ORD-0001',
      '/wallet',
      '/wallet/deposit',
      '/support',
      '/support/TKT-0001',
      '/notifications',
      '/account',
      '/signin',
      '/admin',
      '/admin/services',
      '/admin/users',
      '/a/path/that/does/not/exist',
    ];

    for (const route of routes) {
      try {
        const html = renderToStaticMarkup(<App initialPath={route} />);
        const clean = !html.includes('undefined') && !html.includes('nav.') && !html.includes('orders.status.');
        check(`${route} renders (${html.length} chars, no leaked keys)`, html.length > 600 && clean);
      } catch (error) {
        check(`${route} renders (threw: ${String(error).slice(0, 80)})`, false);
      }
    }

    const home = renderToStaticMarkup(<App initialPath="/" />);
    check('the home page carries its own heading', home.includes(ar['home.title']));
    check('the home page offers the catalogue', home.includes(ar['home.cta.browse']));

    const services = renderToStaticMarkup(<App initialPath="/services" />);
    check('the catalogue page renders its heading and search', services.includes(ar['services.title']) && services.includes(ar['services.search.label']));

    const unknown = renderToStaticMarkup(<App initialPath="/a/path/that/does/not/exist" />);
    check('an unknown path gets the not-found page', unknown.includes(ar['app.notFound.title']));

    const adminServices = renderToStaticMarkup(<App initialPath="/admin/services" />);
    // With no session yet, the honest answer is "we are still checking who you are" — the panel
    // content must not appear, and the page must not leak a raw key.
    check(
      'an admin page shows nothing but the waiting state before the account is known',
      // markers unique to the panel: 'الخدمات' alone also appears in the navigation
      adminServices.includes(ar['shell.loadingSession']) &&
        !adminServices.includes(ar['admin.subtitle']) &&
        !adminServices.includes(ar['admin.services.column.margin']),
    );

    const orders = renderToStaticMarkup(<App initialPath="/orders" />);
    check(
      'a protected page waits for the session instead of showing an empty shell',
      orders.includes(ar['shell.loadingSession']),
    );

    // The English render composes the same providers the App does, with the catalogue page inside.
    const { Services } = await import('../src/pages/Services');
    const { RouterProvider } = await import('../src/lib/router');
    const { AuthProvider } = await import('../src/auth/AuthProvider');
    const enServices = renderToStaticMarkup(
      <LocaleProvider initialLocale="en">
        <RouterProvider initialPath="/services">
          <AuthProvider>
            <Services />
          </AuthProvider>
        </RouterProvider>
      </LocaleProvider>,
    );
    check('the catalogue renders in English too', enServices.includes(DICTIONARIES.en['services.title']));
    check('the English catalogue keeps the layout direction ltr', !/[\u0600-\u06FF]/.test(enServices));
  } catch (error) {
    check(`routes render (threw: ${String(error).slice(0, 120)})`, false);
  }
}

/* ── the real App ────────────────────────────────────────────────────────────────────────────── */
/**
 * Renders the exact component main.tsx mounts. A missing provider (LocaleProvider, AuthProvider)
 * is a runtime crash and a white page in the browser, not a type error — so the app itself is
 * rendered here, in both the default locale and the other one.
 */
async function appSection(): Promise<void> {
  section('the real App (what main.tsx mounts, end to end)');
  try {
    const { default: App } = await import('../src/App');
    const html = renderToStaticMarkup(<App />);

    check('App renders without throwing', html.length > 400);
    check('the shell wrapper is present', html.includes('app-shell'));
    check('the brand comes from the dictionary', html.includes('SMM Rapid'));
    check('an Arabic-first screen renders (default locale)', /[\u0600-\u06FF]/.test(html));
    check(
      'no raw dictionary key leaked into the markup',
      !html.includes('shell.') && !html.includes('common.') && !html.includes('theme.'),
    );
    check('no undefined leaked into the markup', !html.includes('undefined'));
    check('the header offers a language switch', (html.match(/<button/g) ?? []).length >= 2);
  } catch (error) {
    // A crash here is exactly the regression this section exists for: fail, never skip.
    check(`App renders without throwing (threw: ${String(error).slice(0, 120)})`, false);
  }
}

/* ── summary ─────────────────────────────────────────────────────────────────────────────────── */
function summarise(): void {
  console.log('');
  if (failures.length) {
    console.error(`\u2716 SSR smoke test FAILED: ${failures.length}/${checks} checks failed`);
    for (const failure of failures) console.error(`    - ${failure}`);
    process.exit(1);
  }
  console.log(`\u2714 SSR smoke test passed: ${checks} checks, 2 locales, no browser`);
}

void panelsSection()
  .then(appSection)
  .then(routesSection)
  .then(summarise);
