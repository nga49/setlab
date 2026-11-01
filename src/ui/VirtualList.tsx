import { type ReactNode, useRef, useState } from 'react'
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
  onPullRefresh,
}: {
  items: T[]
  rowHeight?: number
  render: (item: T, index: number) => ReactNode
  className?: string
  getKey: (item: T) => string
  testId?: string
  overscan?: number
  /** Pull down at the top to refresh (e.g. library sync). */
  onPullRefresh?: () => Promise<unknown>
}) {
  const parent = useRef<HTMLDivElement>(null)
  const pull = useRef<{ y0: number } | null>(null)
  const [pullPx, setPullPx] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const v = useVirtualizer({
    count: items.length,
    getScrollElement: () => parent.current,
    estimateSize: () => rowHeight,
    overscan,
    getItemKey: (i) => getKey(items[i]!),
    initialRect: { width: 390, height: 600 },
  })
  return (
    <div
      ref={parent}
      className={cx('min-h-0 overflow-y-auto overscroll-contain', className)}
      data-testid={testId}
      onTouchStart={(e) => {
        if (onPullRefresh && parent.current?.scrollTop === 0) pull.current = { y0: e.touches[0]!.clientY }
      }}
      onTouchMove={(e) => {
        if (!pull.current) return
        setPullPx(Math.max(0, Math.min(90, (e.touches[0]!.clientY - pull.current.y0) * 0.5)))
      }}
      onTouchEnd={async () => {
        const go = pullPx > 60
        pull.current = null
        setPullPx(0)
        if (go && onPullRefresh) {
          setRefreshing(true)
          await onPullRefresh()
          setRefreshing(false)
        }
      }}
    >
      {onPullRefresh && (pullPx > 0 || refreshing) ? (
        <div className="flex items-center justify-center font-mono text-[12px] text-paper-dim" style={{ height: refreshing ? 36 : pullPx }} role="status">
          {refreshing ? 'Syncing…' : pullPx > 60 ? 'Release to sync' : 'Pull to sync'}
        </div>
      ) : null}
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
