import { S } from '../strings'
import { EmptyState } from '../ui/kit'

export function LibraryTab() {
  return (
    <section aria-labelledby="h-library" className="flex flex-col gap-4">
      <h1 id="h-library" className="font-title text-[28px] leading-none text-paper">{S.titles.library}</h1>
      <EmptyState title={S.comingSoon} />
    </section>
  )
}
