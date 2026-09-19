/**
 * Phase 1 status screen.
 *
 * This is deliberately NOT a product page: the public site, dashboard and admin console are
 * built in their own phases. It exists so the build, the stylesheet and the type layer all
 * have something real to compile and render.
 */
export default function App() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center gap-6 p-6">
      <header className="flex flex-col gap-2">
        <p className="text-sm font-medium text-brand-600">Phase 1 · Scaffold</p>
        <h1 className="text-3xl font-bold tracking-tight">SMM Rapid</h1>
        <p className="text-text-muted">
          الهيكل الجديد للمشروع شغال: الـ API، واجهة الويب، الـ CI، وأدوات التحقق. الواجهات
          والصفحات بتُبنى في المراحل التالية.
        </p>
      </header>

      <section className="rounded-[var(--radius-card)] border border-border bg-surface p-5">
        <h2 className="mb-3 text-lg font-semibold">اللي شغال فعليًا الآن</h2>
        <ul className="flex list-inside list-disc flex-col gap-1.5 text-sm text-text-muted">
          <li>
            API: <code>GET /health</code> — يرجع <code>{'{ ok: true }'}</code>
          </li>
          <li>غلاف أخطاء موحّد: <code>{'{ success: false, error: { code, message } }'}</code></li>
          <li>Logger منقّح للأسرار (ممنوع تسجيل أي مفتاح أو توكن)</li>
          <li>Typecheck + Lint + Tests + Build على كل push عبر GitHub Actions</li>
        </ul>
      </section>

      <p className="text-xs text-text-muted">
        قاعدة البيانات و Firebase والدفع والمزودون والواجهات: مراحل 2 وما بعدها.
      </p>
    </main>
  );
}
