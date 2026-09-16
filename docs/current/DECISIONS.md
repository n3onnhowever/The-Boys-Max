# Accepted decisions

- Track alignment: recommended direction “Персональная афиша и навигатор событий”.
- Main user path: personal discovery first; no group required.
- Optional differentiator: turn discoveries into a collaborative plan in MAX.
- Team name: The Boys.
- Product name: TBD.
- Backend: TypeScript modular monolith; separate API and worker roles.
- Persistence: PostgreSQL.
- Async: Redis + BullMQ.
- Mini-app: React + TypeScript.
- MAX: bot + connected mini-app; both web and mobile MAX must eventually be checked.
- Search/price: uncertainty is explicit; unknown fees are not zero.
- AI: optional helper, never the source of truth for hard facts or authorization.
- Map: embedded location/comparison may coexist with an external navigation link.
- Zero-new-spend constraint for hackathon preparation unless user explicitly approves otherwise.
