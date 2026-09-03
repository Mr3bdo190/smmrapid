import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Mail, LifeBuoy } from 'lucide-react';
import toast from 'react-hot-toast';
import PublicPageShell from './PublicPageShell';
import { useTranslation } from '../lib/i18n';

export default function Contact() {
  const { t } = useTranslation();
  const { data: config } = useQuery({
    queryKey: ['client-config'],
    queryFn: async () => { const res = await fetch('/api/client/config'); if (!res.ok) throw new Error('API Error'); return res.json(); }
  });

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/public/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, subject, message }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || t('contact.error'));
      return data;
    },
    onSuccess: () => { setSent(true); setName(''); setEmail(''); setSubject(''); setMessage(''); },
    onError: (e: any) => toast.error(e.message || t('contact.error')),
  });

  return (
    <PublicPageShell title={t('contact.title')}>
      <p>{t('contact.subtitle')}</p>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <Mail className="w-5 h-5 text-amber-400 mb-2" />
          <h3 className="text-slate-100 font-semibold mb-1">{t('contact.emailLabel')}</h3>
          {config?.supportEmail ? (
            <a href={`mailto:${config.supportEmail}`} className="text-amber-400 text-sm hover:underline break-all">{config.supportEmail}</a>
          ) : (
            <p className="text-slate-500 text-sm">{t('contact.emailNotConfigured')}</p>
          )}
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <LifeBuoy className="w-5 h-5 text-amber-400 mb-2" />
          <h3 className="text-slate-100 font-semibold mb-1">{t('contact.existingCustomer')}</h3>
          <p className="text-slate-500 text-sm mb-2">{t('contact.openTicket')}</p>
          <Link to="/" className="text-amber-400 text-sm hover:underline">{t('contact.signInLink')}</Link>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
        <h3 className="text-slate-100 font-semibold mb-4">{t('contact.formTitle')}</h3>
        {sent ? (
          <p className="text-emerald-400 text-sm">{t('contact.success')}</p>
        ) : (
          <form onSubmit={e => { e.preventDefault(); mutation.mutate(); }} className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">{t('contact.name')}</label>
                <input value={name} onChange={e => setName(e.target.value)} required maxLength={100} className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg outline-none text-slate-100 focus:border-amber-400/50 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">{t('common.email')}</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} required maxLength={200} className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg outline-none text-slate-100 focus:border-amber-400/50 text-sm" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">{t('contact.subject')}</label>
              <input value={subject} onChange={e => setSubject(e.target.value)} required maxLength={200} className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg outline-none text-slate-100 focus:border-amber-400/50 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">{t('contact.message')}</label>
              <textarea value={message} onChange={e => setMessage(e.target.value)} required minLength={10} maxLength={5000} rows={5} className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg outline-none text-slate-100 focus:border-amber-400/50 text-sm resize-none" />
            </div>
            <button type="submit" disabled={mutation.isPending} className="px-6 py-2.5 text-sm font-semibold text-[#0B0F17] bg-amber-400 rounded-lg hover:bg-amber-300 transition-colors disabled:opacity-50">
              {mutation.isPending ? t('contact.sending') : t('contact.sendMessage')}
            </button>
          </form>
        )}
      </div>
    </PublicPageShell>
  );
}
