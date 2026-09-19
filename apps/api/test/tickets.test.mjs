import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { randomUUID } from 'node:crypto';
import { createApp } from '../dist/app.js';

/**
 * Support tickets and notifications.
 *
 * The behaviour worth protecting: a ticket is only visible to its owner, an internal staff note never
 * reaches the customer, a reply leaves the ticket saying whose turn it is, and a staff action needs
 * the right permission.
 */
const hasDb = Boolean(process.env.DATABASE_URL);
const run = randomUUID().slice(0, 8);

const auth = { authorization: 'Bearer test' };
const post = (url, path, body) =>
  fetch(`${url}${path}`, { method: 'POST', headers: { ...auth, 'content-type': 'application/json' }, body: JSON.stringify(body ?? {}) });
const get = (url, path) => fetch(`${url}${path}`, { headers: auth });

async function startServer(authDeps) {
  const server = createApp({ auth: authDeps }).listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  assert.ok(address && typeof address === 'object');
  return { url: `http://127.0.0.1:${address.port}`, close: () => new Promise((resolve) => server.close(resolve)) };
}

async function makeUser(permissions = []) {
  const { findOrProvisionUser } = await import('../dist/modules/auth/users.js');
  const email = `ticket-${run}-${randomUUID().slice(0, 6)}@example.test`;
  const user = await findOrProvisionUser({ uid: email, email, emailVerified: true, displayName: 'Ticket Test', picture: null });
  return { user, perms: permissions };
}

/**
 * The offline tests only need an identity, not an account row: with no DATABASE_URL a real
 * provisioning call would fail for the wrong reason and hide what the test is about.
 */
const offlineIdentity = (permissions = []) => ({
  user: {
    id: '00000000-0000-0000-0000-0000000000cc',
    firebase_uid: 'offline-tickets',
    email: 'offline-tickets@example.test',
    email_verified: true,
    display_name: 'Offline',
    avatar_url: null,
    referral_code: 'OFFLINE',
    status: 'active',
    created_at: new Date().toISOString(),
  },
  perms: permissions,
});

const identity = async (permissions = []) => (hasDb ? await makeUser(permissions) : offlineIdentity(permissions));

const sellerFor = ({ user, perms }) => ({
  verifyIdToken: async () => ({ uid: user.firebase_uid, email: user.email, emailVerified: true }),
  findOrProvisionUser: async () => user,
  loadAccess: async () => ({ roles: perms.length ? ['admin'] : ['customer'], permissions: perms }),
  loadWallet: async () => ({ balanceMinor: 0, currency: 'USD' }),
});

const openTicket = async (url, subject = 'مشكلة في الطلب') => {
  const res = await post(url, '/api/tickets', { subject, body: 'الطلب واقف من ساعتين' });
  const text = await res.text();
  assert.equal(res.status, 201, text);
  return JSON.parse(text).data.ticket;
};

/* ── validation, no database needed ───────────────────────────────────────────────────────────── */

test('a ticket needs a real subject and a body', async () => {
  const { url, close } = await startServer(sellerFor(await identity()));
  try {
    for (const payload of [{ subject: 'ab', body: 'x' }, { subject: 'مشكلة', body: '' }, { subject: 'مشكلة', body: 'x', extra: 1 }]) {
      const res = await post(url, '/api/tickets', payload);
      assert.equal(res.status, 422, JSON.stringify(payload));
      assert.equal((await res.json()).error.code, 'VALIDATION_ERROR');
    }
  } finally {
    await close();
  }
});

test('an unsupported status is refused', async () => {
  const { url, close } = await startServer(sellerFor(await identity(['tickets.reply'])));
  try {
    const res = await post(url, '/api/admin/tickets/TKT0123456789/status', { status: 'deleted' });
    assert.equal(res.status, 422);
  } finally {
    await close();
  }
});

/* ── the ticket lifecycle ─────────────────────────────────────────────────────────────────────── */

test('a ticket keeps its conversation and is private to its owner', { skip: !hasDb }, async () => {
  const owner = await makeUser();
  const other = await makeUser();
  const ownerServer = await startServer(sellerFor(owner));

  try {
    const ticket = await openTicket(ownerServer.url, `طلب متوقف ${run}`);
    assert.match(ticket.publicId, /^TKT[0-9A-F]{10}$/);
    assert.equal(ticket.status, 'open', 'a new ticket is waiting for us');
    assert.equal(ticket.messageCount, 1);

    const detail = await get(ownerServer.url, `/api/tickets/${ticket.publicId}`);
    assert.equal(detail.status, 200);
    const conversation = (await detail.json()).data.ticket;
    assert.equal(conversation.messages.length, 1);
    assert.equal(conversation.messages[0].authorType, 'user');
    assert.equal(conversation.messages[0].body, 'الطلب واقف من ساعتين');

    const list = await get(ownerServer.url, '/api/tickets');
    assert.equal(list.status, 200);
    assert.ok((await list.json()).data.tickets.some((entry) => entry.publicId === ticket.publicId));

    const otherServer = await startServer(sellerFor(other));
    try {
      const stolen = await get(otherServer.url, `/api/tickets/${ticket.publicId}`);
      assert.equal(stolen.status, 404, 'a ticket belongs to one customer');
      assert.equal((await stolen.json()).error.code, 'TICKET_NOT_FOUND');
    } finally {
      await otherServer.close();
    }
  } finally {
    await ownerServer.close();
  }
});

test('a staff reply answers the ticket and tells the customer', { skip: !hasDb }, async () => {
  const customer = await makeUser();
  const staff = await makeUser(['tickets.view', 'tickets.reply']);
  const customerServer = await startServer(sellerFor(customer));
  const staffServer = await startServer(sellerFor(staff));

  try {
    const ticket = await openTicket(customerServer.url, `مشكلة دفع ${run}`);

    // An internal note is not an answer: the customer is still waiting and hears nothing.
    const note = await post(staffServer.url, `/api/admin/tickets/${ticket.publicId}/reply`, {
      body: 'ملاحظة داخلية: العميل متكرر',
      internal: true,
    });
    assert.equal(note.status, 201);

    const afterNote = await get(customerServer.url, `/api/tickets/${ticket.publicId}`);
    const afterNoteTicket = (await afterNote.json()).data.ticket;
    assert.equal(afterNoteTicket.status, 'open', 'an internal note does not answer anybody');
    assert.equal(afterNoteTicket.messages.length, 1, 'the customer never sees internal notes');
    assert.equal((await get(customerServer.url, '/api/notifications').then((r) => r.json())).data.unread, 0);

    const reply = await post(staffServer.url, `/api/admin/tickets/${ticket.publicId}/reply`, {
      body: 'اتفضل، جربنا العملية من عندنا ونجحت. تقدر تجرب تاني.',
    });
    assert.equal(reply.status, 201);

    const afterReply = await get(customerServer.url, `/api/tickets/${ticket.publicId}`);
    const answered = (await afterReply.json()).data.ticket;
    assert.equal(answered.status, 'answered', 'the ticket now says it is our answer that is waiting');
    assert.equal(answered.messages.length, 2);
    assert.equal(answered.messages[1].authorType, 'admin');

    const notifications = await get(customerServer.url, '/api/notifications').then((r) => r.json());
    assert.equal(notifications.data.unread, 1, 'the customer is notified');
    assert.equal(notifications.data.notifications[0].type, 'ticket.replied');
  } finally {
    await customerServer.close();
    await staffServer.close();
  }
});

test('a customer reply reopens a closed ticket', { skip: !hasDb }, async () => {
  const customer = await makeUser();
  const server = await startServer(sellerFor(customer));

  try {
    const ticket = await openTicket(server.url, `تذكرة هتقفل ${run}`);
    const closed = await post(server.url, `/api/tickets/${ticket.publicId}/close`, {});
    assert.equal(closed.status, 200);
    assert.equal((await closed.json()).data.ticket.status, 'closed');

    const reopened = await post(server.url, `/api/tickets/${ticket.publicId}/messages`, { body: 'لسه عندي نفس المشكلة' });
    assert.equal(reopened.status, 201);
    const ticket2 = (await reopened.json()).data.ticket;
    assert.equal(ticket2.status, 'open');
    assert.equal(ticket2.closedAt, null, 'reopening clears the closing time');
    assert.equal(ticket2.messages.length, 2);
  } finally {
    await server.close();
  }
});

/* ── staff permissions ────────────────────────────────────────────────────────────────────────── */

test('every staff ticket action needs its own permission', { skip: !hasDb }, async () => {
  const customer = await makeUser();
  const staff = await makeUser(); // signed in, no permissions at all
  const customerServer = await startServer(sellerFor(customer));
  const staffServer = await startServer(sellerFor(staff));

  try {
    const ticket = await openTicket(customerServer.url, `صلاحيات ${run}`);

    for (const [path, body] of [
      [`/api/admin/tickets/${ticket.publicId}/reply`, { body: 'رد' }],
      [`/api/admin/tickets/${ticket.publicId}/status`, { status: 'closed' }],
      [`/api/admin/tickets/${ticket.publicId}/assign`, { adminUserId: null }],
    ]) {
      const res = await post(staffServer.url, path, body);
      assert.equal(res.status, 403, `${path} must need a permission`);
      assert.equal((await res.json()).error.code, 'FORBIDDEN');
    }

    const queue = await get(staffServer.url, '/api/admin/tickets');
    assert.equal(queue.status, 403, 'and so does the queue');
  } finally {
    await customerServer.close();
    await staffServer.close();
  }
});

test('the staff queue shows open work first', { skip: !hasDb }, async () => {
  const customer = await makeUser();
  const staff = await makeUser(['tickets.view', 'tickets.reply']);
  const customerServer = await startServer(sellerFor(customer));
  const staffServer = await startServer(sellerFor(staff));

  try {
    const first = await openTicket(customerServer.url, `قديمة ${run}`);
    const second = await openTicket(customerServer.url, `جديدة ${run}`);
    await post(staffServer.url, `/api/admin/tickets/${second.publicId}/reply`, { body: 'ردينا على الجديدة' });

    const queue = await get(staffServer.url, '/api/admin/tickets').then((r) => r.json());
    const mine = queue.data.tickets.filter((entry) => [first.publicId, second.publicId].includes(entry.publicId));
    assert.equal(mine.length, 2);
    assert.equal(mine[0].publicId, first.publicId, 'the unanswered ticket comes first');
    assert.ok(mine[0].userId, 'the queue tells staff whose ticket it is');
  } finally {
    await customerServer.close();
    await staffServer.close();
  }
});

/* ── notifications ────────────────────────────────────────────────────────────────────────────── */

test('notifications are listed, counted and marked read one by one or all at once', { skip: !hasDb }, async () => {
  const customer = await makeUser();
  const other = await makeUser();
  const server = await startServer(sellerFor(customer));
  const otherServer = await startServer(sellerFor(other));

  try {
    const { createNotifier } = await import('../dist/modules/tickets/index.js');
    const notify = createNotifier();
    await notify({ userId: customer.user.id, type: 'wallet.credited', title: 'تم إضافة رصيد', body: '2.00$' });
    await notify({ userId: customer.user.id, type: 'order.completed', title: 'طلبك خلص', link: '/orders/X' });

    const first = await get(server.url, '/api/notifications').then((r) => r.json());
    assert.equal(first.data.notifications.length, 2);
    assert.equal(first.data.unread, 2);
    assert.equal(first.data.notifications[0].type, 'order.completed', 'newest first');

    const id = first.data.notifications[0].id;
    const one = await post(server.url, `/api/notifications/${id}/read`, {});
    assert.equal(one.status, 200);
    const afterOne = await one.json();
    assert.equal(afterOne.data.unread, 1);
    assert.ok(afterOne.data.notifications.find((entry) => entry.id === id).readAt, 'the read time is stamped');

    const all = await post(server.url, '/api/notifications/read-all', {});
    assert.equal(all.status, 200);
    assert.equal((await all.json()).data.marked, 1);
    assert.equal((await get(server.url, '/api/notifications').then((r) => r.json())).data.unread, 0);

    // Somebody else's notification cannot be touched.
    const foreign = await post(otherServer.url, `/api/notifications/${id}/read`, {});
    assert.equal(foreign.status, 404);
    assert.equal((await foreign.json()).error.code, 'NOTIFICATION_NOT_FOUND');
  } finally {
    await server.close();
    await otherServer.close();
  }
});
