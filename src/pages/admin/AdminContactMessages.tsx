import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { apiFetch } from '../../lib/api';
import { Mail } from 'lucide-react';
import { useState } from 'react';

interface ContactMessage { id: string; name: string; email: string; subject: string; message: string; status: 'New' | 'Read' | 'Replied'; createdAt: string; }

export default function AdminContactMessages() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [openId, setOpenId] = useState<string | null>(null);

  const { data: messages = [] } = useQuery({
    queryKey: ['admin-contact-messages'],
    queryFn: async () => {
      const token = await user?.getIdToken();
      const res = await apiFetch('/api/admin/contact-messages', user, { headers: { Authorization: `Bearer ${token}` } });
      return res.ok ? res.json() as Promise<ContactMessage[]> : [];
    },
    enabled: !!user,
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const token = await user?.getIdToken();
      const res = await apiFetch(`/api/admin/contact-messages/${id}/status`, user, { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ status }) });
      if (!res.ok) throw new Error('Failed to update');
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-contact-messages'] }),
  });

  const open = (m: ContactMessage) => {
    setOpenId(openId === m.id ? null : m.id);
    if (m.status === 'New') updateStatus.mutate({ id: m.id, status: 'Read' });
  };

  return (
    <div className="space-y-6">
      <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2"><Mail className="w-5 h-5" /> Contact Messages</h3>
      <p className="text-sm text-gray-500">Messages sent through the public Contact page by visitors who don't have an account yet.</p>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden divide-y divide-gray-100">
        {messages.map((m) => (
          <div key={m.id}>
            <button onClick={() => open(m)} className="w-full text-left px-6 py-4 hover:bg-gray-50/50 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900 truncate">{m.subject}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${m.status === 'New' ? 'bg-amber-100 text-amber-700' : m.status === 'Replied' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>{m.status}</span>
                </div>
                <div className="text-sm text-gray-500 truncate">{m.name} &lt;{m.email}&gt;</div>
              </div>
              <span className="text-xs text-gray-400 whitespace-nowrap">{new Date(m.createdAt).toLocaleString()}</span>
            </button>
            {openId === m.id && (
              <div className="px-6 pb-4">
                <p className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 rounded-lg p-4">{m.message}</p>
                <div className="flex items-center gap-3 mt-3">
                  <a href={`mailto:${m.email}?subject=${encodeURIComponent('Re: ' + m.subject)}`} className="text-sm text-indigo-600 hover:underline">Reply by email</a>
                  {m.status !== 'Replied' && (
                    <button onClick={() => updateStatus.mutate({ id: m.id, status: 'Replied' })} className="text-sm text-gray-500 hover:text-gray-900">Mark as replied</button>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
        {messages.length === 0 && <div className="px-6 py-8 text-center text-gray-500">No messages yet.</div>}
      </div>
    </div>
  );
}
