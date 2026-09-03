import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { apiFetch } from '../../lib/api';
import { Users, Copy } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ClientAffiliates() {
  const { user } = useAuth();
  
  const { data: stats, isLoading } = useQuery({
    queryKey: ['client-affiliates-stats'],
    queryFn: async () => {
      const token = await user?.getIdToken();
      const res = await apiFetch('/api/client/affiliates/stats', user, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to load stats');
      return res.json();
    },
    enabled: !!user,
  });

  const refLink = stats?.referralCode ? `${window.location.origin}/register?ref=${stats.referralCode}` : '';

  return (
    <div className="space-y-6 max-w-4xl">
      <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><Users className="text-indigo-600"/> Affiliates System</h2>
      
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="font-bold text-lg mb-4 text-gray-900">Your Referral Link</h3>
        <p className="text-sm text-gray-600 mb-4">Share this link with your friends and earn a commission on every deposit they make!</p>
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <input 
            type="text" 
            readOnly 
            value={isLoading ? 'Loading...' : (refLink || 'Generating your referral link...')} 
            className="input-field w-full font-mono text-sm bg-gray-50 flex-1"
          />
          <button 
            onClick={async () => { if (!refLink) return toast.error('Referral link is not ready yet'); try { await navigator.clipboard.writeText(refLink); toast.success('Copied!'); } catch { toast.error('Copy failed'); } }}
            className="btn-primary whitespace-nowrap flex items-center gap-2"
          >
            <Copy className="w-4 h-4"/> Copy Link
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm text-center">
          <h4 className="text-gray-500 text-sm font-medium mb-1">Referral Clicks</h4>
          <p className="text-3xl font-bold text-gray-900">{stats?.clicks || 0}</p>
        </div>
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm text-center">
          <h4 className="text-gray-500 text-sm font-medium mb-1">Signups</h4>
          <p className="text-3xl font-bold text-gray-900">{stats?.signups || 0}</p>
        </div>
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm text-center">
          <h4 className="text-gray-500 text-sm font-medium mb-1">Total Earnings</h4>
          <p className="text-3xl font-bold text-emerald-600">${Number(stats?.totalCommission || 0).toFixed(2)}</p>
        </div>
      </div>
      
      <div className="bg-blue-50 text-blue-800 p-4 rounded-xl border border-blue-100 text-sm">
        <strong>Note:</strong> Commissions are automatically added to your balance as soon as your referrals' payments are approved. 
      </div>
    </div>
  );
}
