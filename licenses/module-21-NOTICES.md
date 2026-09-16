# Third-party provenance и notices

Leaflet1.9.4 — BSD-2-Clause, источник точной лицензии: https://github.com/Leaflet/Leaflet/blob/v1.9.4/LICENSE . Библиотечные bytes/node_modules в ZIP не включены; при поставке bundle сохранить copyright/license из **реально установленного** пакета, а не только эту ссылку. @types/leaflet package license и транзитивные notices проверить при registry/install gate; не присвоены по аналогии. Полный SBOM/lock сейчас BLOCKED.

Wikidata Q243 revision2545452862 — взяты только структурированные данные CC0; source URL, дата и преобразование в evidence/map-proof/public-point.json. Фотографии и текстовые статьи не включены. Данные OSM и условия tile service — разные слои; встроенная подпись «© OpenStreetMap contributors» с copyright link обязательна, не обрезать в live screenshots. SRC-LEAFLET-LICENSE, SRC-WD-LICENSE, SRC-OSM-COPYRIGHT, SRC-OSM-POLICY.

`src/core/links.ts` адаптирован из переданного MAP `evidence/reference/maps.ts`; исходная Geo schema перенесена byte-for-byte. Это пользовательский вход, не новый факт о сторонней лицензии. Входные SHA и lineage — INPUTS_USED.json. Никакой сторонний UI donor/скрин/шрифт не скопирован; functional CSS нового компонента не претендует на user-approved визуал.
