
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { apiFetch } from '../../lib/api';
import { Link2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ClientShortlinks() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [claimTokens, setClaimTokens] = useState<Record<string, string>>({});
  
  const { data: shortlinks = [] } = useQuery({
    queryKey: ['client-shortlinks'],
    queryFn: async () => {
      const token = await user?.getIdToken();
      const res = await apiFetch('/api/client/shortlinks', user, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Failed to load data');
      return res.json();
    },
    enabled: !!user,
  });

  const startMutation = useMutation({
    mutationFn: async (id: string) => {
      const token = await user?.getIdToken();
      const res = await apiFetch(`/api/client/shortlinks/${id}/start`, user, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to start');
      window.open(data.url, '_blank', 'noopener,noreferrer');
      setClaimTokens(prev => ({ ...prev, [id]: data.token }));
      return data;
    },
    onError: (err: any) => toast.error(err.message)
  });

  const claimMutation = useMutation({
    mutationFn: async ({ id, token: claimToken }: { id: string; token: string }) => {
      const token = await user?.getIdToken();
      const res = await apiFetch(`/api/client/shortlinks/${id}/claim`, user, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ token: claimToken })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to claim');
      return data;
    },
    onSuccess: () => {
      toast.success('Reward claimed successfully!');
      queryClient.invalidateQueries({ queryKey: ['client-user-info'] });
      queryClient.invalidateQueries({ queryKey: ['client-shortlinks'] });
    },
    onError: (err: any) => toast.error(err.message)
  });

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><Link2 className="text-indigo-600"/> Earn via Shortlinks</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {shortlinks.map((sl: any) => (
          <div key={sl.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col items-center text-center">
            <h3 className="font-bold text-lg text-gray-900 mb-2">{sl.name}</h3>
            <p className="text-sm text-gray-500 mb-4">Reward: ${Number(sl.rewardAmount).toFixed(4)}</p>
            <div className="flex gap-2 w-full">
              <button onClick={() => startMutation.mutate(sl.id)} disabled={startMutation.isPending || sl.claimed} className="flex-1 btn-secondary text-center disabled:opacity-50">
                {sl.claimed ? 'Claimed' : 'Visit'}
              </button>
              <button onClick={() => claimMutation.mutate({ id: sl.id, claimToken: claimTokens[sl.id] || '' })} disabled={claimMutation.isPending || sl.claimed || !claimTokens[sl.id]} className="flex-1 btn-primary disabled:opacity-50">Claim</button>
            </div>
          </div>
        ))}
        {shortlinks.length === 0 && <p className="text-gray-500 col-span-3">No active shortlinks currently available.</p>}
      </div>
    </div>
  );
}
