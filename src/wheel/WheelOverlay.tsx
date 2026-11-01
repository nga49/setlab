import { memo, useEffect, useMemo, useRef, useState } from 'react'
import { XIcon } from '@phosphor-icons/react'
import { ALL_KEYS, CHIP_INK, keyColor, musicalName, splitCamelot, wheelHighlight, type Highlight } from '../engine/camelot'
import { useApp } from '../state/app'
import { useLibrary } from '../data/LibraryProvider'
import { S } from '../strings'
import { KeyChip, cx } from '../ui/kit'
import { angleOf, C, notches, polar, R_INNER, R_MID, R_OUTER, sectorPath, SIZE } from './geometry'

const NOTCHES = notches()

interface SegProps {
  k: string
  hl: Highlight | null
  count: number
  onTap: (k: string) => void
}

const Segment = memo(function Segment({ k, hl, count, onTap }: SegProps) {
  const [num, letter] = splitCamelot(k)
  const deg = angleOf(num)
  const outer = letter === 'B'
  const r0 = outer ? R_MID + 2 : R_INNER
  const r1 = outer ? R_OUTER : R_MID - 2
  const [tx, ty] = polar((r0 + r1) / 2, deg)
  const dim = hl === 'dim'
  const mark = hl === 'compatible' ? '✓' : hl === 'boost' ? '⬆' : hl === 'selected' ? '●' : ''
  const stroke =
    hl === 'selected' ? '#F2E3C6' : hl === 'compatible' ? '#3E6B41' : hl === 'boost' ? '#9C6417' : 'rgba(0,0,0,0.35)'
  const label = `${k} ${musicalName(k)}${count ? `, ${count} tracks` : ''}${hl === 'compatible' ? ', mixes well' : hl === 'boost' ? ', energy boost' : hl === 'selected' ? ', selected' : ''}`
  return (
    <g
      role="button"
      tabIndex={0}
      aria-label={label}
      aria-pressed={hl === 'selected'}
      data-key={k}
      data-hl={hl ?? 'none'}
      onClick={() => onTap(k)}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onTap(k)}
      style={{ cursor: 'pointer', opacity: dim ? 0.24 : 1, transition: 'opacity 220ms cubic-bezier(0.32,0.72,0,1)' }}
      className="outline-none focus-visible:[&>path]:stroke-mustard"
    >
      <path d={sectorPath(deg, r0, r1)} fill={keyColor(k)} stroke={stroke} strokeWidth={hl && hl !== 'dim' ? 3.5 : 1} />
      <text x={tx} y={ty - (outer ? 6 : 5)} textAnchor="middle" fontFamily="Space Mono, monospace" fontWeight={700} fontSize={outer ? 17 : 15} fill={CHIP_INK}>
        {mark ? `${mark}${k}` : k}
      </text>
      <text x={tx} y={ty + (outer ? 11 : 10)} textAnchor="middle" fontFamily="Space Grotesk, sans-serif" fontWeight={700} fontSize={outer ? 12 : 11} fill={CHIP_INK} opacity={0.8}>
        {musicalName(k)}
        {count ? ` ·${count}` : ''}
      </text>
    </g>
  )
})

export default function WheelOverlay() {
  const app = useApp()
  const lib = useLibrary()
  const nowKey = app.nowPlayingId ? (lib.byId.get(app.nowPlayingId)?.camelot ?? null) : null
  const [selected, setSelected] = useState<string | null>(app.wheelKey ?? nowKey)
  const root = useRef<HTMLDivElement>(null)
  const drag = useRef<{ y0: number; dy: number; t0: number; active: boolean } | null>(null)

  const counts = useMemo(() => {
    const m = new Map<string, number>()
    for (const t of lib.owned) if (t.camelot) m.set(t.camelot, (m.get(t.camelot) ?? 0) + 1)
    return m
  }, [lib.owned])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && app.closeWheel()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [app])

  const hl = (k: string): Highlight | null => (selected ? wheelHighlight(selected, k) : null)
  const related = selected
    ? ALL_KEYS.filter((k) => hl(k) !== 'dim').sort((a, b) => order(hl(a)) - order(hl(b)))
    : []
  const pointerDeg = selected ? angleOf(splitCamelot(selected)[0]) : 0

  const openList = (k: string) => {
    app.setLibraryKeyFilter(k)
    app.go('library')
    app.closeWheel()
  }

  // Swipe down to close (only after a clear vertical drag, so taps still work).
  const onPointerDown = (e: React.PointerEvent) => {
    drag.current = { y0: e.clientY, dy: 0, t0: e.timeStamp, active: false }
  }
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current
    if (!d || !root.current) return
    d.dy = e.clientY - d.y0
    if (!d.active && d.dy > 12) {
      d.active = true
      root.current.setPointerCapture(e.pointerId)
      root.current.style.transition = 'none'
    }
    if (d.active) root.current.style.transform = `translateY(${Math.max(0, d.dy)}px)`
  }
  const onPointerUp = (e: React.PointerEvent) => {
    const d = drag.current
    drag.current = null
    if (!d?.active || !root.current) return
    const v = d.dy / Math.max(1, e.timeStamp - d.t0)
    root.current.style.transition = 'transform 300ms cubic-bezier(0.32,0.72,0,1)'
    if (d.dy > 140 || v > 0.6) {
      root.current.style.transform = 'translateY(100%)'
      window.setTimeout(app.closeWheel, 200)
    } else root.current.style.transform = 'translateY(0)'
  }

  return (
    <div
      ref={root}
      role="dialog"
      aria-modal="true"
      aria-label={S.titles.wheel}
      data-testid="wheel"
      className="wood-grain safe-top fixed inset-0 z-50 flex flex-col bg-walnut"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <div className="flex touch-none justify-center pt-1" aria-hidden>
        <span className="h-1.5 w-12 rounded-full bg-walnut-3" />
      </div>
      <div className="flex touch-none items-center justify-between px-4 py-2">
        <h1 className="font-title text-[22px] text-paper">{S.titles.wheel}</h1>
        <button
          type="button"
          onClick={app.closeWheel}
          aria-label={S.close}
          data-testid="wheel-close"
          className="piano-key flex h-12 w-12 items-center justify-center rounded-full bg-walnut-2 text-paper"
        >
          <XIcon size={22} weight="bold" />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-8">
        <div className="mx-auto w-full max-w-[440px]">
          <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="h-auto w-full touch-none select-none" role="group" aria-label="Camelot keys">
            <defs>
              <radialGradient id="knob" cx="0.38" cy="0.32" r="0.8">
                <stop offset="0" stopColor="#F1ECE1" />
                <stop offset="0.7" stopColor="#B9B2A3" />
                <stop offset="1" stopColor="#8A8274" />
              </radialGradient>
            </defs>
            <circle cx={C} cy={C} r={199} fill="#1E140E" />
            <path d={NOTCHES} stroke="#8A8274" strokeWidth={1.5} />
            {ALL_KEYS.map((k) => (
              <Segment key={k} k={k} hl={hl(k)} count={counts.get(k) ?? 0} onTap={(x) => setSelected((s) => (s === x ? null : x))} />
            ))}
            <circle cx={C} cy={C} r={R_INNER - 4} fill="url(#knob)" stroke="#5B5346" strokeWidth={2} />
            <g
              style={{ transform: `rotate(${pointerDeg}deg)`, transformOrigin: `${C}px ${C}px`, transition: 'transform 420ms cubic-bezier(0.32,0.72,0,1)' }}
              aria-hidden
            >
              <rect x={C - 3} y={C - R_INNER + 8} width={6} height={18} rx={3} fill={selected ? '#B5462A' : '#5B5346'} />
            </g>
            <text x={C} y={C + 4} textAnchor="middle" fontFamily="Space Mono, monospace" fontWeight={700} fontSize={26} fill="#2B1D14">
              {selected ?? '··'}
            </text>
            <text x={C} y={C + 24} textAnchor="middle" fontFamily="Space Grotesk, sans-serif" fontWeight={700} fontSize={13} fill="#5E4C3A">
              {selected ? musicalName(selected) : 'tap a key'}
            </text>
          </svg>

          <div className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1 font-mono text-[12px] text-paper-dim" aria-hidden>
            <span>✓ mixes</span>
            <span>⬆ energy boost</span>
            <span>● selected</span>
          </div>

          <section className="mt-4" aria-label="In your library">
            <h2 className="mb-2 font-mono text-[12px] font-bold uppercase tracking-[0.14em] text-paper-dim">
              {selected ? 'In your library' : 'Tap a key to see what mixes'}
            </h2>
            {selected ? (
              <ul className="flex flex-wrap gap-2" data-testid="wheel-counts">
                {related.map((k) => (
                  <li key={k}>
                    <button
                      type="button"
                      onClick={() => openList(k)}
                      className={cx(
                        'piano-key flex min-h-12 items-center gap-2 rounded-xl border px-2.5',
                        hl(k) === 'boost' ? 'border-mustard/60' : 'border-olive/70',
                        'bg-walnut-2',
                      )}
                      aria-label={`${k}: ${counts.get(k) ?? 0} tracks. Show them`}
                    >
                      <KeyChip camelot={k} size="sm" />
                      <span className="font-mono text-[15px] font-bold text-paper">({counts.get(k) ?? 0})</span>
                      <span aria-hidden className="text-[12px] text-paper-dim">{hl(k) === 'boost' ? '⬆' : hl(k) === 'selected' ? '●' : '✓'}</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </section>
        </div>
      </div>
    </div>
  )
}

function order(h: Highlight | null): number {
  return h === 'selected' ? 0 : h === 'compatible' ? 1 : h === 'boost' ? 2 : 3
}
