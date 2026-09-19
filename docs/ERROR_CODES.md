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

## Shared codes this module reuses (already defined elsewhere — never redefined here)

| Code | HTTP | Defined by | Note |
|---|---|---|---|
| `AUTH_REQUIRED` | 401 | `modules/auth/middleware.ts` | no or invalid session — سجّل دخول من جديد وكمّل من حيث وقفت |
| `TOKEN_INVALID` | 401 | `modules/auth/middleware.ts` | the sign-in key was refused — اخرج وسجّل دخول من جديد |
| `TOKEN_EXPIRED` | 401 | `modules/auth/middleware.ts` | the session ended after a long pause — سجّل دخول من جديد، ومفيش أي حاجة اتضاعت |
| `ACCOUNT_DISABLED` | 403 | `modules/auth/middleware.ts` | the account is not active — راسل الدعم ونراجع الحساب |
| `FORBIDDEN` | 403 | `modules/auth/middleware.ts` | signed in, but missing the permission (`providers.view` / `providers.manage`) |
| `VALIDATION_ERROR` | 422 | `middleware/validate.ts` | body/params/query failed validation; `details.fields` lists them |
| `DB_UNAVAILABLE` | 503 | `modules/auth/middleware.ts` (`DB_NOT_CONFIGURED`) | the database is not configured/reachable |
| `NOT_FOUND` | 404 | `middleware/error-handler.ts` | unknown route |
| `INTERNAL_ERROR` | 500 | `middleware/error-handler.ts` | unexpected failure; the message is neutral and `ref` is the support reference |
| `RATE_LIMITED` | 429 | `modules/auth/routes.ts` | too many identity requests |

## Adding a code

1. Add it to the module's code list (`modules/providers/errors.ts` → `PROVIDER_ERROR_CODES`).
2. Add a row here, in Arabic, with the next step — before it can be answered.
3. The provider test suite fails if a code is answered without a row here, by design.
