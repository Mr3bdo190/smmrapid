# Error codes

The API answers one envelope, always:

```json
{ "success": true,  "data": { } }
{ "success": false, "error": { "code": "STABLE_CODE", "message": "…", "details": { }, "ref": "…" } }
```

Rules that this file enforces:

- **The code is the contract.** Clients translate by `code`, never by message text.
- **Every code that exists is in this file.** A module that answers a code which is not listed
  here has a bug — the provider test suite asserts exactly that, automatically.
- **The message is for a person, not a developer.** No stack traces, no HTTP bodies, no driver or
  crypto text, no supplier wording. `ref` appears only on unexpected failures, and it is the
  support reference for that one request.
- **Nothing a supplier returns is forwarded to a client verbatim.** Provider failures are mapped
  onto the codes below; the supplier's own words stay in the server log and on the sync-log row.
- Failures that change no data say so ("nothing was changed"), because the first question a
  customer asks is whether money moved.

Arabic copy is the primary text (Arabic-first, English-capable): the API's English `message` is
listed as well, so the client can render either.

## Providers (Phase 7)

| Code | HTTP | ماذا حدث (عربي) | الخطوة التالية (عربي) | English message (API) |
|---|---|---|---|---|
| `PROVIDER_NOT_FOUND` | 404 | المزوّد المطلوب غير موجود. لم يتم تغيير أي شيء. | ارجع لقائمة المزوّدين واختر مزوّدًا موجودًا، وإذا كان محذوفًا أضِفه من جديد. | This supplier does not exist, so nothing was changed. |
| `PROVIDER_NOT_CONFIGURED` | 422 | بيانات المزوّد ناقصة: لا يوجد عنوان API صالح، أو العنوان مكتوب بشكل غير صحيح. لم نتصل بأي مزوّد. | اطلب من المدير إضافة عنوان API الصحيح للمزوّد (يبدأ بـ https://) ثم أعد المحاولة. | This supplier has no API address saved / the saved address is not a valid http(s) address, so we did not contact anyone. |
| `PROVIDER_ADAPTER_UNKNOWN` | 422 | نوع المزوّد المختار غير مدعوم في النظام. لم يتم تغيير أي شيء. | اختر نوع مزوّد من القائمة المدعومة، أو تواصل مع الدعم لإضافة نوع جديد. | This supplier type is not available, so nothing was changed. |
| `PROVIDER_CAPABILITY_UNSUPPORTED` | 501 | هذا المزوّد لا يوفّر هذه العملية (مثلًا لا يدعم إلغاء الطلب). لم يتم تغيير أي شيء. | لا تستخدم هذه العملية مع هذا المزوّد، واختر مزوّدًا يدعمها أو راجع إعدادات المزوّد. | This supplier does not offer that action, so nothing was changed. |
| `PROVIDER_SLUG_TAKEN` | 409 | يوجد مزوّد آخر مسجَّل بنفس الاسم المختصر. لم يتم إنشاء المزوّد. | اختر اسمًا مختصرًا مختلفًا (حروف إنجليزية صغيرة وأرقام وشرطات) ثم أعد المحاولة. | A supplier with this short name already exists. Choose a different one. |
| `PROVIDER_CONFIG_UNAVAILABLE` | 503 | إعدادات المزوّد (أسماء العمليات والحقول) لا يمكن حفظها في هذا الإصدار من قاعدة البيانات. لم يتم تغيير أي شيء. | تواصل مع الدعم لتطبيق تحديث قاعدة البيانات، ثم أعد حفظ الإعدادات. | Supplier settings cannot be saved on this version yet, so nothing was changed. |
| `CREDENTIAL_ENCRYPTION_UNAVAILABLE` | 503 | مفتاح تشفير بيانات المزوّدين غير مُهيَّأ على السيرفر، لذلك لا يمكن حفظ مفتاح الـ API الآن. لم يتم تغيير أي شيء. | تواصل مع الدعم؛ لا تُكرر المحاولة قبل ضبط المفتاح. | Supplier credentials cannot be saved right now because this server is missing its encryption key. |
| `CREDENTIAL_INVALID` | 422 | مفتاح الـ API المُرسل فارغ. لم يتم تغيير أي شيء. | أدخل مفتاح الـ API الخاص بالمزوّد ثم أعد المحاولة. | Enter the supplier's API key before saving. |
| `CREDENTIAL_UNREADABLE` | 500 | مفتاح الـ API المحفوظ لهذا المزوّد لم يعد قابلًا للقراءة (تغيّر مفتاح التشفير أو تلفت البيانات)، لذلك لم نتصل بالمزوّد. | اطلب من المدير حفظ مفتاح الـ API من جديد. | The API key saved for this supplier can no longer be read, so we did not contact the supplier. Please save the supplier's API key again. |
| `PROVIDER_UNREACHABLE` | 502 | لم نتمكّن من الوصول إلى المزوّد (الشبكة أو الموقع لا يستجيب). لم يتم تغيير أي شيء. | أعد المحاولة بعد دقائق، وإذا تكرر الأمر تواصل مع الدعم للتأكد من العنوان. | We could not reach the supplier, so nothing was changed. |
| `PROVIDER_TIMEOUT` | 504 | المزوّد تأخر في الرد حتى انتهت المهلة. لم يتم تغيير أي شيء. | أعد المحاولة بعد قليل؛ لا تُعِد إرسال الطلب أكثر من مرة في نفس اللحظة. | The supplier did not answer in time, so nothing was changed. |
| `PROVIDER_HTTP_ERROR` | 502 | المزوّد ردّ بخطأ من عنده. لم يتم تغيير أي شيء. | أعد المحاولة، وإذا تكرر نفس الخطأ تواصل مع الدعم مع وقت المحاولة. | The supplier answered with an error (status N) and nothing was changed. |
| `PROVIDER_RATE_LIMITED` | 503 | المزوّد يطلب منّا التمهل لأن عدد الطلبات كبير. لم يتم تغيير أي شيء. | انتظر عدة دقائق ثم أعد المحاولة. | The supplier is asking us to slow down, so nothing was changed. |
| `PROVIDER_EMPTY_RESPONSE` | 502 | المزوّد ردّ برد فارغ لا يمكن قراءته. لم يتم تغيير أي شيء. | أعد المحاولة بعد دقائق، وإذا تكرر الأمر تواصل مع الدعم. | The supplier answered with nothing we could read, so nothing was changed. |
| `PROVIDER_BAD_RESPONSE` | 502 | رد المزوّد غير مفهوم (صيغة مختلفة أو ناقصة عن المتوقع)، فلم نحفظ أي شيء. | أعد المحاولة، وإذا تكرر الأمر تواصل مع الدعم لمراجعة إعدادات المزوّد. | We could not understand the supplier's answer, so nothing was changed. |
| `PROVIDER_AUTH_FAILED` | 502 | المزوّد رفض مفتاح الـ API الخاص بنا. لم يتم تنفيذ العملية. | اطلب من المدير حفظ مفتاح الـ API الصحيح للمزوّد من جديد. | The supplier refused our API key, so nothing was changed. |
| `PROVIDER_REJECTED` | 502 | المزوّد رفض هذا الطلب (مثلًا كمية غير مناسبة أو خدمة غير متاحة). لم يتم تنفيذ العملية. | راجع بيانات الطلب أو إعدادات الخدمة، وإذا احتجت مساعدة تواصل مع الدعم. | The supplier refused this request and nothing was changed. |

### Failure shape the client should expect

```json
{
  "success": false,
  "error": {
    "code": "PROVIDER_TIMEOUT",
    "message": "The supplier did not answer in time, so nothing was changed. Please try again in a few minutes.",
    "details": { "action": "services" }
  }
}
```

`details` only ever carries data we produced (the action name, the supplier's HTTP status). It never
carries the supplier's response, a request body, a URL that contains a key, a ciphertext or a stack.

## Wallet & ledger (Phase 5)

Owned by `modules/wallet/`. The Arabic copy below mirrors `modules/wallet/service.ts` and
`modules/wallet/routes.ts` verbatim — keep this table and those files in sync.

| Code | HTTP | ماذا حدث (عربي) | الخطوة التالية (عربي) | English gloss |
|---|---|---|---|---|
| `WALLET_NOT_FOUND` | 404 | المحفظة مش جاهزة على حسابك لسه، وما اتخصمش أي مبلغ. | سجّل دخول من جديد ونجهّزها، ولو فضلت زي ما هي كلّم الدعم. | No wallet for this account — nothing was charged. Sign in again, or contact support. |
| `WALLET_INSUFFICIENT_FUNDS` | 409 | رصيدك مش كافي للعملية دي، وما اتخصمش أي مبلغ. | أضف رصيدًا للمحفظة أو قلّل المبلغ، وبعدين جرّب تاني. | Insufficient balance — nothing was charged. Top up or lower the amount. |
| `WALLET_LIMIT_EXCEEDED` | 422 | المبلغ أكبر من أكبر مبلغ ينفع يتحرك في عملية واحدة، وما اتحركش أي مبلغ. | قسّمه على أكتر من عملية، ولو محتاج حد أعلى كلّم الدعم. | Amount above the single-movement limit — nothing moved. Split it, or contact support. |
| `WALLET_INVALID_CURSOR` | 422 | نقطة القراءة اللي كنت واقف عندها مبقتش صالحة، فعرضنا الصفحة اللي بعدها لسه. | حدّث القائمة وابدأ من الأول. | That list position is no longer valid — reload the list and start again. |
| `WALLET_MOVEMENT_REJECTED` | 409 | دفتر الحسابات رفض الحركة دي، وما اتخصمش وما اتضافش أي مبلغ. | جرّب مرة تانية، ولو اترفضت تاني كلّم الدعم مع رقم المرجع. | The ledger refused this movement — nothing was charged or added. |

`DB_UNAVAILABLE` and `VALIDATION_ERROR` are also answered by the wallet module; both are defined
in the shared table below.

## Pricing engine (Phase 6)

Owned by `modules/pricing/`. The Arabic copy below mirrors `modules/pricing/errors.ts` verbatim —
keep this table and that file in sync. A quote never charges anyone: every message here repeats
that **no money moved**, because the first question a customer asks is whether it did.

| Code | HTTP | ماذا حدث (عربي) | الخطوة التالية (عربي) | English gloss |
|---|---|---|---|---|
| `PRICING_SERVICE_NOT_FOUND` | 404 | الخدمة المطلوبة مش موجودة في القائمة، وما اتخصمش أي مبلغ. | ارجع لقائمة الخدمات واختر خدمة موجودة، ولو فتحت الرابط من مكان قديم حدّث الصفحة. | That service is not in our catalogue — nothing was charged. |
| `PRICING_SERVICE_UNAVAILABLE` | 422 | الخدمة دي مش متاحة للحجز دلوقتي، وما اتخصمش أي مبلغ. | اختر خدمة تانية متاحة، ولو محتاجها بالتحديد كلّم الدعم. | The service is not on sale at the moment — nothing was charged. |
| `PRICING_VARIANT_NOT_FOUND` | 404 | الخيار اللي اخترته مش موجود أو مش متاح في الخدمة دي، وما اتخصمش أي مبلغ. | ارجع للخدمة واختر خيارًا من القائمة المعروضة. | That option is not available for this service — nothing was charged. |
| `PRICING_PRICE_UNAVAILABLE` | 409 | سعر الخدمة دي لسه ما اتحددش من عندنا، فمش قادرين نحسب المبلغ النهائي، وما اتخصمش أي مبلغ. | اختر خدمة تانية متاحة، ولو محتاج الخدمة دي كلّم الدعم يحدّد سعرها. | No price is set for this service yet, so there is no total to show — nothing was charged. |
| `PRICING_QUANTITY_OUT_OF_RANGE` | 422 | الكمية اللي طلبتها بره النطاق المسموح للخدمة دي، وما اتخصمش أي مبلغ. | صحّح الكمية داخل النطاق المعروض للخدمة وجرّب تاني. | The quantity is outside what this service allows — `details` carries `minQuantity` and `maxQuantity`; nothing was charged. |
| `PRICING_ORDER_TOO_SMALL` | 422 | قيمة الطلب أقل من أقل مبلغ نقدر نستقبله، وما اتخصمش أي مبلغ. | زوّد الكمية شوية لحد ما قيمة الطلب تبقى أكبر، وجرّب تاني. | Below the smallest order we accept — `details` carries `orderMinMinor`; nothing was charged. |
| `PRICING_COUPON_NOT_FOUND` | 404 | كود الكوبون ده مش موجود عندنا أو مش مفعّل، وما اتخصمش أي مبلغ. | راجع الكود مظبوط زي ما وصلك، أو كمّل من غير كوبون. | That coupon code does not exist or is inactive — nothing was charged. |
| `PRICING_COUPON_EXPIRED` | 422 | الكوبون ده مش ساري دلوقتي (إما انتهى أو لسه ما بدأش)، وما اتخصمش أي مبلغ. | استخدم كوبونًا ساريًا، أو كمّل من غير كوبون. | The coupon is outside its validity window — nothing was charged. |
| `PRICING_COUPON_SCOPE_MISMATCH` | 422 | الكوبون ده مخصَّص لقسم أو خدمة تانية، وما اتخصمش أي مبلغ. | طبّقه على الخدمة المخصَّص لها، أو كمّل من غير الكوبون. | The coupon belongs to another category or service — nothing was charged. |
| `PRICING_COUPON_MIN_ORDER` | 422 | الكوبون ده بيشتغل لما قيمة الطلب توصل حد أدنى، والطلب الحالي أقل من كده، وما اتخصمش أي مبلغ. | زوّد الكمية لحد ما توصل الحد الأدنى، أو كمّل من غير الكوبون. | The coupon needs a larger order — `details` carries `minOrderMinor`; nothing was charged. |
| `PRICING_COUPON_USAGE_LIMIT` | 409 | الكوبون ده وصل للحد الأقصى لعدد مرات الاستخدام، وما اتخصمش أي مبلغ. | كمّل من غير الكوبون، ولو شايف إن ده غلط كلّم الدعم. | The coupon has reached its maximum number of uses — nothing was charged. |
| `PRICING_COUPON_ALREADY_USED` | 409 | الكوبون ده استخدمته قبل كده، وكل عميل يقدر يستخدمه عدد مرات محدود، وما اتخصمش أي مبلغ. | كمّل من غير الكوبون أو استخدم كودًا تاني. | This customer has already used the coupon as often as allowed — nothing was charged. |

Two of these carry numbers in `details`; both are numbers we computed (`minQuantity`, `maxQuantity`,
`orderMinMinor`, `totalMinor`) and neither is ever our supplier cost. `provider_cost_minor` is not
part of any customer shape: the pricing module builds every public response from named columns, so
a cost cannot leak by accident, and the test suite asserts it on real responses.

## Client-side codes (produced in the browser, never by the API)

| Code | HTTP | ماذا حدث (عربي) | الخطوة التالية (عربي) | English gloss |
|---|---|---|---|---|
| `NETWORK_ERROR` | — | المتصفح ما وصلش للسيرفر، فالطلب ما خرجش من الجهاز أصلاً. | اتأكد من اتصال الإنترنت وجرّب تاني. | The request never left the browser (the API never answers this code). |
| `REQUEST_FAILED` | — | الطلب ما وصلش للسيرفر بالشكل الصحيح، فما اتغيرش أي حاجة. | جرّب تاني، ولو فشل كل مرة كلّم الدعم. | The request failed without an API envelope (the API never answers this code). |

`FORBIDDEN` is the third code a client may see without the API producing a sentence for it: it is
listed once, in the shared table below, because `modules/auth/middleware.ts` owns it.

## Orders (phase 8)

One order, one charge: the order row and the wallet movement commit in the same transaction.

| Code | HTTP | What the customer reads (ar) | What to do next (ar) | Gloss |
|---|---|---|---|---|
| `ORDER_NOT_FOUND` | 404 | مش لاقيين الطلب ده على حسابك. | راجع رقم الطلب، ولو متأكد إنه صح كلّم الدعم. | No such order on this account. |
| `ORDER_TARGET_INVALID` | 422 | الرابط أو اليوزر اللي كتبته مش صالح للخدمة دي. | صلّح الرابط أو اليوزر وأعد المحاولة. | The link/username cannot be used. |
| `ORDER_IDEMPOTENCY_CONFLICT` | 409 | نفس المحاولة اتبعتت قبل كده ببيانات مختلفة، فما اتعملش أي طلب. | ابدأ الطلب من جديد من غير ما تعيد إرسال نفس المحاولة. | The same attempt arrived with different details. |
| `ORDER_NOT_REPEATABLE` | 409 | مش ممكن تكرر الطلب ده: الخدمة اتوقفت أو السعر/المدى اتغيّر. | اختار خدمة تانية أو جرّب تاني بعد شوية. | The order cannot be repeated as-is. |
| `ORDER_DUPLICATE_TARGET` | 409 | عندك طلب مفتوح بالفعل على نفس الرابط ونفس الخدمة. | استنى الطلب الحالي يخلّص، أو كلّم الدعم لو محتاج طلب تاني. | An open order already covers this link. |
| `ORDER_DISPATCH_FAILED` | 503 | مزوّد الخدمة دي مش متاح من عندنا دلوقتي، فما ابعتناش الطلب. | بنجرّب تلقائيًا. لو المشكلة كملت، كلّم الدعم برقم المرجع. | The supplier could not be reached to submit the order. |

The orders module also answers `PRICING_*`, `WALLET_*`, `VALIDATION_ERROR`, `RATE_LIMITED` and the
auth codes: a refusal is always the code of the module that owns the rule, never a new one.

## Payments (phase 9)

Deposits: a gateway reports, we verify against the gateway's own endpoint, and only then does the
ledger move — once, keyed by the payment id. An unsigned notification (Sha7nawy) is never trusted
on its own; a signed one (Heleket) is.

| Code | HTTP | What the customer reads (ar) | What to do next (ar) | Gloss |
|---|---|---|---|---|
| `PAYMENT_NOT_FOUND` | 404 | مش لاقيين عملية الدفع دي على حسابك. | راجع رقم العملية، ولو متأكد إنه صح كلّم الدعم. | No such payment on this account. |
| `PAYMENT_GATEWAY_OFF` | 503 | طريقة الدفع دي متوقفة مؤقتًا. | اختار طريقة دفع تانية، أو جرّب تاني بعد شوية. | That deposit method is switched off. |
| `PAYMENT_GATEWAY_UNCONFIGURED` | 503 | طريقة الدفع دي لسه مش مظبوطة عندنا. | جرّب طريقة تانية، وكلّم الدعم لو كل الطرق واقفة. | The gateway is not configured on our side. |
| `PAYMENT_AMOUNT_OUT_OF_RANGE` | 422 | المبلغ المطلوب أكبر أو أصغر من المسموح. | ادخل مبلغ داخل الحدود المكتوبة في الصفحة. | The amount is outside the allowed range. |
| `PAYMENT_METHOD_INVALID` | 422 | طريقة الدفع المختارة مش متاحة. | اختار واحدة من الطرق المعروضة. | That wallet method is not available. |
| `PAYMENT_WALLET_NUMBER_INVALID` | 422 | رقم المحفظة غلط — لازم 11 رقم زي 01012345678. | اكتب رقم المحفظة صح وجرّب تاني. | The wallet number must be 11 digits. |
| `PAYMENT_ALREADY_RESOLVED` | 409 | عملية الدفع دي اتقفلت خلاص، وما اتغيرش أي حاجة. | راجع حالة العملية، وابعت تذكرة لو محتاج مساعدة. | The payment is already settled. |
| `PAYMENT_PENDING_CONFIRMATION` | 409 | المحفظة لسه ما أكدتش العملية. أكّدها من موبايلك الأول وبعدها اضغط تحديث. | أكّد العملية من موبايلك (مثلاً *9*1# لفودافون) وبعدها اضغط تحديث. | The wallet has not confirmed the payment yet. |
| `PAYMENT_EXPIRED` | 409 | انتهت مدة التأكيد، فالعملية اتلغت وما اتخصمش أي مبلغ. | ابدأ عملية دفع جديدة لو لسه محتاج تشحن. | The confirmation window closed. |
| `PAYMENT_GATEWAY_UNREACHABLE` | 503 | مزوّد الدفع مش متاح دلوقتي، وما اتخصمش أي مبلغ. | استنى شوية وجرّب تاني. | The provider could not be reached. |
| `PAYMENT_GATEWAY_REJECTED` | 502 | مزوّد الدفع رفض الطلب، وما اتخصمش أي مبلغ. | راجع البيانات وجرّب تاني، وكلّم الدعم لو تكررت. | The provider refused the request. |
| `PAYMENT_GATEWAY_AUTH_FAILED` | 503 | بيانات الدخول بتاعتنا عند مزوّد الدفع اترفضت — المشكلة عندنا مش عندك. | كلّم الدعم، وما تعيدش المحاولة دلوقتي. | Our credentials were refused by the provider. |
| `PAYMENT_SIGNATURE_INVALID` | 400 | الإشعار ده مش جاي من مزوّد الدفع، فاتجاهلناه. | مفيش حاجة مطلوبة منك — ده تنبيه داخلي. | The notification did not come from the provider. |

The payments module also answers `WALLET_*` (a credit that the ledger refuses) and the auth and
validation codes.

## Shared codes this module reuses (already defined elsewhere — never redefined here)

| Code | HTTP | Defined by | Note |
|---|---|---|---|
| `AUTH_REQUIRED` | 401 | `modules/auth/middleware.ts` | no or invalid session — سجّل دخول من جديد وكمّل من حيث وقفت |
| `TOKEN_INVALID` | 401 | `modules/auth/middleware.ts` | the sign-in key was refused — اخرج وسجّل دخول من جديد |
| `TOKEN_EXPIRED` | 401 | `modules/auth/middleware.ts` | the session ended after a long pause — سجّل دخول من جديد، ومفيش أي حاجة اتضاعت |
| `ACCOUNT_DISABLED` | 403 | `modules/auth/middleware.ts` | the account is not active — راسل الدعم ونراجع الحساب |
| `FORBIDDEN` | 403 | `modules/auth/middleware.ts` | signed in, but missing the permission (`providers.view` / `providers.manage`) |
| `VALIDATION_ERROR` | 422 | `middleware/validate.ts` | body/params/query failed validation; `details.fields` lists them |
| `DB_UNAVAILABLE` | 503 | `modules/auth/middleware.ts` | the database is not configured or not reachable — the internal marker is mapped to this code before any client sees it |
| `AUTH_NOT_CONFIGURED` | 503 | `modules/auth/middleware.ts` (`AUTH_NOT_CONFIGURED`) | sign-in verification is not configured on the server yet — our side, not the customer's: try again shortly, and contact support if it persists |
| `NOT_FOUND` | 404 | `middleware/error-handler.ts` | unknown route |
| `INTERNAL_ERROR` | 500 | `middleware/error-handler.ts` | unexpected failure; the message is neutral and `ref` is the support reference |
| `RATE_LIMITED` | 429 | `modules/auth/routes.ts` | too many identity requests |

## Adding a code

1. Add it to the module's own code list, where the customer copy for it is written:
   `modules/providers/errors.ts` (`PROVIDER_ERROR_CODES`), `modules/pricing/errors.ts`
   (`PRICING_ERROR_CODES`). The Arabic sentence lives next to the code, never at the call site.
2. Add a row here — what happened, in Arabic, and the next step — **before** the code can be
   answered. A code with no row here does not exist.
3. Add the `ar` + `en` copy to the web catalogue (`apps/web/src/i18n/error-codes.ts`). The checks
   in `apps/web/scripts/check-error-codes.mjs` compare the two catalogues in both directions.
4. Each module's test suite fails if a code is answered without a row here, by design — the suite
   records every code it sees and checks it against this file at the end.
