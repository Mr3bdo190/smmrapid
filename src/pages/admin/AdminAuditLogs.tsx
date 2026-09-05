import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { apiFetch } from '../../lib/api';
import { History, RefreshCw } from 'lucide-react';
import Pagination from '../../components/Pagination';

export default function AdminAuditLogs() {
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const { data = { items: [], totalPages: 1 }, refetch } = useQuery({
    queryKey: ['admin-audit', page], enabled: !!user,
    queryFn: async () => {
      const token = await user!.getIdToken();
      const res = await apiFetch(`/api/admin/audit?page=${page}&pageSize=25`, user, { headers: { Authorization: `Bearer ${token}` } });
      return res.ok ? res.json() : { items: [], totalPages: 1 };
    }
  });
  return <div className="space-y-5">
    <div className="flex justify-between"><h3 className="text-xl font-bold flex items-center gap-2"><History className="w-5 h-5"/> Audit Logs</h3><button className="btn-secondary" onClick={() => refetch()}><RefreshCw className="w-4 h-4 inline mr-1"/>Refresh</button></div>
    <div className="bg-white border rounded-xl overflow-x-auto"><table className="min-w-full"><thead className="bg-gray-50"><tr>{['Date','Admin ID','Action','Entity','Details'].map(h => <th key={h} className="px-4 py-3 text-left text-xs text-gray-500 uppercase">{h}</th>)}</tr></thead>
      <tbody className="divide-y">{data.items.map((l:any) => <tr key={l.id}><td className="px-4 py-3 text-xs">{new Date(l.createdAt).toLocaleString()}</td><td className="px-4 py-3 text-xs font-mono">{l.adminId?.slice(0,8)}...</td><td className="px-4 py-3 text-sm">{l.actionType}</td><td className="px-4 py-3 text-sm">{l.entityType} ({l.entityId?.slice(0,8)})</td><td className="px-4 py-3 text-sm">{l.details || `${l.oldValue || 'none'} -> ${l.newValue || 'none'}`}</td></tr>)}</tbody>
    </table><Pagination page={data.page || page} totalPages={data.totalPages || 1} onPage={setPage}/></div>
  </div>;
}
