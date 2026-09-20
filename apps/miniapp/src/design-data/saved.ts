import { HOME_ARTWORK } from '../assets.ts';
import type { SearchEventViewModel } from '../view-model/search.ts';
import type { SavedViewModel } from '../view-model/saved.ts';

function event(event: SearchEventViewModel): SearchEventViewModel {
  return event;
}

/** Synthetic, deterministic visual data. It is not provider, price or availability truth. */
export const SAVED_DESIGN_DATA: SavedViewModel = {
  provenance: 'DESIGN_FIXTURE',
  title: 'Сохранённое',
  segments: [
    { id: 'upcoming', label: 'Ближайшие' },
    { id: 'later', label: 'Позже' },
  ],
  events: {
    upcoming: [
      event({
        id: 'design:saved:bikini-kill', title: 'БИКИНИ KILL', dateTimeLabel: '12 апр · Сб · 20:00',
        venue: 'VK Stadium', priceLabel: 'от 2 500 ₽', artwork: HOME_ARTWORK.concert,
        artworkAlt: 'Силуэт музыканта на концертной сцене', saved: true,
      }),
      event({
        id: 'design:saved:give-tank', title: 'Дайте танк (!)', dateTimeLabel: '13 апр · Вс · 19:00',
        venue: 'Base', priceLabel: 'от 1 800 ₽', artwork: HOME_ARTWORK.club,
        artworkAlt: 'Красный свет над зрителями концерта', saved: true,
      }),
      event({
        id: 'design:saved:sirotkin', title: 'Сироткин', dateTimeLabel: '14 апр · Пн · 20:00',
        venue: 'Arata Moscow', priceLabel: 'от 2 000 ₽', artwork: HOME_ARTWORK.concert,
        artworkAlt: 'Музыкант под направленным светом', saved: true,
      }),
      event({
        id: 'design:saved:three-days-rain', title: 'Три дня дождя', dateTimeLabel: '18 апр · Пт · 21:00',
        venue: '1930 Moscow', priceLabel: 'от 2 200 ₽', artwork: HOME_ARTWORK.concert,
        artworkAlt: 'Силуэт исполнителя в холодном сценическом свете', saved: true,
      }),
      event({
        id: 'design:saved:sbpch', title: 'СБПЧ', dateTimeLabel: '20 апр · Вс · 19:00',
        venue: 'Клуб «16 Тонн»', priceLabel: 'от 1 500 ₽', artwork: HOME_ARTWORK.hero,
        artworkAlt: 'Красный свет над концертной сценой', saved: true,
      }),
      event({
        id: 'design:saved:hadn-dadn', title: 'Хадн дадн', dateTimeLabel: '27 апр · Вс · 20:00',
        venue: 'Урбан', priceLabel: 'от 1 600 ₽', artwork: HOME_ARTWORK.concert,
        artworkAlt: 'Силуэт музыканта на сцене', saved: true,
      }),
    ],
    later: [
      event({
        id: 'design:saved:plastic-light', title: 'Пластика света', dateTimeLabel: '3 мая · Сб · 21:00',
        venue: 'ЦСИ Винзавод', priceLabel: 'от 1 200 ₽', artwork: HOME_ARTWORK.dance,
        artworkAlt: 'Силуэты танцовщиков за полупрозрачной тканью', saved: true,
      }),
      event({
        id: 'design:saved:three-states', title: 'Три состояния', dateTimeLabel: '10 мая · Сб · 19:00',
        venue: 'ГЭС-2', priceLabel: 'Бесплатно', artwork: HOME_ARTWORK.gallery,
        artworkAlt: 'Зал выставки с монохромными портретами', saved: true,
      }),
    ],
  },
};
