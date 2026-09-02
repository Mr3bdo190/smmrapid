import { eq, inArray } from 'drizzle-orm';
import dns from 'node:dns';
import net from 'node:net';
import { db } from '../db/index';
import { orders, providers, services, users, walletLedger } from '../db/schema';

export interface ProviderResponse {
  error?: string; order?: string | number; status?: string; remains?: string | number;
  start_count?: string | number; currency?: string; balance?: string | number; [key: string]: any;
}

const sleep = (ms:number) => new Promise(r => setTimeout(r, ms));
const money = (v:number) => Math.round((v + Number.EPSILON) * 10000) / 10000;

export class ProviderClient {
  constructor(private url:string, private key:string) {}
  private async request(data:Record<string,string>, retries=3):Promise<ProviderResponse>{
    let last='Provider request failed';
    for(let attempt=0;attempt<retries;attempt++){
      const controller=new AbortController(); const timer=setTimeout(()=>controller.abort(),10000);
      try{
        const u=new URL(this.url); if(!['http:','https:'].includes(u.protocol)) throw new Error('Invalid provider URL');
        const host=u.hostname.toLowerCase();
        const privateIp=(ip:string)=>net.isIPv4(ip) ? (()=>{const [a,b]=ip.split('.').map(Number);return a===10||a===127||a===0||(a===169&&b===254)||(a===172&&b>=16&&b<=31)||(a===192&&b===168)})() : net.isIPv6(ip) && (ip==='::1'||ip.startsWith('fc')||ip.startsWith('fd')||ip.startsWith('fe80:'));
        if(host==='localhost'||host.endsWith('.localhost')||(net.isIP(host)&&privateIp(host))) throw new Error('Provider host is not allowed');
        try { const ips=await dns.promises.lookup(host,{all:true}); if(ips.some(x=>privateIp(x.address))) throw new Error('Provider host is not allowed'); } catch(e:any) { if(e?.message==='Provider host is not allowed') throw e; }
        const body=new URLSearchParams({key:this.key,...data});
        const res=await fetch(u,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded','Accept':'application/json'},body:body.toString(),signal:controller.signal});
        if(res.status===429||res.status>=500){last=`Provider HTTP ${res.status}`;await sleep(500*(2**attempt));continue;}
        if(!res.ok){last=`Provider HTTP ${res.status}`;break;}
        const json=await res.json() as ProviderResponse;
        if(json.error)return json;
        return json;
      }catch(e:any){last=e?.name==='AbortError'?'Provider timeout':(e?.message||last);if(attempt<retries-1)await sleep(500*(2**attempt));}
      finally{clearTimeout(timer);}
    }
    return {error:last};
  }
  balance(){return this.request({action:'balance'});}
  services(){return this.request({action:'services'});}
  addOrder(service:string,link:string,quantity:number){return this.request({action:'add',service,link,quantity:String(quantity)});}
  status(orderId:string){return this.request({action:'status',order:orderId});}
}

export async function refundOrderOnce(orderId:string, amount:number, reason:string){
  if(!(amount>0))return false;
  return db.transaction(async tx=>{
    const [o]=await tx.select().from(orders).where(eq(orders.id,orderId)).for('update');
    if(!o)return false;
    if(['Canceled','Refunded'].includes(o.status))return false;
    const [u]=await tx.select().from(users).where(eq(users.id,o.userId)).for('update'); if(!u)throw new Error('User not found');
    const next=money(Number(u.balance)+amount);
    await tx.update(users).set({balance:next.toFixed(4)}).where(eq(users.id,u.id));
    await tx.insert(walletLedger).values({userId:u.id,amount:amount.toFixed(4),type:'credit',description:`Order refund: ${reason}`,referenceId:o.id});
    await tx.update(orders).set({status:'Refunded',providerError:reason,updatedAt:new Date()}).where(eq(orders.id,o.id));
    return true;
  });
}

export async function placeOrderToProvider(orderId:string){
  const [order]=await db.select().from(orders).where(eq(orders.id,orderId)); if(!order||order.status!=='Pending'||order.providerOrderId)return;
  const [service]=await db.select().from(services).where(eq(services.id,order.serviceId));
  if(!service?.providerId||!service.providerServiceId)return refundOrderOnce(orderId,Number(order.charge),'No provider configured');
  const [provider]=await db.select().from(providers).where(eq(providers.id,service.providerId));
  if(!provider||provider.status!=='active'||provider.isDeleted)return refundOrderOnce(orderId,Number(order.charge),'Provider inactive');
  const client=new ProviderClient(provider.apiUrl,provider.apiKey); const r=await client.addOrder(service.providerServiceId,order.link,order.quantity);
  if(r.error)return refundOrderOnce(orderId,Number(order.charge),r.error);
  if(!r.order)return refundOrderOnce(orderId,Number(order.charge),'Invalid provider response');
  await db.update(orders).set({providerOrderId:String(r.order),status:'Processing',providerError:null,updatedAt:new Date()}).where(eq(orders.id,orderId));
}

const mapStatus=(s:string)=>{const x=s.toLowerCase(); if(x==='pending')return'Pending';if(x==='processing')return'Processing';if(x==='in progress')return'In Progress';if(x==='completed')return'Completed';if(x==='partial')return'Partial';if(['canceled','cancelled'].includes(x))return'Canceled';return null;};

export async function checkOrderStatus(orderId:string){
  const [o]=await db.select().from(orders).where(eq(orders.id,orderId));if(!o?.providerOrderId||['Completed','Canceled','Refunded','Partial'].includes(o.status))return;
  const [s]=await db.select().from(services).where(eq(services.id,o.serviceId));if(!s?.providerId)return;const [p]=await db.select().from(providers).where(eq(providers.id,s.providerId));if(!p)return;
  const r=await new ProviderClient(p.apiUrl,p.apiKey).status(o.providerOrderId);if(r.error||!r.status)return;
  const status=mapStatus(String(r.status));const remains=Number.isFinite(Number(r.remains))?Math.max(0,Number(r.remains)):o.remains;const start=Number.isFinite(Number(r.start_count))?Math.max(0,Number(r.start_count)):o.startCount;
  await db.transaction(async tx=>{
    const [locked]=await tx.select().from(orders).where(eq(orders.id,o.id)).for('update');if(!locked||['Completed','Canceled','Refunded','Partial'].includes(locked.status))return;
    if(status==='Canceled'){
      const [u]=await tx.select().from(users).where(eq(users.id,locked.userId)).for('update');if(!u)throw new Error('User not found');const next=money(Number(u.balance)+Number(locked.charge));await tx.update(users).set({balance:next.toFixed(4)}).where(eq(users.id,u.id));await tx.insert(walletLedger).values({userId:u.id,amount:Number(locked.charge).toFixed(4),type:'credit',description:'Order canceled refund',referenceId:locked.id});
    }else if(status==='Partial' && locked.quantity>0){const refund=money(Number(locked.charge)*(remains/locked.quantity));if(refund>0){const[u]=await tx.select().from(users).where(eq(users.id,locked.userId)).for('update');if(u){const next=money(Number(u.balance)+refund);await tx.update(users).set({balance:next.toFixed(4)}).where(eq(users.id,u.id));await tx.insert(walletLedger).values({userId:u.id,amount:refund.toFixed(4),type:'credit',description:'Partial order refund',referenceId:locked.id});}}}
    await tx.update(orders).set({status:status||locked.status,remains,startCount:start,updatedAt:new Date()}).where(eq(orders.id,locked.id));
  });
}

let workerStarted=false;
let workerRunning=false;
export function startProviderWorker(){
  if(workerStarted)return;
  workerStarted=true;
  const run=async()=>{
    if(workerRunning)return;
    workerRunning=true;
    try{const pending=await db.query.orders.findMany({where:eq(orders.status,'Pending'),limit:50});for(const o of pending)await placeOrderToProvider(o.id).catch(console.error);const active=await db.query.orders.findMany({where:inArray(orders.status,['Processing','In Progress']),limit:100});for(const o of active)await checkOrderStatus(o.id).catch(console.error);}catch(e){console.error('Provider worker',e);}finally{workerRunning=false;}};
  run();
  setInterval(run,60_000);
}
