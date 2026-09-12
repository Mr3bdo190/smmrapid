import crypto from 'node:crypto';
import { eq, inArray, sql } from 'drizzle-orm';
import dns from 'node:dns';
import net from 'node:net';
import { db } from '../db/index';
import { orders, providers, services, users, walletLedger } from '../db/schema';
import { decryptSecret } from './secret-crypto';

export interface ProviderResponse {
  error?: string; order?: string | number; status?: string; remains?: string | number;
  start_count?: string | number; currency?: string; balance?: string | number; [key: string]: any;
}

const sleep = (ms:number) => new Promise(r => setTimeout(r, ms));
const money = (v:number) => Math.round((v + Number.EPSILON) * 10000) / 10000;

function isPrivateIp(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const [a, b, c, d] = ip.split('.').map(Number);
    return a === 10 ||
           a === 127 ||
           a === 0 ||
           (a === 169 && b === 254) ||
           (a === 172 && b >= 16 && b <= 31) ||
           (a === 192 && b === 168) ||
           (a === 100 && b >= 64 && b <= 127) || // CGNAT
           (a === 198 && (b === 18 || b === 19)) || // Benchmark testing
           (a === 198 && b === 51 && c === 100) || // Documentation
           (a === 203 && b === 0 && c === 113) || // Documentation
           (a === 224) || // Multicast
           (a >= 240); // Reserved
  }
  if (net.isIPv6(ip)) {
    return ip === '::1' ||
           ip.startsWith('fc') || // ULA
           ip.startsWith('fd') || // ULA
           ip.startsWith('fe80:') || // Link-local
           ip.startsWith('ff'); // Multicast
  }
  return false;
}

async function resolveAndCheckHost(host: string): Promise<void> {
  try {
    const results = await dns.promises.lookup(host, { all: true, family: 0 });
    for (const { address } of results) {
      if (isPrivateIp(address)) {
        throw new Error('Provider host resolves to private IP');
      }
    }
  } catch (e: any) {
    if (e?.message === 'Provider host resolves to private IP') throw e;
    // If DNS fails, we'll let the fetch fail naturally
  }
}

export class ProviderClient {
  constructor(private url:string, private key:string) {}
  
  private async request(data:Record<string,string>, retries=3):Promise<ProviderResponse>{
    let last='Provider request failed';
    for(let attempt=0;attempt<retries;attempt++){
      const controller=new AbortController(); 
      const timer=setTimeout(()=>controller.abort(),10000);
      try{
        const u=new URL(this.url); 
        if(!['http:','https:'].includes(u.protocol)) throw new Error('Invalid provider URL');
        
        const host=u.hostname.toLowerCase();
        
        // Block localhost and local domains
        if(host==='localhost' || host.endsWith('.localhost') || host === '127.0.0.1' || host === '::1') {
          throw new Error('Provider host is not allowed');
        }
        
        // Block direct private IPs
        if (net.isIP(host) && isPrivateIp(host)) {
          throw new Error('Provider host is not allowed');
        }
        
        // Resolve and check for private IPs
        await resolveAndCheckHost(host);
        
        const body=new URLSearchParams({key:this.key,...data});
        const res=await fetch(u,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded','Accept':'application/json'},body:body.toString(),signal:controller.signal});
        
        if(res.status===429||res.status>=500){
          const raw=await res.text().catch(()=>"");
          let detail="";
          try { const parsed=raw?JSON.parse(raw):null; detail=parsed?.error||parsed?.message||parsed?.detail||""; } catch {}
          last=`Provider HTTP ${res.status}${detail?`: ${String(detail).slice(0,240)}`:""}`;
          await sleep(500*(2**attempt));continue;
        }
        
        if(!res.ok){
          const raw=await res.text().catch(()=>"");
          let detail="";
          try { const parsed=raw?JSON.parse(raw):null; detail=parsed?.error||parsed?.message||parsed?.detail||""; } catch { detail=raw.slice(0,240); }
          last=`Provider HTTP ${res.status}${detail?`: ${String(detail).slice(0,240)}`:""}`;
          break;
        }
        
        const json=await res.json() as ProviderResponse;
        if(json.error)return json;
        return json;
      }catch(e:any){
        last=e?.name==='AbortError'?'Provider timeout':(e?.message||last);
        if(attempt<retries-1)await sleep(500*(2**attempt));
      }
      finally{clearTimeout(timer);}
    }
    return {error:last};
  }
  
  balance(){return this.request({action:'balance'});}
  services(){return this.request({action:'services'});}
  addOrder(service:string,link:string,quantity:number){return this.request({action:'add',service,link,quantity:String(quantity)});}
  status(orderId:string){return this.request({action:'status',order:orderId});}
  refill(orderId:string){return this.request({action:'refill',order:orderId});}
  cancel(orderId:string){return this.request({action:'cancel',orders:orderId});}
}

export async function refundOrderOnce(orderId:string, amount:number, reason:string){
  if(!(amount>0))return false;
  return db.transaction(async tx=>{
    const [o]=await tx.select().from(orders).where(eq(orders.id,orderId)).for('update');
    if(!o)return false;
    const alreadyRefunded=Number(o.refundedAmount||0);
    const remainingRefund=money(Math.max(0, Number(o.charge)-alreadyRefunded));
    const credit=money(Math.min(amount, remainingRefund));
    if(!(credit>0))return false;
    const [u]=await tx.select().from(users).where(eq(users.id,o.userId)).for('update');
    if(!u)throw new Error('User not found');
    const next=money(Number(u.balance)+credit);
    await tx.update(users).set({balance:next.toFixed(4)}).where(eq(users.id,u.id));
    await tx.insert(walletLedger).values({id:crypto.randomUUID(),userId:u.id,amount:credit.toFixed(4),type:'credit',description:`Order refund: ${reason}`,referenceId:o.id,createdAt:new Date()});
    const totalRefunded=money(alreadyRefunded+credit);
    await tx.update(orders).set({refundedAmount:totalRefunded.toFixed(4),providerError:reason,updatedAt:new Date()}).where(eq(orders.id,o.id));
    return true;
  });
}

function calculateUnfulfilledRefund(order:any, remains:number){
  const quantity=Number(order.quantity||0);
  const charge=Number(order.charge||0);
  if(quantity<=0 || charge<=0 || !Number.isFinite(remains)) return 0;
  const r=Math.max(0,Math.min(quantity,Math.floor(remains)));
  return money(charge*(r/quantity));
}

export async function placeOrderToProvider(orderId:string):Promise<{ok:boolean;error?:string;refunded?:boolean}> {
  const claimed = await db.transaction(async tx=>{
    const [o]=await tx.update(orders).set({dispatching:true,updatedAt:new Date()}).where(sql`${orders.id} = ${orderId} AND ${orders.status} = 'Pending' AND ${orders.providerOrderId} IS NULL AND ${orders.dispatching} = false`).returning();
    return o || null;
  });
  if(!claimed) return {ok:true};
  const order=claimed;
  const fail=async(error:string)=>{ const refunded=await refundOrderOnce(orderId,Number(order.charge),error); await db.update(orders).set({dispatching:false,updatedAt:new Date()}).where(eq(orders.id,orderId)); return {ok:false,error,refunded}; };
  const [service]=await db.select().from(services).where(eq(services.id,order.serviceId));
  if(!service) return {ok:false,error:'Service not found'};
  if(service.executionMode==='manual'){ await db.update(orders).set({dispatching:false,updatedAt:new Date()}).where(eq(orders.id,orderId)); return {ok:true}; }
  if(!service.providerId||!service.providerServiceId) return fail('No provider configured');
  const [provider]=await db.select().from(providers).where(eq(providers.id,service.providerId));
  if(!provider||provider.status!=='active'||provider.isDeleted) return fail('Provider inactive');
  const client=new ProviderClient(provider.apiUrl,decryptSecret(provider.apiKey)); const r=await client.addOrder(service.providerServiceId,order.link,order.quantity);
  if(r.error) return fail(String(r.error));
  if(!r.order) return fail('Invalid provider response');
  const initialStart = Number.isFinite(Number(r.start_count)) ? Math.max(0, Number(r.start_count)) : 0;
  await db.update(orders).set({providerOrderId:String(r.order),status:'Processing',providerError:null,startCount:initialStart,remains:order.quantity,dispatching:false,updatedAt:new Date()}).where(eq(orders.id,orderId));
  // Fetch the provider's real start_count/remains immediately after dispatch.
  await checkOrderStatus(orderId).catch(() => undefined);
  return {ok:true};
}

const mapStatus=(s:string)=>{const x=s.toLowerCase(); if(x==='pending')return'Pending';if(x==='processing')return'Processing';if(x==='in progress')return'In Progress';if(x==='completed')return'Completed';if(x==='partial')return'Partial';if(['canceled','cancelled'].includes(x))return'Canceled';return null;};

export async function checkOrderStatus(orderId:string){
  const [o]=await db.select().from(orders).where(eq(orders.id,orderId));
  if(!o?.providerOrderId || ['Completed','Canceled','Refunded'].includes(o.status))return;
  const [s]=await db.select().from(services).where(eq(services.id,o.serviceId));
  if(!s?.providerId)return;
  const [p]=await db.select().from(providers).where(eq(providers.id,s.providerId));
  if(!p)return;

  const r=await new ProviderClient(p.apiUrl,decryptSecret(p.apiKey)).status(o.providerOrderId);
  if(r.error)return;
  const status= r.status ? mapStatus(String(r.status)) : null;
  const rawRemains=Number(r.remains);
  const rawStart=Number(r.start_count);
  const start=Number.isFinite(rawStart)?Math.max(0,Math.floor(rawStart)):o.startCount;
  // Some providers omit remains. Derive it from the current start count when possible.
  let remains=Number.isFinite(rawRemains)?Math.max(0,Math.floor(rawRemains)):Number(o.remains);
  if(!Number.isFinite(rawRemains) && Number.isFinite(rawStart) && Number(o.quantity)>0){
    remains=Math.max(0,Number(o.quantity)-(Math.max(0,rawStart)-Math.max(0,Number(o.startCount||0))));
  }
  remains=Math.max(0,Math.min(Number(o.quantity),remains));

  await db.transaction(async tx=>{
    const [locked]=await tx.select().from(orders).where(eq(orders.id,o.id)).for('update');
    if(!locked || ['Refunded'].includes(locked.status))return;
    const nextStatus=status||locked.status;

    if(nextStatus==='Canceled' || nextStatus==='Partial'){
      const refund=calculateUnfulfilledRefund(locked,remains);
      if(refund>0){
        const alreadyRefunded=Number(locked.refundedAmount||0);
        const available=money(Math.max(0,refund-alreadyRefunded));
        if(available>0){
          const [u]=await tx.select().from(users).where(eq(users.id,locked.userId)).for('update');
          if(!u)throw new Error('User not found');
          const nextBalance=money(Number(u.balance)+available);
          await tx.update(users).set({balance:nextBalance.toFixed(4)}).where(eq(users.id,u.id));
          await tx.insert(walletLedger).values({id:crypto.randomUUID(),userId:u.id,amount:available.toFixed(4),type:'credit',description:nextStatus==='Canceled'?'Cancellation refund for unfulfilled quantity':'Partial order refund for unfulfilled quantity',referenceId:locked.id,createdAt:new Date()});
          await tx.update(orders).set({refundedAmount:money(alreadyRefunded+available).toFixed(4)}).where(eq(orders.id,locked.id));
        }
      }
    }

    await tx.update(orders).set({
      status:nextStatus,
      remains,
      startCount:start,
      cancelRequested: nextStatus==='Canceled' ? false : locked.cancelRequested,
      updatedAt:new Date()
    }).where(eq(orders.id,locked.id));
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
  setInterval(run,30_000);
}
