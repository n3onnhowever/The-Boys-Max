import type { InviteView } from '../port/contracts.ts';
import type { ViewController } from '../core/controller.ts';
const copy = {
  REQUESTABLE:'Организатор должен одобрить ваше присоединение. До этого данные встречи закрыты.',
  PENDING:'Запрос отправлен. Дождитесь решения организатора.',
  ACTIVE:'Вы приняты в план.', EXPIRED:'Срок действия приглашения истёк. Попросите организатора прислать новую ссылку.',
  REJECTED:'Запрос не одобрен. Уточните детали у организатора.',
} as const;
export function InvitePanel({view,controller,busy}:{view:InviteView;controller:ViewController;busy:boolean}) {
  return <section className="container max-w-4xl px-4 py-8">
    <h1 tabIndex={-1}>Приглашение</h1><p>{copy[view.state]}</p>
    {view.state === 'REQUESTABLE' && <button className="primary" disabled={busy || !view.actions.includes('REQUEST_JOIN')} onClick={() => void controller.execute({type:'REQUEST_JOIN',inviteRef:view.inviteRef})}>Попросить доступ</button>}
    {view.state === 'PENDING' && <button disabled={busy} onClick={() => void controller.refresh()}>Проверить решение</button>}
    {view.state === 'ACTIVE' && view.activePlanId && <button className="primary" disabled={busy} onClick={() => void controller.load({kind:'PLAN',planId:view.activePlanId ?? ''})}>Открыть план</button>}
  </section>;
}
