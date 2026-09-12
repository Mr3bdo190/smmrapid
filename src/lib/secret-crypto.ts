import crypto from 'node:crypto';

const PREFIX = 'enc:v1:';
function keyBytes(){
  const raw = String(process.env.PROVIDER_ENCRYPTION_KEY || '').trim();
  if(!raw) throw new Error('PROVIDER_ENCRYPTION_KEY is required');
  return crypto.createHash('sha256').update(raw).digest();
}
export function isEncryptedSecret(v:string){ return String(v||'').startsWith(PREFIX); }
export function encryptSecret(value:string){
  const iv=crypto.randomBytes(12); const cipher=crypto.createCipheriv('aes-256-gcm',keyBytes(),iv);
  const out=Buffer.concat([cipher.update(String(value),'utf8'),cipher.final()]);
  const tag=cipher.getAuthTag(); return PREFIX+[iv.toString('base64url'),tag.toString('base64url'),out.toString('base64url')].join(':');
}
export function decryptSecret(value:string){
  const v=String(value||''); if(!isEncryptedSecret(v)) return v;
  const [,ver,ivB,tagB,dataB]=v.split(':'); if(ver!=='v1'||!ivB||!tagB||!dataB) throw new Error('Invalid encrypted secret');
  const decipher=crypto.createDecipheriv('aes-256-gcm',keyBytes(),Buffer.from(ivB,'base64url'));
  decipher.setAuthTag(Buffer.from(tagB,'base64url')); return Buffer.concat([decipher.update(Buffer.from(dataB,'base64url')),decipher.final()]).toString('utf8');
}
