import { useState } from 'react';
import { useAuth } from '../auth/AuthProvider';

const formatMoney = (minor: number, currency: string) => {
  const symbol = currency === 'USD' ? '$' : `${currency} `;
  return `${symbol}${(minor / 100).toFixed(2)}`;
};

function Fact({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2.5 hairline last:border-b-0">
      <span className="micro">{label}</span>
      <span className={`text-[13px] text-[var(--color-ink)] ${mono ? 'num' : ''}`}>{value}</span>
    </div>
  );
}

export function AccountPanel() {
  const { account, accountError, refreshAccount, signOutUser } = useAuth();
  const [busy, setBusy] = useState(false);

  async function refresh() {
    setBusy(true);
    try {
      await refreshAccount();
    } finally {
      setBusy(false);
    }
  }

  if (accountError) {
    return (
      <div className="card mx-auto w-full max-w-[560px] p-6">
        <h2 className="display text-[18px] font-semibold">تعذر تحميل بيانات الحساب</h2>
        <p className="mt-2 text-[13px] text-[var(--color-ink-muted)]">
          {accountError.code === 'DB_UNAVAILABLE'
            ? 'قاعدة البيانات مش متاحة في السيرفر حاليًا، فالحساب ما اتقدرش يتحمّل. جرّب تاني بعد شوية.'
            : accountError.message}
        </p>
        {accountError.supportRef && (
          <p className="mt-2 num text-[12px] text-[var(--color-ink-faint)]">ref: {accountError.supportRef}</p>
        )}
        <div className="mt-4 flex gap-2">
          <button className="btn btn-primary" onClick={refresh} disabled={busy}>
            {busy ? 'بنحدّث…' : 'حدّث'}
          </button>
          <button className="btn btn-ghost" onClick={() => void signOutUser()}>
            خروج
          </button>
        </div>
      </div>
    );
  }

  if (!account) {
    return (
      <div className="card mx-auto w-full max-w-[560px] p-6">
        <p className="text-[13px] text-[var(--color-ink-muted)]">بنحمّل بيانات حسابك…</p>
      </div>
    );
  }

  const { user, wallet, roles, permissions } = account;

  return (
    <div className="mx-auto flex w-full max-w-[720px] flex-col gap-4">
      <div className="card p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="micro">الحساب</p>
            <h1 className="display mt-1 truncate text-[22px] font-semibold">
              {user.displayName || user.email.split('@')[0]}
            </h1>
            <p className="mt-1 text-[13px] text-[var(--color-ink-muted)]" dir="ltr">
              {user.email}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className={`pill ${user.emailVerified ? 'pill-ok' : 'pill-warn'}`}>
              {user.emailVerified ? 'البريد مؤكَّد' : 'البريد غير مؤكَّد'}
            </span>
            <span className="pill pill-accent">{user.status === 'active' ? 'نشط' : user.status}</span>
          </div>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="card-tight p-4">
            <p className="micro">رصيد المحفظة</p>
            <p className="num mt-1.5 text-[26px] font-semibold text-[var(--color-ink)]">
              {formatMoney(wallet.balanceMinor, wallet.currency)}
            </p>
            <p className="mt-1 text-[12px] text-[var(--color-ink-muted)]">
              الشحن بيتفتح في مرحلة الدفع — الرصيد يُضاف بعد تأكيد الدفع فقط.
            </p>
          </div>
          <div className="card-tight p-4">
            <p className="micro">الصلاحيات</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {roles.length ? (
                roles.map((role) => (
                  <span key={role} className="pill pill-neutral">
                    {role}
                  </span>
                ))
              ) : (
                <span className="text-[13px] text-[var(--color-ink-muted)]">دور عميل قياسي</span>
              )}
            </div>
            <p className="mt-2 num text-[12px] text-[var(--color-ink-faint)]">
              {permissions.length} permission{permissions.length === 1 ? '' : 's'} · بعضها للأدمن فقط
            </p>
          </div>
        </div>

        <div className="mt-5">
          <p className="micro mb-2">تفاصيل الحساب</p>
          <Fact label="معرّف الحساب" value={user.id.slice(0, 8)} mono />
          <Fact label="كود الإحالة" value={user.referralCode ?? 'لسه مش متولّد'} mono={Boolean(user.referralCode)} />
          <Fact label="تاريخ الإنشاء" value={new Date(user.createdAt).toLocaleDateString('ar-EG')} />
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <button className="btn btn-ghost" onClick={refresh} disabled={busy}>
            {busy ? 'بنحدّث…' : 'حدّث البيانات'}
          </button>
          <button className="btn btn-quiet" onClick={() => void signOutUser()}>
            تسجيل الخروج
          </button>
        </div>
      </div>

      <div className="banner">
        <p className="micro mb-1.5">اللي شغال فعليًا الآن</p>
        <ul className="flex flex-col gap-1 text-[13px]">
          <li>• تسجيل دخول/إنشاء حساب/استعادة كلمة السر بـ Firebase على نفس المشروع الحالي.</li>
          <li>• السيرفر بيتحقق من التوكن بنفسه وينشئ صف الحساب والمحفظة تلقائيًا أول دخول.</li>
          <li>• الأدوار والصلاحيات بتُقرأ من قاعدة البيانات، مش من المتصفح.</li>
        </ul>
      </div>
    </div>
  );
}
