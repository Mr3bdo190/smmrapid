import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { apiFetch } from '../../lib/api';
import { Ticket, Trophy, Clock, Users, Tag } from 'lucide-react';
import { notify } from '../../lib/notify';
import { useTranslation } from '../../lib/i18n';

export default function ClientLottery() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  const { data: raffles = [], isLoading } = useQuery({
    queryKey: ['client-raffles'],
    queryFn: async () => {
      const token = await user?.getIdToken();
      const res = await apiFetch('/api/client/raffles', user, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Failed to load raffles');
      return res.json();
    },
    enabled: !!user,
    refetchInterval: 15000
  });

  const buyMutation = useMutation({
    mutationFn: async ({ id, qty }: { id: string, qty: number }) => {
      const token = await user?.getIdToken();
      const res = await apiFetch(`/api/client/raffles/${id}/buy`, user, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ qty })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to buy ticket');
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-user-info'] });
      queryClient.invalidateQueries({ queryKey: ['client-raffles'] });
      notify.success(t('lottery.ticketsPurchased'));
    },
    onError: (err: any) => notify.error(err.message)
  });

  if (isLoading) {
    return <div className="p-8 text-center text-gray-500">{t('lottery.loading')}</div>;
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><Ticket className="text-indigo-600"/> {t('lottery.title')}</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {raffles.map((r: any) => {
          const qty = quantities[r.id] || 1;
          const isEnded = new Date() > new Date(r.endDate);
          const isOpen = r.status === 'Open' && !isEnded;
          const isMaxedOut = r.maxTickets && r.ticketsCount >= r.maxTickets;
          const canBuy = isOpen && !isMaxedOut;

          return (
            <div key={r.id} className={`relative overflow-hidden rounded-2xl shadow-sm border p-6 ${r.status === 'Drawn' ? 'bg-indigo-50 border-indigo-100' : 'bg-white border-gray-100'}`}>
              <div className="absolute top-4 right-4 flex flex-col items-end gap-2">
                <span className={`px-3 py-1 text-xs font-bold rounded-full uppercase tracking-wide
                  ${r.status === 'Open' && !isEnded ? 'bg-emerald-100 text-emerald-800' :
                    r.status === 'Drawn' ? 'bg-indigo-100 text-indigo-800' :
                    'bg-gray-100 text-gray-800'}`}>
                  {r.status === 'Open' && isEnded ? t('lottery.endedWaitingDraw') : r.status}
                </span>
                {r.userTicketsCount > 0 && (
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded shadow-sm">
                    {t('lottery.youHaveTickets', { count: r.userTicketsCount })}
                  </span>
                )}
              </div>

              <div className="pr-24">
                <h3 className="font-bold text-xl text-gray-900 mb-1">{r.title || t('lottery.weeklyRaffle')}</h3>
                <div className="text-3xl font-black text-indigo-600 mb-4">
                  ${Number(r.prizeAmount).toFixed(2)} <span className="text-sm font-medium text-gray-500 line-through ml-2">{t('lottery.prizePool')}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="flex items-center gap-2 text-gray-600">
                  <Tag className="w-4 h-4 text-gray-400" />
                  <span className="text-sm font-medium">${Number(r.ticketPrice).toFixed(2)} {t('lottery.perTicket')}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <Clock className="w-4 h-4 text-gray-400" />
                  <span className="text-sm font-medium">{new Date(r.endDate).toLocaleDateString()} {new Date(r.endDate).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <Users className="w-4 h-4 text-gray-400" />
                  <span className="text-sm font-medium">{r.ticketsCount} {r.maxTickets ? `/ ${r.maxTickets}` : ''} {t('lottery.sold')}</span>
                </div>
                {r.maxTicketsPerUser && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <Ticket className="w-4 h-4 text-gray-400" />
                    <span className="text-sm font-medium">{t('lottery.maxPerUser', { count: r.maxTicketsPerUser })}</span>
                  </div>
                )}
              </div>

              {r.status === 'Drawn' && r.winnerEmail ? (
                <div className="mt-4 p-4 bg-indigo-100 rounded-xl border border-indigo-200 flex items-center justify-center gap-3">
                  <Trophy className="w-6 h-6 text-indigo-600" />
                  <div>
                    <p className="text-sm text-indigo-900 font-bold">{t('lottery.winnerAnnounced')}</p>
                    <p className="text-indigo-800 text-sm">{r.winnerEmail}</p>
                  </div>
                </div>
              ) : (
                <div className="mt-4 flex gap-3">
                  <select
                    value={qty}
                    onChange={e => setQuantities({...quantities, [r.id]: parseInt(e.target.value)})}
                    disabled={!canBuy || buyMutation.isPending}
                    className="input-primary w-24 text-center disabled:opacity-50 disabled:bg-gray-50 cursor-pointer bg-gray-50"
                  >
                    {[1, 2, 3, 5, 10].map(n => (
                      <option key={n} value={n}>{n} {t('lottery.tix')}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => buyMutation.mutate({ id: r.id, qty })}
                    className="flex-1 btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={!canBuy || buyMutation.isPending}
                  >
                    {isEnded ? t('lottery.raffleEnded') :
                     isMaxedOut ? t('lottery.soldOut') :
                     r.status !== 'Open' ? t('lottery.notAvailable') :
                     buyMutation.isPending ? t('lottery.purchasing') :
                     t('lottery.buyFor', { amount: (Number(r.ticketPrice) * qty).toFixed(2) })}
                  </button>
                </div>
              )}
            </div>
          );
        })}
        {raffles.length === 0 && (
          <div className="col-span-2 text-center p-12 bg-white rounded-xl border border-gray-100 shadow-sm">
            <Ticket className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-gray-900">{t('lottery.noActiveRaffles')}</h3>
            <p className="text-gray-500 mt-2">{t('lottery.checkBackLater')}</p>
          </div>
        )}
      </div>
    </div>
  );
}
