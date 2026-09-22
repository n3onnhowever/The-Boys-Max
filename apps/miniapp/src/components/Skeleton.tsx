export function Skeleton({ className = '' }: { className?: string }) {
  return <span className={`skeleton ${className}`.trim()} aria-hidden="true" />;
}

function CompactCardSkeleton() {
  return <div className="skeleton-card" aria-hidden="true">
    <Skeleton className="skeleton-card-image" />
    <Skeleton className="skeleton-card-line skeleton-card-line-wide" />
    <Skeleton className="skeleton-card-line" />
    <span className="skeleton-card-tags"><Skeleton /><Skeleton /></span>
  </div>;
}

export function HomeSkeleton({ statusLabel = 'Загружаем подборку' }: { statusLabel?: string }) {
  return <div className="home-skeleton" role="status" aria-label={statusLabel}>
    <div className="skeleton-hero" aria-hidden="true">
      <Skeleton className="skeleton-hero-image" />
      <Skeleton className="skeleton-hero-line skeleton-hero-line-wide" />
      <Skeleton className="skeleton-hero-line" />
      <Skeleton className="skeleton-hero-action" />
    </div>
    <section className="skeleton-section" aria-hidden="true">
      <div className="skeleton-section-heading"><strong>Для тебя</strong><span>Смотреть все <b>›</b></span></div>
      <div className="skeleton-cards"><CompactCardSkeleton /><CompactCardSkeleton /><CompactCardSkeleton /></div>
    </section>
    <section className="skeleton-section skeleton-nearby" aria-hidden="true">
      <div className="skeleton-section-heading"><strong>Рядом с тобой</strong><span>Смотреть все <b>›</b></span></div>
      <div className="skeleton-nearby-cards"><Skeleton /><Skeleton /></div>
    </section>
  </div>;
}
