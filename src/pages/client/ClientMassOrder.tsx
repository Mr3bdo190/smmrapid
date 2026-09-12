import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { apiFetch } from '../../lib/api';
import { notify } from '../../lib/notify';
import { ListOrdered } from 'lucide-react';
import { useTranslation } from '../../lib/i18n';

export default function ClientMassOrder() {
  const [ordersText, setOrdersText] = useState('');
  const { user } = useAuth();
  const { t } = useTranslation();

  const handleMassOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ordersText.trim()) return notify.error(t('massOrder.pleaseEnter'));

    const token = await user?.getIdToken();
    try {
      const res = await apiFetch('/api/client/orders/mass', user, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ ordersText })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to place orders');
      notify.success(data.message || 'Mass orders processed');
      setOrdersText('');
    } catch (err: any) {
      notify.error(err.message);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><ListOrdered className="text-indigo-600"/> {t('massOrder.title')}</h2>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <form onSubmit={handleMassOrder} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('massOrder.ordersLabel')}</label>
            <textarea
              rows={10}
              value={ordersText}
              onChange={(e) => setOrdersText(e.target.value)}
              className="w-full input-field font-mono text-sm"
              placeholder="service_id | link | quantity\nservice_id | link | quantity"
            />
            <p className="text-xs text-gray-500 mt-2">{t('massOrder.format')}</p>
          </div>
          <button type="submit" className="btn-primary w-full md:w-auto">{t('massOrder.submit')}</button>
        </form>
      </div>
    </div>
  );
}
