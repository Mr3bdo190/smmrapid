
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { apiFetch } from '../../lib/api';
import { Gift } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ClientMysteryBoxes() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
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
      toast.success(`You won $${Number(data.reward).toFixed(4)} from a ${data.tier} box!`);
    },
    onError: (err: any) => toast.error(err.message)
  });

  return (
    <div className="space-y-6 max-w-4xl mx-auto flex flex-col items-center py-10">
      <h2 className="text-3xl font-bold text-gray-900 flex items-center gap-3"><Gift className="text-indigo-600 w-8 h-8"/> Mystery Boxes</h2>
      <p className="text-gray-600 text-center max-w-md">
        Use your keys to open mystery boxes and win random balance rewards! 
        You currently have <strong className="text-indigo-600">{userInfo?.keys || 0} keys</strong>.
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
        {openMutation.isPending ? 'Opening...' : 'Open Box (1 Key)'}
      </button>
      
      {!userInfo?.keys && <p className="text-sm text-red-500 mt-2 font-medium">You need at least 1 key to open a box. Buy orders to earn keys!</p>}
    </div>
  );
}
