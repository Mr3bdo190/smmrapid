const crypto = require('crypto');
const { Client } = require('pg');

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

const client = new Client({
  connectionString: 'postgresql://postgres.vtyqxjhqwscjhgxecubu:upiuwLKvDn0KxRl6@aws-1-eu-west-1.pooler.supabase.com:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

async function run() {
  await client.connect();
  const adminPassword = process.env.ADMIN_INITIAL_PASSWORD || '123456';
  const hashed = hashPassword(adminPassword);
  
  const res = await client.query(
    'UPDATE public.users SET password_hash = $1, role = $2 WHERE LOWER(email) = $3 RETURNING id, name, email, role',
    [hashed, 'admin', 'abdosayed0120@gmail.com']
  );
  console.log(`✅ Admin password successfully set to ${adminPassword} for:`, res.rows);
  await client.end();
}

run().catch(console.error);
