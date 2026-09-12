import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { apiFetch } from '../../lib/api';
import { Gift } from 'lucide-react';
import { notify } from '../../lib/notify';
import { useTranslation } from '../../lib/i18n';

export default function ClientMysteryBoxes() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const { data: userInfo } = useQuery({
    queryKey: ['client-user-info'],
    queryFn: async () => {
      const token = await user?.getIdToken();
      const res = await apiFetch('/api/auth/sync', user, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Failed to load data');
      return res.json();
    },
    enabled: !!user,
  });

  const openMutation = useMutation({
    mutationFn: async () => {
      const token = await user?.getIdToken();
      const res = await apiFetch(`/api/client/mystery-boxes/open`, user, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to open box');
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['client-user-info'] });
      notify.success(t('mysteryBoxes.wonReward', { amount: Number(data.reward).toFixed(4), tier: data.tier }));
    },
    onError: (err: any) => notify.error(err.message)
  });

  return (
    <div className="space-y-6 max-w-4xl mx-auto flex flex-col items-center py-10">
      <h2 className="text-3xl font-bold text-gray-900 flex items-center gap-3"><Gift className="text-indigo-600 w-8 h-8"/> {t('mysteryBoxes.title')}</h2>
      <p className="text-gray-600 text-center max-w-md">
        {t('mysteryBoxes.subtitle', { keys: userInfo?.keys || 0 })}
      </p>

      <div className="mt-12 w-64 h-64 bg-gradient-to-tr from-indigo-500 to-purple-600 rounded-2xl shadow-2xl flex items-center justify-center relative overflow-hidden transform hover:scale-105 transition-transform duration-300">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-30"></div>
        <Gift className="w-24 h-24 text-white drop-shadow-md z-10" />
      </div>

      <button
        onClick={() => openMutation.mutate()}
        className="mt-8 px-10 py-4 bg-gray-900 text-white rounded-full font-bold text-lg shadow-lg hover:bg-black transition-colors disabled:opacity-50"
        disabled={openMutation.isPending || !userInfo?.keys}
      >
        {openMutation.isPending ? t('mysteryBoxes.opening') : t('mysteryBoxes.openBox')}
      </button>

      {!userInfo?.keys && <p className="text-sm text-red-500 mt-2 font-medium">{t('mysteryBoxes.needKey')}</p>}
    </div>
  );
}
