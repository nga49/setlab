import { S } from '../strings'
import { EmptyState } from '../ui/kit'

export function PracticeTab() {
  return (
    <section aria-labelledby="h-practice" className="flex flex-col gap-4">
      <h1 id="h-practice" className="font-title text-[28px] leading-none text-paper">{S.titles.practice}</h1>
      <EmptyState title={S.comingSoon} />
    </section>
  )
}
