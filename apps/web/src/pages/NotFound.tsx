import { Link } from '../lib/router';
import { useT } from '../i18n';
import { Card, EmptyState } from '../ui';

/** A URL that does not match any page: a way back, not a dead end. */
export function NotFound() {
  const { t } = useT();
  return (
    <Card className="mx-auto max-w-[560px]">
      <EmptyState
        title={t('app.notFound.title')}
        message={t('app.notFound.message')}
        action={
          <Link to="/services" className="btn btn-primary">
            {t('app.notFound.action')}
          </Link>
        }
      />
    </Card>
  );
}
