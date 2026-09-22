import { HOME_ARTWORK } from '../assets.ts';
import type { HomeViewModel } from '../view-model/home.ts';

/** Synthetic, deterministic visual data. It is not provider or availability truth. */
export const HOME_DESIGN_DATA: HomeViewModel = {
  provenance: 'DESIGN_FIXTURE',
  searchPlaceholder: 'Куда идём сегодня?',
  activeCategoryId: 'all',
  categories: [
    { id: 'all', label: 'Все' },
    { id: 'CONCERT', label: 'Концерты' },
    { id: 'PARTY', label: 'Вечеринки' },
    { id: 'EXHIBITION', label: 'Выставки' },
    { id: 'CINEMA', label: 'Кино' },
  ],
  hero: {
    id: 'design:hero',
    title: 'БИКИНИ KILL',
    dateTimeLabel: '12 АПР · 20:00',
    venue: 'VK Stadium',
    distanceLabel: null,
    priceLabel: 'от 2 500 ₽',
    categoryLabels: ['Концерт'],
    artwork: HOME_ARTWORK.hero,
    artworkAlt: 'Силуэт музыканта и зрители на концерте',
    recommendationLabel: 'КОНЦЕРТ',
    saved: false,
  },
  forYou: [
    {
      id: 'design:concert', title: 'СБПЧ', dateTimeLabel: 'Сегодня · 20:00', venue: '16 Тонн',
      distanceLabel: null, priceLabel: 'от 1 800 ₽', categoryLabels: ['Инди', 'Концерт'],
      artwork: HOME_ARTWORK.concert, artworkAlt: 'Музыкант под красным прожектором',
      recommendationLabel: null, saved: false,
    },
    {
      id: 'design:gallery', title: 'Три состояния', dateTimeLabel: 'Завтра · 19:00', venue: 'ГЭС-2',
      distanceLabel: '1,8 км', priceLabel: 'Бесплатно', categoryLabels: ['Выставка', 'Арт'],
      artwork: HOME_ARTWORK.gallery, artworkAlt: 'Зал выставки с монохромными портретами',
      recommendationLabel: null, saved: false,
    },
    {
      id: 'design:club', title: 'System 108', dateTimeLabel: '12 Апр · 23:00', venue: 'Mutabor',
      distanceLabel: '4,2 км', priceLabel: 'от 2 000 ₽', categoryLabels: ['Техно', 'Вечеринка'],
      artwork: HOME_ARTWORK.club, artworkAlt: 'Красный свет электронной сцены',
      recommendationLabel: null, saved: false,
    },
  ],
  nearby: [
    {
      id: 'design:dance', title: 'Пластика света', dateTimeLabel: 'Сегодня · 21:00', venue: 'ЦСИ Винзавод',
      distanceLabel: '900 м', priceLabel: 'от 1 200 ₽', categoryLabels: ['Перформанс'],
      artwork: HOME_ARTWORK.dance, artworkAlt: 'Силуэты танцовщиков за полупрозрачной тканью',
      recommendationLabel: null, saved: false,
    },
    {
      id: 'design:architecture', title: 'Город говорит', dateTimeLabel: 'Завтра · 12:00', venue: 'Музей Москвы',
      distanceLabel: '2,4 км', priceLabel: 'от 500 ₽', categoryLabels: ['Выставка'],
      artwork: HOME_ARTWORK.gallery, artworkAlt: 'Современное выставочное пространство',
      recommendationLabel: null, saved: false,
    },
  ],
};
