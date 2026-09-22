import type { PropsWithChildren } from 'react';

interface EventDetailSurfaceProps extends PropsWithChildren {
  tags: string[];
  description: string;
}

export function EventDetailSurface({ tags, description, children }: EventDetailSurfaceProps) {
  return <section className="event-detail-surface" aria-labelledby="event-detail-about">
    <h2 id="event-detail-about" className="sr-only">О событии</h2>
    {tags.length > 0 && <div className="event-detail-tags" aria-label="Категории">
      {tags.map(tag => <span key={tag}>{tag}</span>)}
    </div>}
    <p className="event-detail-description">{description}</p>
    {children}
  </section>;
}
