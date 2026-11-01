import { type ReactNode, useEffect, useId, useRef } from 'react'
import { XIcon } from '@phosphor-icons/react'
import { cx } from './kit'

/**
 * Bottom sheet that slides up like a tape door. Drag the handle down to dismiss:
 * tracks the finger 1:1, then commits based on release velocity or distance.
 */
export function Sheet({
  open,
  onClose,
  title,
  children,
  full = false,
  className,
  testId,
}: {
  open: boolean
  onClose: () => void
  title: ReactNode
  children: ReactNode
  full?: boolean
  className?: string
  testId?: string
}) {
  const panel = useRef<HTMLDivElement>(null)
  const drag = useRef<{ y0: number; t0: number; y: number; t: number; dy: number } | null>(null)
  const titleId = useId()

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    const prev = document.activeElement as HTMLElement | null
    panel.current?.focus()
    return () => {
      window.removeEventListener('keydown', onKey)
      prev?.focus?.()
    }
  }, [open, onClose])

  if (!open) return null

  const onPointerDown = (e: React.PointerEvent) => {
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    drag.current = { y0: e.clientY, t0: e.timeStamp, y: e.clientY, t: e.timeStamp, dy: 0 }
    if (panel.current) panel.current.style.transition = 'none'
  }
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current
    if (!d || !panel.current) return
    d.dy = Math.max(0, e.clientY - d.y0)
    // velocity sample
    d.t0 = d.t
    d.y = e.clientY
    d.t = e.timeStamp
    panel.current.style.transform = `translateY(${d.dy}px)`
  }
  const onPointerUp = (e: React.PointerEvent) => {
    const d = drag.current
    drag.current = null
    if (!d || !panel.current) return
    const dt = Math.max(1, e.timeStamp - d.t0)
    const v = (e.clientY - d.y) / dt // px per ms
    const h = panel.current.offsetHeight
    const commit = v > 0.5 || d.dy > h * 0.33
    panel.current.style.transition = 'transform 320ms cubic-bezier(0.32,0.72,0,1)'
    if (commit) {
      panel.current.style.transform = `translateY(${h}px)`
      window.setTimeout(onClose, 220)
    } else {
      panel.current.style.transform = 'translateY(0)'
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex flex-col justify-end" data-testid={testId}>
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-[rgb(15_9_5/0.62)] animate-[fade-in_200ms_ease-out]"
        onClick={onClose}
        tabIndex={-1}
      />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={cx(
          'relative mx-auto flex w-full max-w-[640px] flex-col rounded-t-[26px] bg-walnut shadow-[0_-12px_30px_rgb(0_0_0/0.45)] outline-none',
          'animate-[sheet-in_340ms_cubic-bezier(0.32,0.72,0,1)]',
          full ? 'h-[94dvh]' : 'max-h-[90dvh]',
          className,
        )}
      >
        <div
          className="flex cursor-grab touch-none items-center justify-center pt-3 pb-1"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          aria-hidden
        >
          <span className="h-1.5 w-12 rounded-full bg-walnut-3" />
        </div>
        <div className="flex items-center justify-between gap-3 px-5 pb-3">
          <h2 id={titleId} className="font-title text-[20px] leading-tight text-paper">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="piano-key flex h-12 w-12 items-center justify-center rounded-full bg-walnut-2 text-paper"
          >
            <XIcon size={22} weight="bold" />
          </button>
        </div>
        <div className="safe-bottom min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-6">{children}</div>
      </div>
    </div>
  )
}
