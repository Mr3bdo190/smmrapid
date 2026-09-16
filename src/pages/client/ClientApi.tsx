import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { apiFetch } from '../../lib/api';
import { Code, Key } from 'lucide-react';
import { notify } from '../../lib/notify';
import { useTranslation } from '../../lib/i18n';

export default function ClientApi() {
  const { user } = useAuth();
  const { t } = useTranslation();

  const [newApiKey, setNewApiKey] = useState('');
  const { data: userData, refetch } = useQuery({
    queryKey: ['client-api-key'],
    queryFn: async () => {
      const token = await user?.getIdToken();
      const res = await apiFetch('/api/client/me', user, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Failed to load account');
      return res.json();
    },
    enabled: !!user,
  });

  const generateApiKey = async () => {
    try {
      const token = await user?.getIdToken();
      const res = await apiFetch('/api/client/api-key/generate', user, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setNewApiKey(data.apiKey);
        notify.success(t('api.generated'));
        refetch();
      } else {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to generate key');
      }
    } catch (err) {
      notify.error(t('api.failedToGenerate'));
    }
  };

  return (
    <div className="space-y-6 max-w-4xl text-on-surface">
      <h2 className="text-2xl font-bold text-on-surface flex items-center gap-2"><Code className="text-indigo-600 dark:text-indigo-400"/> {t('api.title')}</h2>
      <p className="text-sm text-on-surface-variant -mt-4">{t('api.subtitle')}</p>

      <div className="bg-surface-container rounded-xl shadow-sm border-outline-variant p-6">
        <h3 className="font-bold text-lg text-on-surface mb-4 flex items-center gap-2"><Key className="w-5 h-5"/> {t('api.yourKey')}</h3>
        {newApiKey ? (
          <div className="flex items-center gap-4">
            <input
              type="text"
              readOnly
              value={newApiKey}
              className="input-field w-full md:w-96 font-mono text-sm bg-surface-container-low bg-surface-container-high text-on-surface"
            />
            <button
              onClick={() => { navigator.clipboard.writeText(newApiKey); notify.success(t('api.keyCopied')); }}
              className="btn-secondary"
            >
              {t('api.copy')}
            </button>
            <button onClick={generateApiKey} className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline">{t('api.regenerate')}</button>
          </div>
        ) : (
          <div>
            <p className="text-on-surface-variant mb-4">{userData?.apiKeyHash ? t('api.configuredHidden') : t('api.noKeyYet')}</p>
            <button onClick={generateApiKey} className="btn-primary">{t('api.generateKey')}</button>
          </div>
        )}
      </div>

      <div className="bg-surface-container rounded-xl shadow-sm border-outline-variant p-6 space-y-4">
        <h3 className="font-bold text-lg text-on-surface">{t('api.usage')}</h3>
        <p className="text-sm text-on-surface-variant">{t('api.usageDesc')}</p>

        <div className="mt-4">
          <h4 className="font-semibold text-on-surface">{t('api.httpMethod')}</h4>
          <code className="text-sm bg-surface-container-low bg-surface-container-high text-on-surface-variant px-2 py-1 rounded">POST</code>
        </div>
        <div className="mt-4">
          <h4 className="font-semibold text-on-surface">{t('api.apiUrl')}</h4>
          <code className="text-sm bg-surface-container-low bg-surface-container-high text-on-surface-variant px-2 py-1 rounded">{window.location.origin}/api/v2</code>
        </div>

        <div className="mt-6 border-t border-outline-variant pt-4">
          <h4 className="font-semibold text-lg text-on-surface mb-2">{t('api.placeOrderExample')}</h4>
          <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg text-xs overflow-x-auto">
{`{
  "key": "YOUR_API_KEY",
  "action": "add",
  "service": "SERVICE_UUID",
  "link": "https://instagram.com/yourusername",
  "quantity": 1000
}`}
          </pre>
        </div>
      </div>
    </div>
  );
}
