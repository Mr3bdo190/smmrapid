import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function AdminPagination({ page, pageSize, total, onPageChange }: { page: number; pageSize: number; total: number; onPageChange: (p: number) => void }) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (total === 0) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  return (
    <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-slate-700/50 text-sm text-gray-600 dark:text-gray-400">
      <span>Showing {from}–{to} of {total}</span>
      <div className="flex items-center gap-2">
        <button
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="p-1.5 rounded-md border border-gray-300 dark:border-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-slate-600 dark:hover:text-gray-200"
        ><ChevronLeft className="w-4 h-4" /></button>
        <span className="text-gray-600 dark:text-gray-300">Page {page} of {totalPages}</span>
        <button
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="p-1.5 rounded-md border border-gray-300 dark:border-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-slate-600 dark:hover:text-gray-200"
        ><ChevronRight className="w-4 h-4" /></button>
      </div>
    </div>
  );
}
