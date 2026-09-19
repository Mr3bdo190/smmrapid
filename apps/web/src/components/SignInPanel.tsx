import { useState } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { ApiError } from '../lib/api';

type Mode = 'signin' | 'signup' | 'reset';

const COPY: Record<Mode, { title: string; hint: string; submit: string; busy: string }> = {
  signin: {
    title: 'تسجيل الدخول',
    hint: 'ادخل ببريدك وكلمة السر للمتابعة إلى حسابك.',
    submit: 'دخول',
    busy: 'بنتحقق…',
  },
  signup: {
    title: 'حساب جديد',
    hint: 'دقيقة واحدة — من غير أي بيانات دفع، والرصيد بيتضاف بعد تأكيد الدفع فقط.',
    submit: 'إنشاء الحساب',
    busy: 'بننشئ الحساب…',
  },
  reset: {
    title: 'استعادة كلمة السر',
    hint: 'هنبعت رابط إعادة التعيين على بريدك.',
    submit: 'ابعت الرابط',
    busy: 'بنبعت…',
  },
};

/** Maps a server error code to a message that says what to do next — never raw server text. */
function messageFor(error: unknown): string {
  if (error instanceof ApiError) {
    switch (error.code) {
      case 'AUTH_NOT_CONFIGURED':
        return 'خدمة تسجيل الدخول مش متظبطة على السيرفر حاليًا. راسل الدعم.';
      case 'ACCOUNT_DISABLED':
        return 'حسابك موقوف مؤقتًا. راسل الدعم ونرجّعه شغال.';
      case 'RATE_LIMITED':
        return 'محاولات كتير في وقت قصير. استنى دقيقة وجرّب تاني.';
      case 'DB_UNAVAILABLE':
        return 'الخدمة مش متاحة لحظة. جرّب تاني بعد شوية.';
      default:
        return error.message;
    }
  }
  const firebaseCode = String((error as { code?: string })?.code ?? '');
  switch (firebaseCode) {
    case 'auth/invalid-email':
      return 'البريد الإلكتروني ده غير صحيح.';
    case 'auth/missing-password':
      return 'اكتب كلمة السر.';
    case 'auth/weak-password':
      return 'كلمة السر ضعيفة — استخدم ٨ أحرف على الأقل.';
    case 'auth/email-already-in-use':
      return 'البريد ده مستخدم بالفعل. جرّب تسجيل الدخول.';
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'البريد أو كلمة السر غير صحيحة.';
    case 'auth/too-many-requests':
      return 'محاولات كتير. استنى شوية وجرّب تاني.';
    case 'auth/network-request-failed':
      return 'تعذر الاتصال. راجع الإنترنت وجرّب تاني.';
    default:
      return error instanceof Error && error.message ? error.message : 'حصل خطأ. جرّب تاني.';
  }
}

export function SignInPanel() {
  const { signIn, signUp, sendReset, firebaseReady } = useAuth();
  const [mode, setMode] = useState<Mode>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const copy = COPY[mode];

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      if (mode === 'signin') await signIn(email, password);
      else if (mode === 'signup') await signUp(name, email, password);
      else {
        await sendReset(email);
        setNotice('لو البريد مسجّل عندنا، رابط الإعادة في طريقه إليك.');
      }
    } catch (err) {
      setError(messageFor(err));
    } finally {
      setBusy(false);
    }
  }

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
    setNotice(null);
  }

  return (
    <div className="card mx-auto w-full max-w-[440px] p-6">
      <div className="mb-5 flex items-center gap-1 rounded-[var(--radius-sm)] bg-[var(--color-surface-sunken)] p-1">
        {(['signin', 'signup'] as const).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => switchMode(value)}
            className={`h-9 flex-1 rounded-[var(--radius-xs)] text-sm font-semibold transition-colors ${
              mode === value || (mode === 'reset' && value === 'signin')
                ? 'bg-[var(--color-surface)] text-[var(--color-ink)] shadow-[0_1px_0_var(--color-line)]'
                : 'text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]'
            }`}
          >
            {value === 'signin' ? 'دخول' : 'حساب جديد'}
          </button>
        ))}
      </div>

      <h1 className="display text-[22px] font-semibold text-[var(--color-ink)]">{copy.title}</h1>
      <p className="mt-1.5 text-[13px] leading-relaxed text-[var(--color-ink-muted)]">{copy.hint}</p>

      {!firebaseReady && (
        <div className="banner banner-warn mt-4">
          إعدادات Firebase العميلة مش متاحة في هذه النسخة، فتسجيل الدخول معطّل. (الإعدادات تُمرَّر وقت البناء.)
        </div>
      )}

      <form className="mt-5 flex flex-col gap-3.5" onSubmit={submit}>
        {mode === 'signup' && (
          <div>
            <label className="label" htmlFor="auth-name">
              الاسم
            </label>
            <input
              id="auth-name"
              className="field"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="اسمك كما يظهر في حسابك"
              autoComplete="name"
            />
          </div>
        )}

        <div>
          <label className="label" htmlFor="auth-email">
            البريد الإلكتروني
          </label>
          <input
            id="auth-email"
            className="field"
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            dir="ltr"
          />
        </div>

        {mode !== 'reset' && (
          <div>
            <label className="label" htmlFor="auth-password">
              كلمة السر
            </label>
            <input
              id="auth-password"
              className="field"
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="٨ أحرف على الأقل"
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              dir="ltr"
            />
          </div>
        )}

        {error && <div className="banner banner-danger">{error}</div>}
        {notice && <div className="banner banner-ok">{notice}</div>}

        <button className="btn btn-primary mt-1 w-full" type="submit" disabled={busy || !firebaseReady}>
          {busy ? copy.busy : copy.submit}
        </button>
      </form>

      <div className="mt-4 flex items-center justify-between text-[12px]">
        {mode === 'reset' ? (
          <button type="button" className="text-[var(--color-accent-strong)] hover:underline" onClick={() => switchMode('signin')}>
            رجوع لتسجيل الدخول
          </button>
        ) : (
          <button type="button" className="text-[var(--color-accent-strong)] hover:underline" onClick={() => switchMode('reset')}>
            نسيت كلمة السر؟
          </button>
        )}
        <span className="text-[var(--color-ink-faint)]">بياناتك محفوظة عندنا فقط</span>
      </div>
    </div>
  );
}
