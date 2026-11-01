import { type ReactNode, useRef } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { cx } from './kit'

/** Virtualized list with fixed row height. Stays smooth with 5,000 rows. */
export function VirtualList<T>({
  items,
  rowHeight = 60,
  render,
  className,
  getKey,
  testId,
  overscan = 8,
}: {
  items: T[]
  rowHeight?: number
  render: (item: T, index: number) => ReactNode
  className?: string
  getKey: (item: T) => string
  testId?: string
  overscan?: number
}) {
  const parent = useRef<HTMLDivElement>(null)
  const v = useVirtualizer({
    count: items.length,
    getScrollElement: () => parent.current,
    estimateSize: () => rowHeight,
    overscan,
    getItemKey: (i) => getKey(items[i]!),
    initialRect: { width: 390, height: 600 },
  })
  return (
    <div ref={parent} className={cx('min-h-0 overflow-y-auto overscroll-contain', className)} data-testid={testId}>
      <div style={{ height: v.getTotalSize(), position: 'relative' }}>
        {v.getVirtualItems().map((r) => (
          <div
            key={r.key}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, height: rowHeight, transform: `translateY(${r.start}px)` }}
            className="border-b border-dashed border-paper-dim/15"
          >
            {render(items[r.index]!, r.index)}
          </div>
        ))}
      </div>
    </div>
  )
}
