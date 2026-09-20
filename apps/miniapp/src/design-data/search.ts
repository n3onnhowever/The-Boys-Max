import { HOME_ARTWORK } from '../assets.ts';
import type { SearchViewModel } from '../view-model/search.ts';

/** Synthetic, deterministic visual data. It is not live Moscow/provider truth. */
export const SEARCH_DESIGN_DATA: SearchViewModel = {
  provenance: 'DESIGN_FIXTURE',
  title: 'Поиск',
  resultCountLabel: 'Найдено 24 события',
  mapAffordance: 'DESIGN_ONLY',
  filters: {
    query: 'концерт в москве',
    date: 'apr12-14',
    categories: ['concerts'],
    format: 'offline',
    price: '1000-3000',
    distance: 'within-10',
    sort: 'relevance',
  },
  events: [
    {
      id: 'design:search:bikini-kill', title: 'БИКИНИ KILL', dateTimeLabel: '12 Апр · Сб · 20:00',
      venue: 'VK Stadium', priceLabel: 'от 2 500 ₽', artwork: HOME_ARTWORK.hero,
      artworkAlt: 'Силуэт вокалистки в чёрно-красном концертном свете', saved: false,
    },
    {
      id: 'design:search:give-tank', title: 'Дайте танк (!)', dateTimeLabel: '13 Апр · Вс · 19:00',
      venue: 'Base', priceLabel: 'от 1 800 ₽', artwork: HOME_ARTWORK.club,
      artworkAlt: 'Красный свет над зрителями концерта', saved: false,
    },
    {
      id: 'design:search:hadn-dadn', title: 'Хадн дадн', dateTimeLabel: '12 Апр · Сб · 21:00',
      venue: '16 Тонн', priceLabel: 'от 1 500 ₽', artwork: HOME_ARTWORK.concert,
      artworkAlt: 'Музыкант под направленным светом', saved: false,
    },
    {
      id: 'design:search:sirotkin', title: 'Сироткин', dateTimeLabel: '14 Апр · Пн · 20:00',
      venue: 'Arena Moscow', priceLabel: 'от 2 000 ₽', artwork: HOME_ARTWORK.concert,
      artworkAlt: 'Силуэт исполнителя в красном концертном свете', saved: false,
    },
  ],
};
