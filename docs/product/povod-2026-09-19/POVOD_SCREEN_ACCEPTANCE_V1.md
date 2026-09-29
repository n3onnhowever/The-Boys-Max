# ПОВОД — SCREEN ACCEPTANCE CHECKLIST v1

## S00 Launch / MAX identity
- [ ] Нет email/password регистрации.
- [ ] Platform identity валидируется сервером.
- [ ] Повторный вход открывает существующий профиль.
- [ ] Есть loading и error.
- [ ] Социальный план не требуется.

## S01 Onboarding
- [ ] Интересы выбираются и снимаются.
- [ ] Onboarding можно пропустить.
- [ ] Домашний город сохраняется.
- [ ] Бюджет/время не обязательны.
- [ ] Нет искусственного minimum N interests.

## S02 Для тебя
- [ ] Каждая карточка содержит occurrence date/time.
- [ ] Price UNKNOWN не отображается как 0.
- [ ] Есть source/provenance.
- [ ] Recommendation reason объясним.
- [ ] Ended occurrence не маркируется как future.
- [ ] Save работает.
- [ ] Group не обязателен.

## S03 Search + Filters
- [ ] Date/category/budget/city/time filters работают.
- [ ] Applied state видим.
- [ ] Empty result не снимает filters автоматически.
- [ ] Source failure отличается от zero matches.
- [ ] Structured filters работают без LLM.

## S04 Detail
- [ ] Event и occurrence различимы.
- [ ] Date/time/place/price/source присутствуют или честно UNKNOWN.
- [ ] Primary CTA честно ведёт к source.
- [ ] Нет ложного ticket-purchase claim.
- [ ] Save/follow работают.
- [ ] Invite явный и secondary.

## S05 Map
- [ ] Selected marker = selected occurrence.
- [ ] Нет fake coordinates.
- [ ] Missing coordinates даёт fallback.
- [ ] Bottom sheet синхронизирован.
- [ ] Poster decoration не мешает карте.

## S06 Saved
- [ ] Favorite сохраняется на сервере.
- [ ] Remove работает.
- [ ] Material change виден.
- [ ] Ended/unavailable не исчезает молча.

## S07 Мой Повод
- [ ] Interests редактируются.
- [ ] Follows управляются.
- [ ] Home city/budget/time/radius сохраняются.
- [ ] Smart notifications можно выключить.
- [ ] Profile не раскрывается shared plan автоматически.

## S08 Follow
- [ ] P0: artist/topic.
- [ ] Duplicate follow невозможен.
- [ ] Unfollow работает.
- [ ] Follow и notification consent не смешиваются без явного решения.

## S09 Smart Povod
- [ ] Notification ведёт в exact occurrence.
- [ ] Ended occurrence не отправляется как актуальный.
- [ ] Цена не выдумывается.
- [ ] Причины соответствия вычислены.
- [ ] После изменения detail показывает текущие факты.

## S10 Invite
- [ ] Запускается только явным действием.
- [ ] Передаётся event/occurrence/source/warnings.
- [ ] Raw query/history не передаются.
- [ ] Solo flow уже завершён до invite.

## S11 Shared Plan
- [ ] Preference != commitment.
- [ ] Нельзя подтвердить за другого.
- [ ] Interest count != availability.
- [ ] Private profile не раскрывается.

## S12 Re-confirm
- [ ] Material changes создают new revision.
- [ ] Old commitment не считается актуальным.
- [ ] Пользователь видит, что изменилось.
- [ ] Требуется новый explicit confirmation.
