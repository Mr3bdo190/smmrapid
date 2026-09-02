import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { Code, Key } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ClientApi() {
  const { user } = useAuth();

  const [newApiKey, setNewApiKey] = useState('');
  const { data: userData, refetch } = useQuery({
    queryKey: ['client-api-key'],
    queryFn: async () => {
      const token = await user?.getIdToken();
      const res = await fetch('/api/client/me', { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Failed to load account');
      return res.json();
    },
    enabled: !!user,
  });

  const generateApiKey = async () => {
    try {
      const token = await user?.getIdToken();
      const res = await fetch('/api/client/api-key/generate', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setNewApiKey(data.apiKey);
        toast.success('API Key generated. Save it now; it will not be shown again.');
        refetch();
      } else {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to generate key');
      }
    } catch (err) {
      toast.error('Failed to generate key');
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><Code className="text-indigo-600"/> API Documentation</h2>
      
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><Key className="w-5 h-5"/> Your API Key</h3>
        {newApiKey ? (
          <div className="flex items-center gap-4">
            <input 
              type="text" 
              readOnly 
              value={newApiKey} 
              className="input-field w-full md:w-96 font-mono text-sm bg-gray-50"
            />
            <button 
              onClick={() => { navigator.clipboard.writeText(newApiKey); toast.success('Copied!'); }}
              className="btn-secondary"
            >
              Copy
            </button>
            <button onClick={generateApiKey} className="text-sm text-indigo-600 hover:underline">Regenerate</button>
          </div>
        ) : (
          <div>
            <p className="text-gray-500 mb-4">{userData?.apiKeyHash ? 'Your API key is configured and hidden for security. Generate a new key to replace it.' : 'You do not have an API key yet.'}</p>
            <button onClick={generateApiKey} className="btn-primary">Generate API Key</button>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
        <h3 className="font-bold text-lg">API Usage</h3>
        <p className="text-sm text-gray-600">Our API allows you to place orders and check status programmatically.</p>
        
        <div className="mt-4">
          <h4 className="font-semibold text-gray-900">HTTP Method</h4>
          <code className="text-sm bg-gray-100 px-2 py-1 rounded">POST</code>
        </div>
        <div className="mt-4">
          <h4 className="font-semibold text-gray-900">API URL</h4>
          <code className="text-sm bg-gray-100 px-2 py-1 rounded">{window.location.origin}/api/v1</code>
        </div>

        <div className="mt-6 border-t pt-4">
          <h4 className="font-semibold text-lg text-gray-900 mb-2">Place Order Example</h4>
          <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg text-xs overflow-x-auto">
{`{
  "key": "YOUR_API_KEY",
  "action": "add",
  "service": "SERVICE_UUID",
  "link": "https://example.com",
  "quantity": 1000
}`}
          </pre>
        </div>
      </div>
    </div>
  );
}
