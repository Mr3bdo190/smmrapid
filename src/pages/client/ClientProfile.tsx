import { useAuth } from '../../contexts/AuthContext';
import { User } from 'lucide-react';
import { useTranslation } from '../../lib/i18n';

export default function ClientProfile() {
  const { dbUser } = useAuth();
  const { t } = useTranslation();
  if (!dbUser) return null;

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
        <User className="w-6 h-6 text-indigo-600" /> {t('nav.profile')}
      </h2>
      <p className="text-sm text-gray-500 -mt-6">{t('profile.subtitle')}</p>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <p className="text-xs text-gray-500 uppercase font-semibold">{t('profile.accountId')}</p>
          <p className="text-gray-900 font-medium truncate">{dbUser.id.substring(0,8)}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <p className="text-xs text-gray-500 uppercase font-semibold">{t('common.status')}</p>
          <p className="text-gray-900 font-medium capitalize">{dbUser.status}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <p className="text-xs text-gray-500 uppercase font-semibold">{t('profile.memberSince')}</p>
          <p className="text-gray-900 font-medium">{new Date(dbUser.createdAt).toLocaleDateString()}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <p className="text-xs text-gray-500 uppercase font-semibold">{t('common.balance')}</p>
          <p className="text-gray-900 font-medium">${Number(dbUser.balance).toFixed(4)}</p>
        </div>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="font-semibold text-gray-900 mb-4">{t('profile.email')}</h3>
        <input type="text" readOnly value={dbUser.email} className="input-primary w-full bg-gray-50" />
      </div>
    </div>
  );
}
