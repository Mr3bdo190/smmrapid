import { useState } from 'react';
import { Link, useRouter } from '../lib/router';
import { useT, useLocale } from '../i18n';
import { useAuth } from '../auth/AuthProvider';
import { createTicket, fetchTicket, fetchTickets, replyToTicket, closeTicket } from '../data/api';
import { useAsync } from '../lib/useAsync';
import { Button, Card, EmptyState, ErrorBanner, Skeleton, StatusPill, TextAreaField, TextField } from '../ui';
import type { Tone } from '../ui';
import { FailureCard, PageHeader, RequireAuth } from '../components/shared';
import type { TicketStatus } from '../data/types';

/**
 * Support: a list of tickets, a form to open one, and the conversation for each.
 *
 * Copy is written for a customer in a hurry — the status says whose turn it is ("waiting on you" vs
 * "answered"), a reply to a closed ticket reopens it (the API does that), and the page says so
 * instead of hiding the box.
 */

const TICKET_TONE: Record<TicketStatus, Tone> = {
  open: 'info',
  pending: 'warn',
  answered: 'ok',
  closed: 'neutral',
};

export function Support() {
  return (
    <RequireAuth>
      <SupportList />
    </RequireAuth>
  );
}

function SupportList() {
  const { t } = useT();
  const { formatDateTime } = useLocale();
  const { user } = useAuth();
  const { navigate } = useRouter();

  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [failure, setFailure] = useState<unknown>(null);

  const tickets = useAsync(() => fetchTickets(user), [Boolean(user)], { skip: !user });

  const submit = async () => {
    setSubmitting(true);
    setFailure(null);
    try {
      const ticket = await createTicket(user, { subject: subject.trim(), body: body.trim() });
      setSubject('');
      setBody('');
      setOpen(false);
      navigate(`/support/${ticket.publicId}`);
    } catch (error) {
      setFailure(error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <PageHeader
        title={t('support.title')}
        subtitle={t('support.subtitle')}
        actions={
          <Button onClick={() => setOpen((value) => !value)} aria-expanded={open}>
            {t('support.new')}
          </Button>
        }
      />

      {open ? (
        <Card className="mb-5">
          <div className="flex flex-col gap-4">
            <TextField
              label={t('support.subject.label')}
              placeholder={t('support.subject.placeholder')}
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              required
              maxLength={200}
            />
            <TextAreaField
              label={t('support.message.label')}
              hint={t('support.message.hint')}
              value={body}
              onChange={(event) => setBody(event.target.value)}
              rows={5}
              required
            />
            {failure ? <ErrorBanner error={failure} /> : null}
            <div className="flex gap-2">
              <Button disabled={submitting || subject.trim().length < 3 || body.trim().length === 0} onClick={submit}>
                {submitting ? t('support.submitting') : t('support.submit')}
              </Button>
              <Button variant="ghost" onClick={() => setOpen(false)}>
                {t('common.cancel')}
              </Button>
            </div>
          </div>
        </Card>
      ) : null}

      {tickets.error && !tickets.data ? (
        <FailureCard error={tickets.error} onRetry={tickets.reload} />
      ) : tickets.loading && !tickets.data ? (
        <Card>
          <Skeleton lines={4} />
        </Card>
      ) : (tickets.data ?? []).length === 0 ? (
        <Card>
          <EmptyState
            title={t('support.empty.title')}
            message={t('support.empty.message')}
            action={
              <Button onClick={() => setOpen(true)}>{t('support.new')}</Button>
            }
          />
        </Card>
      ) : (
        <ul className="flex flex-col gap-3">
          {(tickets.data ?? []).map((ticket) => (
            <li key={ticket.publicId}>
              <Link to={`/support/${ticket.publicId}`} className="card block">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="text-[15px] font-medium">{ticket.subject}</span>
                  <StatusPill tone={TICKET_TONE[ticket.status] ?? 'neutral'} label={t(`support.status.${ticket.status}` as never)} />
                </div>
                <p className="num mt-1.5 text-[12px] text-[var(--color-ink-muted)]">
                  {ticket.publicId} · {t('support.created', { date: formatDateTime(ticket.createdAt) })}
                  {ticket.messageCount ? ` · ${ticket.messageCount}` : ''}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function TicketView({ publicId }: { publicId: string }) {
  return (
    <RequireAuth>
      <TicketConversation publicId={publicId} />
    </RequireAuth>
  );
}

function TicketConversation({ publicId }: { publicId: string }) {
  const { t } = useT();
  const { formatDateTime } = useLocale();
  const { user } = useAuth();
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const [closing, setClosing] = useState(false);
  const [failure, setFailure] = useState<unknown>(null);

  const ticket = useAsync(() => fetchTicket(user, publicId), [publicId, Boolean(user)], { skip: !user });
  const detail = ticket.data;

  const send = async () => {
    setSending(true);
    setFailure(null);
    try {
      await replyToTicket(user, publicId, reply.trim());
      setReply('');
      ticket.reload();
    } catch (error) {
      setFailure(error);
    } finally {
      setSending(false);
    }
  };

  const close = async () => {
    setClosing(true);
    setFailure(null);
    try {
      await closeTicket(user, publicId);
      ticket.reload();
    } catch (error) {
      setFailure(error);
    } finally {
      setClosing(false);
    }
  };

  if (ticket.loading && !detail) {
    return (
      <Card>
        <Skeleton lines={5} />
      </Card>
    );
  }

  if (ticket.error && !detail) {
    return (
      <Card className="mx-auto max-w-[560px]">
        {ticket.error instanceof Error && 'code' in ticket.error && (ticket.error as { code?: string }).code === 'TICKET_NOT_FOUND' ? (
          <EmptyState
            title={t('orders.detail.notFound.title')}
            message={t('support.empty.message')}
            action={
              <Link to="/support" className="btn btn-primary">
                {t('support.title')}
              </Link>
            }
          />
        ) : (
          <ErrorBanner error={ticket.error} onRetry={ticket.reload} />
        )}
      </Card>
    );
  }

  if (!detail) return null;
  const closed = detail.status === 'closed';

  return (
    <div className="mx-auto max-w-[760px]">
      <Link to="/support" className="micro inline-block hover:text-[var(--color-ink)]">
        ← {t('support.title')}
      </Link>

      <PageHeader
        title={detail.subject}
        subtitle={`${detail.publicId} · ${t('support.created', { date: formatDateTime(detail.createdAt) })}`}
        actions={
          <>
            <StatusPill tone={TICKET_TONE[detail.status] ?? 'neutral'} label={t(`support.status.${detail.status}` as never)} />
            {!closed ? (
              <Button variant="ghost" size="sm" disabled={closing} onClick={close}>
                {closing ? t('support.closing') : t('support.close')}
              </Button>
            ) : null}
          </>
        }
      />

      <Card title={t('support.conversation.title')} padded={false}>
        <ul className="flex flex-col">
          {detail.messages.map((message) => (
            <li key={message.id} className="border-b border-[var(--color-line)] px-4 py-3.5 last:border-0">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className={`pill ${message.authorType === 'admin' ? 'pill-accent' : 'pill-neutral'}`}>
                  {message.authorType === 'admin' ? t('support.author.support') : t('support.author.you')}
                </span>
                <span className="text-[12px] text-[var(--color-ink-faint)]">{formatDateTime(message.createdAt)}</span>
              </div>
              <p className="mt-2 whitespace-pre-line text-[14px] leading-relaxed">{message.body}</p>
            </li>
          ))}
        </ul>
      </Card>

      <Card className="mt-5">
        <div className="flex flex-col gap-4">
          <TextAreaField
            label={t('support.reply.label')}
            value={reply}
            onChange={(event) => setReply(event.target.value)}
            rows={4}
            hint={closed ? t('support.reopenHint') : undefined}
          />
          {failure ? <ErrorBanner error={failure} /> : null}
          <Button disabled={sending || reply.trim().length === 0} onClick={send}>
            {sending ? t('support.reply.submitting') : t('support.reply.submit')}
          </Button>
        </div>
      </Card>
    </div>
  );
}
