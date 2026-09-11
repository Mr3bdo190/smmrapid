import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Mail, MessageCircle, Ticket, ArrowRight, ShieldCheck } from 'lucide-react';
import PublicPageShell from './PublicPageShell';
export default function PublicSupport(){
 const {data:c={}}=useQuery({queryKey:['client-config'],queryFn:async()=>{const r=await fetch('/api/client/config');return r.ok?r.json():{};}});
 const email=c.supportEmail || 'support@example.com';
 return <PublicPageShell title="Customer Support">
   <p className="rapid-public-lead">Need help with an order, payment, account, or service? Choose the fastest support path below.</p>
   <div className="rapid-public-cards">
    <a href={`mailto:${email}`} className="rapid-public-card"><span className="rapid-public-icon"><Mail/></span><h2>Email support</h2><p>{email}</p><strong>Contact support <ArrowRight/></strong></a>
    <div className="rapid-public-card"><span className="rapid-public-icon green"><MessageCircle/></span><h2>Order assistance</h2><p>Include your order ID, account email and a short description so the team can investigate faster.</p><strong>Clear details = faster help</strong></div>
    <div className="rapid-public-card"><span className="rapid-public-icon orange"><Ticket/></span><h2>Support tickets</h2><p>Registered customers can open and manage support tickets directly from the dashboard.</p><Link to="/dashboard/tickets"><strong>Open dashboard <ArrowRight/></strong></Link></div>
   </div>
   <section className="rapid-public-info"><ShieldCheck/><div><h2>What we can help with</h2><ul><li>Order status and delivery questions</li><li>Payments and wallet balance</li><li>Service selection and quantity limits</li><li>Account and API assistance</li></ul></div></section>
 </PublicPageShell>
}
