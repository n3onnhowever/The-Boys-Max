export function SectionHeader({ title, actionLabel = 'Смотреть все', onAction }: { title: string; actionLabel?: string; onAction?: () => void }) {
  return <div className="section-header">
    <h2>{title}</h2>
    <button type="button" className="section-header-action" onClick={onAction} disabled={!onAction}>{actionLabel}<span aria-hidden="true">›</span></button>
  </div>;
}
