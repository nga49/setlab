import { S } from '../strings'
import { EmptyState } from '../ui/kit'

/** Missing tracks finder (built in Phase 6). */
export function MissingTab() {
  return <EmptyState title="Missing tracks finder" hint={S.noKeyHint} />
}
