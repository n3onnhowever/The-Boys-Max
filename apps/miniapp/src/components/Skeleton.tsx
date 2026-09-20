export function Skeleton({ className = '' }: { className?: string }) {
  return <span className={`skeleton ${className}`.trim()} aria-hidden="true" />;
}

export function HomeSkeleton() {
  return <div className="home-skeleton" role="status" aria-label="Загружаем подборку">
    <Skeleton className="skeleton-brand" />
    <Skeleton className="skeleton-search" />
    <div className="skeleton-chips"><Skeleton /><Skeleton /><Skeleton /></div>
    <Skeleton className="skeleton-hero" />
    <Skeleton className="skeleton-heading" />
    <div className="skeleton-cards"><Skeleton /><Skeleton /><Skeleton /></div>
  </div>;
}
