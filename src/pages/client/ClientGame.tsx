
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { Gamepad2, Coins, Key } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ClientGame() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const { data: userInfo } = useQuery({
    queryKey: ['client-user-info'],
    queryFn: async () => {
      const token = await user?.getIdToken();
      const res = await fetch('/api/auth/sync', { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
      return res.json();
    },
    enabled: !!user,
  });

  const claimMutation = useMutation({
    mutationFn: async () => {
      const token = await user?.getIdToken();
      const res = await fetch('/api/client/game/claim', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to claim');
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['client-user-info'] });
      toast.success(`Claimed ${data.points} points!`);
    },
    onError: (err: any) => toast.error(err.message)
  });

  const exchangeMutation = useMutation({
    mutationFn: async () => {
      const token = await user?.getIdToken();
      const res = await fetch('/api/client/game/exchange', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to exchange');
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-user-info'] });
      toast.success(`Exchanged 100 points for 1 Key!`);
    },
    onError: (err: any) => toast.error(err.message)
  });

  const canClaim = !userInfo?.lastClaimDate || (new Date().getTime() - new Date(userInfo.lastClaimDate).getTime()) > (24 * 60 * 60 * 1000);

  return (
    <div className="space-y-6 max-w-4xl mx-auto py-8">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900 flex items-center gap-3"><Gamepad2 className="text-indigo-600 w-8 h-8"/> Rewards Hub</h2>
        <div className="flex gap-4">
          <div className="bg-amber-100 text-amber-800 px-4 py-2 rounded-lg font-bold flex items-center gap-2">
            <Coins className="w-5 h-5"/> {userInfo?.gamePoints || 0} Points
          </div>
          <div className="bg-purple-100 text-purple-800 px-4 py-2 rounded-lg font-bold flex items-center gap-2">
            <Key className="w-5 h-5"/> {userInfo?.keys || 0} Keys
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 flex flex-col items-center text-center">
          <div className="w-20 h-20 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mb-6">
            <Coins className="w-10 h-10"/>
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Daily Claim</h3>
          <p className="text-gray-500 mb-6">Claim free points every 24 hours. Keep your streak alive for bonus points!</p>
          <div className="text-sm font-semibold text-indigo-600 mb-6">Current Streak: {userInfo?.currentStreak || 0} days</div>
          <button 
            onClick={() => claimMutation.mutate()}
            disabled={!canClaim || claimMutation.isPending}
            className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold transition-colors disabled:opacity-50"
          >
            {claimMutation.isPending ? 'Claiming...' : (canClaim ? 'Claim Daily Points' : 'Already Claimed Today')}
          </button>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 flex flex-col items-center text-center">
          <div className="w-20 h-20 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center mb-6">
            <Key className="w-10 h-10"/>
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Exchange Shop</h3>
          <p className="text-gray-500 mb-6">Trade 100 points for 1 Mystery Box Key. Use keys in the Mystery Boxes page to win balance!</p>
          <div className="flex-1"></div>
          <button 
            onClick={() => exchangeMutation.mutate()}
            disabled={(userInfo?.gamePoints || 0) < 100 || exchangeMutation.isPending}
            className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold transition-colors disabled:opacity-50"
          >
            Exchange 100 Points - &gt; 1 Key
          </button>
        </div>
      </div>
    </div>
  );
}
