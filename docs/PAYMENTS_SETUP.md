# Payments setup

Two deposit methods, both built so that **the gateway reports and we decide**: money reaches a
wallet only after our server has verified the outcome against the gateway itself, and the resulting
ledger movement is keyed by the payment id — so a repeated notification, a double click or two
workers polling the same deposit can never credit twice.

| Gateway | What it takes | Currency charged | Customer's next step |
|---|---|---|---|
| `heleket` | merchant UUID + payment API key | USD (crypto) | pays on the invoice page we return |
| `shahnawy` | base URL + public key + secret key | EGP (wallet) | approves on their phone (`*9*1#` for Vodafone) |

A method is only offered to customers when **both** are true: its `feature_flags` row
(`payments.heleket` / `payments.shahnawy`) is enabled, and its credentials are present. Otherwise the
deposit form simply does not show it — the API never offers a method that cannot work.

---

## 1. Heleket

1. In the Heleket dashboard: **Business → Merchants → Merchant settings**. Copy the **Merchant UUID**
   and the **payment API key** (generated after moderation), and confirm your domain there.
2. In Render → your service → **Environment**, add:
   - `HELEKET_MERCHANT_ID` — the merchant UUID
   - `HELEKET_API_KEY` — the payment API key
3. The webhook URL to give Heleket is:

   ```
   https://smmrapid.store/api/webhooks/payments/heleket
   ```

   Our code also sends it automatically as `url_callback` on every invoice, and
   `PUBLIC_ORIGIN` is what that URL is built from — set it if the domain ever changes.

### How a Heleket deposit is verified

Heleket signs each notification: `md5(base64(json body without sign) + api_key)`, with the JSON
encoded the way PHP does it (unescaped unicode, escaped forward slashes). We recompute it and compare
in constant time. A valid signature is authoritative, so the deposit is credited immediately; an
invalid one is refused with `400` and nothing moves. To be extra safe, the same code path can also
read the status back with `POST /v1/payment/info`.

## 2. Sha7nawy Gate

1. From their dashboard take the **base URL**, the **public key** and the **secret key**
   (public → create/confirm, secret → status read).
2. Add to Render:
   - `SHAHNAWY_BASE_URL`
   - `SHAHNAWY_PUBLIC_KEY`
   - `SHAHNAWY_SECRET_KEY`
3. Webhook URL to give them:

   ```
   https://smmrapid.store/api/webhooks/payments/shahnawy
   ```

### How a Sha7nawy deposit is verified

Their notification carries **no signature** (only `X-Webhook-*` headers), so it is treated as a hint,
never as proof: we record it (unverified) and then read the authoritative status from
`GET /api/payment/info/{id}` with the secret key. If that says `completed`, the wallet is credited;
if it says `rejected`, the payment is closed and nothing is credited.

Their flow also has an explicit confirm step, which we call for the customer when they press
"check again" (`POST /api/payments/deposits/:publicId/confirm`) and while handling their webhook.

**Limits:** Sha7nawy accepts 5 … 10 000 EGP. Our side checks that first so the customer gets our
wording rather than an error from the provider.

**Currency:** the wallet keeps USD minor units. An EGP deposit is converted at
`finance.usd_exchange_rate` (settings table, currently 50), and both the rate and the EGP amount are
stored on the payment row so a credit can always be explained.

## 3. Turning a method on

```sql
update feature_flags set enabled = true where key = 'payments.heleket';
update feature_flags set enabled = true where key = 'payments.shahnawy';
```

Both ship disabled, which is why the deposit form offers nothing until you decide otherwise.

## 4. Endpoints

| Method | Path | Who | What |
|---|---|---|---|
| `GET` | `/api/payments/gateways` | anyone | the methods that are on and configured, with their limits |
| `POST` | `/api/payments/deposits` | signed-in | start a deposit (rate limited: 20 / 5 min) |
| `GET` | `/api/payments/deposits` | signed-in | the customer's own deposits |
| `GET` | `/api/payments/deposits/:publicId` | owner | one deposit |
| `POST` | `/api/payments/deposits/:publicId/confirm` | owner | "I approved it" — the answer comes from the gateway |
| `POST` | `/api/webhooks/payments/:gateway` | gateway | notification; always acknowledged, except an unverifiable signature |

## 5. Verifying a deployment

```bash
# what is offered right now (empty until a flag is on and credentials are set)
curl -s https://smmrapid.store/api/payments/gateways

# starting a deposit without a session is refused, not silently accepted
curl -s -X POST https://smmrapid.store/api/payments/deposits -H 'content-type: application/json' \
  -d '{"gateway":"heleket","amountMinor":500}'
```

Both gateways ship with `PAYMENT_*` codes in `docs/ERROR_CODES.md` and in the web catalogue, so a
customer always reads what happened and what to do next — in Arabic, in the app.
