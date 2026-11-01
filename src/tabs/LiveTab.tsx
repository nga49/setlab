import { S } from '../strings'
import { EmptyState } from '../ui/kit'

export function LiveTab() {
  return (
    <section aria-labelledby="h-live" className="flex flex-col gap-4">
      <h1 id="h-live" className="font-title text-[28px] leading-none text-paper">{S.titles.live}</h1>
      <EmptyState title={S.comingSoon} />
    </section>
  )
}
