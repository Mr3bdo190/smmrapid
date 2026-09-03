
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { apiFetch } from '../../lib/api';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Send } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ClientTicketView() {
  const { id } = useParams();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState('');

  const { data: ticketData, isLoading } = useQuery({
    queryKey: ['client-ticket', id],
    queryFn: async () => {
      const token = await user?.getIdToken();
      const res = await apiFetch(`/api/client/tickets/${id}`, user, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Failed to load ticket');
      return res.json();
    },
    enabled: !!user && !!id,
  });

  const replyMutation = useMutation({
    mutationFn: async (msg: string) => {
      const token = await user?.getIdToken();
      const res = await apiFetch(`/api/client/tickets/${id}/messages`, user, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ message: msg })
      });
      if (!res.ok) throw new Error('Failed to send message');
      return res.json();
    },
    onSuccess: () => {
      setMessage('');
      queryClient.invalidateQueries({ queryKey: ['client-ticket', id] });
    },
    onError: (err: any) => toast.error(err.message)
  });

  const handleReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    replyMutation.mutate(message);
  };

  if (isLoading) return <div>Loading...</div>;
  if (!ticketData?.ticket) return <div>Ticket not found</div>;

  return (
    <div className="space-y-6 max-w-4xl mx-auto flex flex-col h-[calc(100vh-8rem)]">
      <div className="flex items-center gap-4">
        <Link to="/dashboard/tickets" className="text-gray-500 hover:text-gray-900"><ArrowLeft className="w-5 h-5"/></Link>
        <h2 className="text-2xl font-bold text-gray-900">{ticketData.ticket.subject}</h2>
        <span className="px-2.5 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-medium ml-auto">{ticketData.ticket.status}</span>
      </div>

      <div className="flex-1 overflow-y-auto bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-6 flex flex-col-reverse">
        <div className="space-y-6">
          {ticketData.messages.map((m: any) => (
            <div key={m.id} className={`flex flex-col ${m.isAdmin ? 'items-start' : 'items-end'}`}>
              <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${m.isAdmin ? 'bg-gray-100 text-gray-900' : 'bg-indigo-600 text-white'}`}>
                <p className="text-sm whitespace-pre-wrap">{m.message}</p>
              </div>
              <span className="text-xs text-gray-400 mt-1">{new Date(m.createdAt).toLocaleString()}</span>
            </div>
          ))}
          {ticketData.messages.length === 0 && <p className="text-center text-gray-500">No messages yet. Send one below.</p>}
        </div>
      </div>

      <form onSubmit={handleReply} className="flex gap-2">
        <input 
          type="text" 
          value={message} 
          onChange={e => setMessage(e.target.value)} 
          placeholder="Type your reply..." 
          className="input-primary flex-1"
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
