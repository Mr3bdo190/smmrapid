# SMM Panel

Production-oriented SMM panel with Firebase authentication, PostgreSQL/Drizzle, provider integration, wallet ledger, payments, affiliate rewards, raffles, mystery boxes, shortlinks, support tickets and a public SMM API.

## Requirements
- Node.js 20+
- PostgreSQL/Supabase PostgreSQL
- Firebase project with Authentication enabled
- SMM provider API (optional until providers/services are configured)
- Kashier account (optional until payments are configured)

## Setup
1. Copy `.env.example` to `.env` and fill in real server-side values.
2. Install dependencies: `npm ci`
3. Apply migrations with your Drizzle workflow.
4. Run `npm run typecheck`.
5. Run `npm run build`.
6. Start with `npm start`.

## Admin bootstrap
Put one or more trusted Firebase account emails in `ADMIN_EMAILS`. New verified accounts matching this allowlist are provisioned as admins; all other accounts are users. Never trust a role supplied by the browser.

## Security
- Firebase ID tokens are verified server-side.
- Admin APIs require DB role `admin`.
- Financial mutations use DB transactions and row locks.
- Wallet changes are recorded in `wallet_ledger`.
- Kashier webhooks require an HMAC signature configured by `KASHIER_WEBHOOK_SECRET`.
- Provider API keys and payment secrets never go to the client.

## Public API
`POST /api/v1` with `key` and one of:
- `services`
- `balance`
- `add`
- `status`

Use the generated service UUID in the `service` field.

## Health
`GET /api/health`

## Production note
Do not commit `.env`, Firebase private keys, provider API keys or payment secrets. Configure them through the hosting provider's secret/environment system.
