import { CONTRACT } from '../port/contracts.ts';
import type { Command, Envelope, View } from '../port/contracts.ts';
/** Copies exact server revisions, never recomputes consent or changes an electorate. */
export function envelopeFor(view: View, command: Command, idempotencyKey: string): Envelope {
  if (!idempotencyKey.trim()) throw new Error('Missing idempotency key');
  if (command.type === 'APPROVE_JOIN' && (!command.slotId || !command.actorId || !command.requestId)) {
    throw new Error('Choose an explicit request, actor and slot');
  }
  let expected = view.revision ? { ...view.revision } : null;
  if ('optionId' in command) {
    if (view.kind !== 'PLAN') throw new Error('Plan view is required');
    const option = view.options.find(item => item.optionId === command.optionId);
    if (!option || !expected) throw new Error('Refresh the option before writing');
    expected = { ...expected, snapshot_id: option.snapshotId, terms_revision: option.termsRevision };
  }
  if (command.type === 'CONFIRM_SELECTED') {
    if (view.kind !== 'PLAN') throw new Error('Plan view is required');
    const option = view.options.find(item => item.optionId === view.selectedOptionId);
    if (!option || !expected) throw new Error('Refresh the selected option');
    expected = { ...expected, snapshot_id: option.snapshotId, terms_revision: option.termsRevision };
  }
  // Equal CONFIRMED values across distinct revisions are intentionally NOT deduplicated here.
  return { contract: CONTRACT, idempotencyKey, expected, command: structuredClone(command) };
}
