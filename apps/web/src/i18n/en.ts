/**
 * The English dictionary — and the **source of truth for the key set**.
 *
 * `MessageKey` is derived from this object and `ar` is typed as `Record<MessageKey, string>`,
 * so:
 *   - `t('does.not.exist')` is a TypeScript error, never a blank string at runtime;
 *   - a key added here without an Arabic translation fails the typecheck;
 *   - a key added to `ar` that does not exist here is an excess-property error.
 *
 * Placeholders are written `{name}`; the parameter names become part of the function signature,
 * so `t('ui.pagination.summary')` *requires* `{ page, total }` and `t('common.retry')` rejects
 * any second argument at all.
 */
export const en = {
  /* ── generic ─────────────────────────────────────────────────────────────────────────────── */
  'common.appName': 'SMM Rapid',
  'common.retry': 'Try again',
  'common.refresh': 'Refresh',
  'common.refreshing': 'Refreshing…',
  'common.cancel': 'Cancel',
  'common.confirm': 'Confirm',
  'common.close': 'Close',
  'common.dismiss': 'Dismiss',
  'common.loading': 'Loading…',
  'common.signIn': 'Sign in',
  'common.signOut': 'Sign out',
  'common.back': 'Back',
  'common.next': 'Next',
  'common.previous': 'Previous',
  'common.optional': 'Optional',
  'common.required': 'Required',
  'common.none': 'None',
  'common.notSet': 'Not set',
  'common.copy': 'Copy',
  'common.copied': 'Copied',
  'common.technicalDetails': 'Technical details',
  'common.supportReference': 'Support reference',
  'common.page': 'Page',
  'common.of': 'of',
  'common.yes': 'Yes',
  'common.no': 'No',

  /* ── brand / shell ───────────────────────────────────────────────────────────────────────── */
  'brand.tagline': 'Social media services with clear pricing and live tracking.',
  'shell.loadingSession': 'Opening your session…',
  'shell.phaseBadge': 'New build',
  'shell.phaseNote': 'Phase 3 — new visual identity and sign-in',
  'shell.authDisabled.kicker': 'Not configured yet',
  'shell.authDisabled.title': 'Sign-in is not configured on the server yet',
  'shell.authDisabled.message':
    'The interface and the API are ready. What is missing is the Firebase environment variables in the deployment (the admin private key) so sign-in can run. The exact steps are in docs/FIREBASE_SETUP.md.',
  'shell.authDisabled.action': 'Show the sign-in screen anyway',

  /* ── theme + language switchers ──────────────────────────────────────────────────────────── */
  'theme.toggle': 'Switch between light and dark mode',
  'theme.light': 'Light',
  'theme.dark': 'Dark',
  'locale.label': 'Language',
  'locale.switchTo': 'Switch to {language}',

  /* ── sign-in / sign-up / reset ───────────────────────────────────────────────────────────── */
  'auth.tab.signIn': 'Sign in',
  'auth.tab.signUp': 'New account',
  'auth.title.signin': 'Sign in',
  'auth.title.signup': 'Create your account',
  'auth.title.reset': 'Reset your password',
  'auth.hint.signin': 'Use your email and password to continue to your account.',
  'auth.hint.signup': 'One minute, no payment details — the balance is credited only after a confirmed payment.',
  'auth.hint.reset': 'We will email you a link to set a new password.',
  'auth.submit.signin': 'Sign in',
  'auth.submit.signup': 'Create account',
  'auth.submit.reset': 'Send the link',
  'auth.busy.signin': 'Checking…',
  'auth.busy.signup': 'Creating your account…',
  'auth.busy.reset': 'Sending…',
  'auth.field.name': 'Name',
  'auth.field.email': 'Email address',
  'auth.field.password': 'Password',
  'auth.placeholder.name': 'The name that shows on your account',
  'auth.placeholder.password': 'At least 8 characters',
  'auth.hint.password': '8 characters or more. Use something you do not use anywhere else.',
  'auth.forgotPassword': 'Forgot your password?',
  'auth.backToSignIn': 'Back to sign in',
  'auth.resetSent': 'If that address is registered with us, the reset link is on its way to you.',
  'auth.privacyNote': 'Your details stay with us',
  'auth.firebaseMissing': 'The client Firebase configuration is not available in this build, so sign-in is disabled. (Configuration is injected at build time.)',
  'auth.tabsLabel': 'Sign in or create an account',
  'auth.signedIn': 'Signed in',

  /* ── account panel ───────────────────────────────────────────────────────────────────────── */
  'account.kicker': 'Account',
  'account.loading': 'Loading your account…',
  'account.error.title': 'We could not load your account',
  'account.emailVerified': 'Email confirmed',
  'account.emailNotVerified': 'Email not confirmed',
  'account.status.active': 'Active',
  'account.status.pending': 'Pending',
  'account.status.suspended': 'Suspended',
  'account.status.deleted': 'Closed',
  'account.wallet.kicker': 'Wallet balance',
  'account.wallet.note': 'Top-up opens in the payments phase — the balance is credited only after a payment is confirmed.',
  'account.roles.kicker': 'Access',
  'account.roles.none': 'Standard customer role',
  'account.roles.permissions': '{count} permissions · some are admin-only',
  'account.details.kicker': 'Account details',
  'account.details.id': 'Account ID',
  'account.details.referral': 'Referral code',
  'account.details.referralPending': 'Not generated yet',
  'account.details.createdAt': 'Created',
  'account.actions.refresh': 'Refresh data',
  'account.live.kicker': 'What actually works today',
  'account.live.signIn': 'Sign-in, sign-up and password reset through Firebase on the same project.',
  'account.live.server': 'The server verifies the token itself and creates the account row and wallet automatically on first sign-in.',
  'account.live.roles': 'Roles and permissions are read from the database, never from the browser.',

  /* ── money ───────────────────────────────────────────────────────────────────────────────── */
  'money.label.credit': 'Credit of {amount}',
  'money.label.debit': 'Debit of {amount}',
  'money.label.plain': 'Amount {amount}',

  /* ── ledger ──────────────────────────────────────────────────────────────────────────────── */
  'ledger.caption': 'Wallet transactions',
  'ledger.column.date': 'Date',
  'ledger.column.type': 'Type',
  'ledger.column.amount': 'Amount',
  'ledger.column.balance': 'Balance after',
  'ledger.column.reference': 'Reference',
  'ledger.credit': 'Credit',
  'ledger.debit': 'Debit',
  'ledger.type.deposit': 'Top-up',
  'ledger.type.order': 'Order charge',
  'ledger.type.refund': 'Refund',
  'ledger.type.adjustment': 'Adjustment',
  'ledger.type.hold': 'Amount reserved',
  'ledger.type.release': 'Reservation released',
  'ledger.type.bonus': 'Bonus',
  'ledger.type.referral': 'Referral commission',
  'ledger.type.payout': 'Withdrawal',
  'ledger.summary': 'Showing {count} of {total} transactions',
  'ledger.empty.title': 'No transactions yet',
  'ledger.empty.message': 'As soon as you top up or place an order, every movement appears here with its amount, its balance and its reference.',

  /* ── component kit ───────────────────────────────────────────────────────────────────────── */
  'ui.spinner.label': 'Loading…',
  'ui.skeleton.label': 'Loading content…',
  'ui.empty.title': 'Nothing here yet',
  'ui.empty.message': 'There is nothing to show at the moment.',
  'ui.pagination.nav': 'Pagination',
  'ui.pagination.previous': 'Previous page',
  'ui.pagination.next': 'Next page',
  'ui.pagination.summary': 'Page {page} of {total}',
  'ui.pagination.goTo': 'Go to page {page}',
  'ui.confirm.title': 'Are you sure?',
  'ui.confirm.confirm': 'Confirm',
  'ui.confirm.cancel': 'Cancel',
  'ui.confirm.busy': 'Working…',
  'ui.tone.ok': 'OK',
  'ui.tone.warn': 'Warning',
  'ui.tone.danger': 'Problem',
  'ui.tone.info': 'Information',
  'ui.tone.accent': 'Highlighted',
  'ui.tone.neutral': 'Neutral',

  /* ── error banner chrome (the sentences themselves live in src/i18n/error-codes.ts) ─────── */
  'errors.code': 'Error code',
  'errors.unlistedCode': 'Unlisted code',
  'errors.nextStep': 'Next step',
  'errors.supportRefHint': 'Send us this reference and we will find the request immediately.',
} as const;

/** Every valid translation key — a typo is a compile error, not a blank string. */
export type MessageKey = keyof typeof en;

/** The shape `ar` must satisfy: exactly the same keys, all strings. */
export type Messages = Record<MessageKey, string>;

/**
 * Extracts `{placeholder}` names out of a message literal, so the translator can demand them.
 *
 *   ExtractParams<'Page {page} of {total}'>  // 'page' | 'total'
 */
export type ExtractParams<S extends string> = S extends `${string}{${infer Name}}${infer Rest}`
  ? Name | ExtractParams<Rest>
  : never;

export type MessageParams<K extends MessageKey> = ExtractParams<(typeof en)[K]>;

/**
 * The arguments of a call to `t`, derived from the key.
 *
 *   - a key with `{placeholders}` **requires** a parameter object;
 *   - a key without any **rejects** a second argument (so a copy change cannot leave a call site
 *     silently passing something meaningless);
 *   - a key that TypeScript could not narrow to a literal (an unknown key, or a genuinely dynamic
 *     one) gets an optional loose parameter object, which makes the *key* itself the error the
 *     compiler reports — a helpful message instead of an arity complaint.
 */
export type MessageArgs<K extends MessageKey> = MessageKey extends K
  ? [params?: Record<string, string | number>]
  : MessageParams<K> extends never
    ? []
    : [params: Record<MessageParams<K>, string | number>];

/**
 * The translator signature.
 *
 * A key that does not exist is a TypeScript error at the call site — never a blank string at
 * runtime. See `src/i18n/typecheck.ts`, which proves all of this at compile time.
 */
export type TFunction = <K extends MessageKey>(key: K, ...[params]: MessageArgs<K>) => string;
