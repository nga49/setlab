import { S } from '../strings'
import { EmptyState } from '../ui/kit'

export function SetsTab() {
  return (
    <section aria-labelledby="h-sets" className="flex flex-col gap-4">
      <h1 id="h-sets" className="font-title text-[28px] leading-none text-paper">{S.titles.sets}</h1>
      <EmptyState title={S.comingSoon} />
    </section>
  )
}
