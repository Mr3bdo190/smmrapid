
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { apiFetch } from '../../lib/api';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Send, CheckCircle } from 'lucide-react';
import { notify } from '../../lib/notify';

export default function AdminTicketView() {
  const { id } = useParams();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState('');

  const { data: ticketData, isLoading } = useQuery({
    queryKey: ['admin-ticket', id],
    queryFn: async () => {
      const token = await user?.getIdToken();
      const res = await apiFetch(`/api/admin/tickets/${id}`, user, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Failed to load ticket');
      return res.json();
    },
    enabled: !!user && !!id,
  });

  const replyMutation = useMutation({
    mutationFn: async (msg: string) => {
      const token = await user?.getIdToken();
      const res = await apiFetch(`/api/admin/tickets/${id}/messages`, user, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ message: msg })
      });
      if (!res.ok) throw new Error('Failed to send message');
      return res.json();
    },
    onSuccess: () => {
      setMessage('');
      queryClient.invalidateQueries({ queryKey: ['admin-ticket', id] });
    }
  });

  const statusMutation = useMutation({
    mutationFn: async (newStatus: string) => {
      const token = await user?.getIdToken();
      const res = await apiFetch(`/api/admin/tickets/${id}/status`, user, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: newStatus })
      });
      return res.json();
    },
    onSuccess: (_, newStatus) => {
      notify.success(`Ticket ${newStatus.toLowerCase()}`);
      queryClient.invalidateQueries({ queryKey: ['admin-ticket', id] });
      queryClient.invalidateQueries({ queryKey: ['admin-tickets'] });
    }
  });

  const handleReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    replyMutation.mutate(message);
  };

  if (isLoading) return <div className="p-6 text-on-surface-variant">Loading...</div>;
  if (!ticketData?.ticket) return <div className="p-6 text-on-surface-variant">Ticket not found</div>;

  return (
    <div className="space-y-6 max-w-4xl mx-auto flex-col h-[calc(100vh-8rem)]">
      <div className="flex items-center gap-4">
        <Link to="/admin/tickets" className="text-on-surface-variant hover:text-on-surface dark:hover:text-gray-200"><ArrowLeft className="w-5 h-5"/></Link>
        <div>
          <h2 className="text-xl font-bold text-on-surface">{ticketData.ticket.subject}</h2>
          <p className="text-sm text-on-surface-variant">User: {ticketData.ticket.user?.email}</p>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <span className="px-2.5 py-1 bg-surface-container-high text-on-surface rounded-full text-xs font-medium">{ticketData.ticket.status}</span>
          {ticketData.ticket.status !== 'Closed' ? (
            <button onClick={() => statusMutation.mutate('Closed')} className="btn-secondary flex items-center gap-2"><CheckCircle className="w-4 h-4"/> Close Ticket</button>
          ) : (
            <button onClick={() => statusMutation.mutate('Open')} className="btn-primary flex items-center gap-2">Reopen Ticket</button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-surface-container rounded-xl shadow-sm border border-outline-variant p-6 space-y-6 flex-col-reverse">
        <div className="space-y-6">
          {ticketData.messages.map((m: any) => (
            <div key={m.id} className={`flex-col ${!m.isAdmin ? 'items-start' : 'items-end'}`}>
              <div className={`max-w-[80%] rounded-xl px-4 py-3 ${!m.isAdmin ? 'bg-surface-container-high text-on-surface' : 'bg-indigo-600 text-white'}`}>
                <p className="text-sm whitespace-pre-wrap">{m.message}</p>
              </div>
              <span className="text-xs text-outline mt-1">{new Date(m.createdAt).toLocaleString()}</span>
            </div>
          ))}
          {ticketData.messages.length === 0 && <p className="text-center text-on-surface-variant">No messages yet.</p>}
        </div>
      </div>

      <form onSubmit={handleReply} className="flex gap-2">
        <input 
          type="text" 
          value={message} 
          onChange={e => setMessage(e.target.value)} 
          placeholder="Type admin reply..." 
          className="input-primary flex-1 bg-surface-container-high border border-outline-variant text-on-surface"
          disabled={ticketData.ticket.status === 'Closed' || replyMutation.isPending}
        />
        <button 
          type="submit" 
          disabled={ticketData.ticket.status === 'Closed' || replyMutation.isPending}
          className="btn-primary flex items-center justify-center disabled:opacity-50"
        >
          <Send className="w-4 h-4"/>
        </button>
      </form>
    </div>
  );
}
