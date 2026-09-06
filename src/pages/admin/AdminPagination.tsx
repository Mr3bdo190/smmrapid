import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function AdminPagination({ page, pageSize, total, onPageChange }: { page: number; pageSize: number; total: number; onPageChange: (p: number) => void }) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (total === 0) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  return (
    <div className="flex items-center justify-between px-4 py-3 border-t bg-gray-50 text-sm text-gray-600">
      <span>Showing {from}–{to} of {total}</span>
      <div className="flex items-center gap-2">
        <button
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="p-1.5 rounded-md border disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-100"
        ><ChevronLeft className="w-4 h-4" /></button>
        <span>Page {page} of {totalPages}</span>
        <button
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="p-1.5 rounded-md border disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-100"
        ><ChevronRight className="w-4 h-4" /></button>
      </div>
    </div>
  );
}
