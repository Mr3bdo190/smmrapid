import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { apiFetch } from '../../lib/api';
import toast from 'react-hot-toast';
import { Save } from 'lucide-react';

export default function AdminSettings() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [siteName, setSiteName] = useState('smmrapid.store');
  const [currencySymbol, setCurrencySymbol] = useState('$');
  const [vodafoneCashNumber, setVodafoneCashNumber] = useState('');
  const [siteDescription, setSiteDescription] = useState('');
  const [supportEmail, setSupportEmail] = useState('');
  const [siteLogo, setSiteLogo] = useState('');
  const [affiliateComm, setAffiliateComm] = useState('5');

  const { data: settings } = useQuery({
    queryKey: ['admin-settings'],
    queryFn: async () => {
      const token = await user?.getIdToken();
      const res = await apiFetch('/api/admin/settings', user, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Failed to load data');
      return res.json();
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (settings) {
      if (settings.site_name) setSiteName(settings.site_name);
      if (settings.currency_symbol) setCurrencySymbol(settings.currency_symbol);
      if (settings.vodafone_cash_number) setVodafoneCashNumber(settings.vodafone_cash_number);
      if (settings.site_description) setSiteDescription(settings.site_description);
      if (settings.support_email) setSupportEmail(settings.support_email);
      if (settings.site_logo) setSiteLogo(settings.site_logo);
      if (settings.affiliate_commission_percentage) setAffiliateComm(settings.affiliate_commission_percentage);
    }
  }, [settings]);

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      const token = await user?.getIdToken();
      const res = await apiFetch('/api/admin/settings', user, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error('Failed to update settings');
      return res.json();
    },
    onSuccess: () => {
      toast.success('Settings updated');
      queryClient.invalidateQueries({ queryKey: ['admin-settings'] });
    }
  });

  const handleSave = () => {
    updateMutation.mutate({
      site_name: siteName,
      currency_symbol: currencySymbol,
      vodafone_cash_number: vodafoneCashNumber,
      site_description: siteDescription,
      support_email: supportEmail,
      site_logo: siteLogo,
      affiliate_commission_percentage: affiliateComm,
    });
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold text-gray-900 tracking-tight">Settings</h3>
        <button onClick={handleSave} className="btn-primary flex items-center gap-2"><Save className="w-4 h-4" /> Save Settings</button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Site Name</label>
          <input type="text" value={siteName} onChange={e => setSiteName(e.target.value)} className="input-primary w-full" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Site Description (SEO)</label>
          <input type="text" value={siteDescription} onChange={e => setSiteDescription(e.target.value)} className="input-primary w-full" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Currency Symbol</label>
            <input type="text" value={currencySymbol} onChange={e => setCurrencySymbol(e.target.value)} className="input-primary w-full" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Support Email</label>
            <input type="email" value={supportEmail} onChange={e => setSupportEmail(e.target.value)} className="input-primary w-full" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Site Logo URL</label>
          <input type="url" value={siteLogo} onChange={e => setSiteLogo(e.target.value)} className="input-primary w-full" placeholder="https://..." />
        </div>
        
        <div className="border-t pt-6">
          <h4 className="text-sm font-bold text-gray-900 mb-4">Affiliate System</h4>
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">Commission Percentage (%)</label>
            <input type="number" step="0.1" value={affiliateComm} onChange={e => setAffiliateComm(e.target.value)} className="input-primary w-full max-w-xs" />
            <p className="text-xs text-gray-500 mt-1">Percentage earned by affiliates on approved payments.</p>
          </div>
        </div>
        <div className="border-t pt-6">
          <h4 className="text-sm font-bold text-gray-900 mb-4">Payment Methods Settings</h4>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Vodafone Cash Number</label>
            <input type="text" value={vodafoneCashNumber} onChange={e => setVodafoneCashNumber(e.target.value)} className="input-primary w-full" placeholder="e.g. 010xxxxxxxx" />
            <p className="text-xs text-gray-500 mt-1">This number will be displayed to clients when they choose to add funds via Vodafone Cash.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
