# RapidSMM 2.0 — Clean Start

RapidSMM 2.0 is a clean rebuild of the public experience and data-install path while keeping the production API/provider/payment architecture.

## What changed

- New RapidSMM visual identity: clean white/indigo/violet UI, responsive cards, modern dashboard shell.
- Public website flow inspired by the clarity of leading SMM panels, without copying their source code, branding or text.
- SEO-first public pages remain crawlable: services, pricing, FAQ, how-it-works, about, contact, policies and the standalone blog.
- Dashboard remains an authenticated React application because auth, wallet state and live orders should not be static SEO pages.
- New Order flow is strictly Category → Section → Service → details → link → quantity → confirmation.
- Provider names are hidden from customers. Provider-supplied service metadata is stored in `services.provider_meta` and used for customer-facing details.
- Provider sync calculates selling price from provider cost + provider margin.
- Admin Settings now has a default provider profit margin; each provider can still have its own margin.
- USD is the wallet currency. Kashier/Vodafone Cash can settle externally in EGP and are converted before wallet credit; Heleket is USD.
- Render is pinned to Node 20.19.5 and uses `npm ci` for reproducible builds.
- Auth failure no longer shows a misleading red Access Denied screen during a temporary sync problem; the dashboard shows a reconnect state with retry/sign-out actions.
- No fake customer/order statistics are used as real business claims.

## Fresh Supabase setup

1. Back up the existing database if you need it.
2. Run `RESET_DATABASE.sql` in Supabase SQL Editor. This permanently deletes RapidSMM application data.
3. Run `drizzle/0000_clean_install.sql`.
4. Run `drizzle/0001_seed_categories.sql`.
5. Add your real provider in Admin → Providers and use Sync.
6. Set your real support email and payment credentials in Render/Supabase settings.

The old migration history is under `drizzle/legacy/` for reference only.

## Provider pricing / margin

Each provider has a `profitMargin`. On provider sync:

`selling price = provider price × (1 + margin / 100)`

Admin → Settings also contains a default margin used when creating a new provider. This is not a fake markup shown to users; it is the actual price calculation used for synced services.

## Currency

Wallet: USD.

Kashier / Vodafone Cash: external EGP settlement, converted to USD before wallet credit using the configured exchange rate.

Heleket: USD wallet and USD gateway; no conversion when both currencies match.

## SEO

The project keeps the existing SEO work: sitemap, robots, hreflang, platform landing pages, standalone public pages, article metadata and JSON-LD. Structured data should describe real page content; it must not be used to fabricate reviews, statistics or offers.

Google recommends that structured-data pages be crawlable, accurately represent the page content, and have a sitemap submitted through Search Console. See the official Search documentation before publishing new schema.
