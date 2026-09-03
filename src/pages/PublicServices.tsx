import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle, ShoppingCart, Headphones, ShieldCheck } from 'lucide-react';

export default function PublicServices() {
  const { data: services = [], isLoading } = useQuery({
    queryKey: ['public-services'],
    queryFn: async () => {
      const r = await fetch('/api/public/services');
      if (!r.ok) throw new Error('Failed to load catalog');
      return r.json();
    },
  });
  const groups = services.reduce((acc:any, s:any) => {
    const key = s.categoryId || 'other';
    (acc[key] ||= { name: s.categoryName || 'Services', items: [] }).items.push(s);
    return acc;
  }, {});
  return <div className="min-h-screen bg-slate-50 text-slate-900">
    <header className="bg-white border-b sticky top-0 z-40"><div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
      <Link to="/" className="font-bold text-xl">smmrapid.store</Link><Link to="/" className="text-sm text-indigo-600 flex items-center gap-1"><ArrowLeft className="w-4 h-4"/> Home</Link>
    </div></header>
    <main className="max-w-6xl mx-auto px-6 py-12 space-y-10">
      <section className="text-center"><div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-sm font-medium"><ShoppingCart className="w-4 h-4"/> Available services</div><h1 className="text-4xl md:text-5xl font-extrabold mt-4">Social Media Marketing Services</h1><p className="max-w-2xl mx-auto mt-4 text-slate-600">Browse our currently available services, pricing and quantity limits before creating an order.</p></section>
      <section className="grid md:grid-cols-3 gap-4"><div className="bg-white border rounded-xl p-5"><CheckCircle className="text-emerald-600 mb-2"/><b>Clear pricing</b><p className="text-sm text-slate-500 mt-1">Rates are shown per 1,000 units.</p></div><div className="bg-white border rounded-xl p-5"><ShieldCheck className="text-indigo-600 mb-2"/><b>Order tracking</b><p className="text-sm text-slate-500 mt-1">Registered customers can track orders from their dashboard.</p></div><div className="bg-white border rounded-xl p-5"><Headphones className="text-orange-600 mb-2"/><b>Customer support</b><p className="text-sm text-slate-500 mt-1">Support is available through the support contact shown on the website.</p></div></section>
      {isLoading ? <div className="bg-white border rounded-xl p-12 text-center text-slate-500">Loading available services...</div> : !services.length ? <div className="bg-white border rounded-xl p-12 text-center"><h2 className="text-xl font-bold">Catalog is being updated</h2><p className="text-slate-500 mt-2">Our service catalog is temporarily unavailable. Please check back shortly.</p><Link to="/" className="inline-block mt-5 px-5 py-2 rounded-lg bg-indigo-600 text-white">Back to home</Link></div> : Object.values(groups).map((g:any)=><section key={g.name} className="space-y-3"><h2 className="text-2xl font-bold">{g.name}</h2><div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">{g.items.map((s:any)=><article key={s.id} className="bg-white border rounded-xl p-5 shadow-sm"><h3 className="font-semibold text-lg">{s.name}</h3>{s.description&&<p className="text-sm text-slate-500 mt-2 line-clamp-3">{s.description}</p>}<div className="mt-4 grid grid-cols-2 gap-2 text-sm"><div className="rounded-lg bg-indigo-50 p-3"><span className="text-slate-500 block">Rate / 1K</span><b className="text-indigo-700">${Number(s.pricePer1k).toFixed(4)}</b></div><div className="rounded-lg bg-slate-50 p-3"><span className="text-slate-500 block">Min / Max</span><b>{s.minQuantity.toLocaleString()} / {s.maxQuantity.toLocaleString()}</b></div></div><Link to="/" className="mt-4 block text-center px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium">Create account to order</Link></article>)}</div></section>)}
    </main>
  </div>;
}
