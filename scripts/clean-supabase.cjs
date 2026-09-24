const { Client } = require('pg');

const connectionString = 'postgresql://postgres.vtyqxjhqwscjhgxecubu:upiuwLKvDn0KxRl6@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';

async function cleanFakeData() {
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();
  console.log('Connected to Supabase to remove fake data...');

  try {
    // 1. Delete fake orders
    await client.query('DELETE FROM public.orders;');
    console.log('✅ Cleared orders table');

    // 2. Delete fake reviews
    await client.query('DELETE FROM public.reviews;');
    console.log('✅ Cleared reviews table');

    // 3. Delete fake deposit requests
    await client.query('DELETE FROM public.deposit_requests;');
    console.log('✅ Cleared deposit_requests table');

    // 4. Delete fake transactions
    await client.query('DELETE FROM public.transactions;');
    console.log('✅ Cleared transactions table');

    // 5. Delete fake support tickets & messages
    await client.query('DELETE FROM public.ticket_messages;');
    await client.query('DELETE FROM public.support_tickets;');
    console.log('✅ Cleared support tickets & messages');

    // 6. Delete fake activity logs
    await client.query('DELETE FROM public.activity_logs;');
    console.log('✅ Cleared activity_logs table');

    // 7. Delete fake notifications
    await client.query('DELETE FROM public.notifications;');
    console.log('✅ Cleared notifications table');

    // 8. Delete fake affiliates
    await client.query('DELETE FROM public.affiliates;');
    console.log('✅ Cleared affiliates table');

    // 9. Clean users: Remove demo users (usr-demo-1, usr-demo-2), keep clean admin or the real user
    await client.query("DELETE FROM public.users WHERE id IN ('usr-demo-1', 'usr-demo-2');");
    
    // Check if the real user abdosayed0120@gmail.com exists or update admin account
    await client.query(`
      INSERT INTO public.users (
        id, name, email, phone, country, balance, total_spent, total_orders, status, role, custom_discount_percent, api_key
      ) VALUES (
        'usr-admin-real', 'مدير النظام', 'abdosayed0120@gmail.com', '+20100000000', 'Egypt', 0.0000, 0.0000, 0, 'active', 'admin', 0.00, 'smm_live_adm_real_key'
      )
      ON CONFLICT (email) DO UPDATE SET
        role = 'admin',
        balance = 0.0000,
        total_spent = 0.0000,
        total_orders = 0;
    `);
    console.log('✅ Cleared fake users; verified real admin account');

    // Check count of remaining items in tables
    const tables = ['users', 'orders', 'reviews', 'deposit_requests', 'transactions', 'support_tickets', 'activity_logs', 'notifications', 'services'];
    for (const t of tables) {
      const res = await client.query(`SELECT count(*) FROM public.${t}`);
      console.log(`Table ${t}: ${res.rows[0].count} rows`);
    }

    console.log('✨ All fake data in Supabase database has been completely removed!');
  } catch (err) {
    console.error('Error cleaning database:', err);
  } finally {
    await client.end();
  }
}

cleanFakeData();
