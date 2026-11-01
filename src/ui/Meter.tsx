import { arcTarget, type Arc } from '../engine/arcs'
import { cx } from './kit'

/** Small analogue meter for a 0..100 score (needle + scale). */
export function ScoreMeter({ score, size = 72, label = 'Set score', onPaper = false }: { score: number; size?: number; label?: string; onPaper?: boolean }) {
  const s = Math.max(0, Math.min(100, score))
  const deg = -60 + (s / 100) * 120
  const tone = s >= 75 ? '#5E8C61' : s >= 50 ? '#E8A33D' : '#B5462A'
  return (
    <span className="inline-flex flex-col items-center" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(s)} aria-label={`${label} ${Math.round(s)} of 100`}>
      <svg width={size} height={size * 0.62} viewBox="0 0 100 62" aria-hidden>
        <rect x="1" y="1" width="98" height="60" rx="8" fill="#F2E3C6" stroke="#8A8274" strokeWidth="2" />
        <path d="M18 50 A36 36 0 0 1 82 50" fill="none" stroke="#5E4C3A" strokeWidth="2" />
        <path d="M70 26 A36 36 0 0 1 82 50" fill="none" stroke="#B5462A" strokeWidth="4" opacity="0.25" />
        {[0, 25, 50, 75, 100].map((v) => {
          const a = ((-60 + (v / 100) * 120) * Math.PI) / 180
          return <line key={v} x1={50 + 32 * Math.sin(a)} y1={54 - 32 * Math.cos(a)} x2={50 + 38 * Math.sin(a)} y2={54 - 38 * Math.cos(a)} stroke="#5E4C3A" strokeWidth="2" />
        })}
        <line x1="50" y1="54" x2={50 + 34 * Math.sin((deg * Math.PI) / 180)} y2={54 - 34 * Math.cos((deg * Math.PI) / 180)} stroke={tone} strokeWidth="3" strokeLinecap="round" />
        <circle cx="50" cy="54" r="4" fill="#2B1D14" />
      </svg>
      <span className={cx('font-mono text-[15px] font-bold leading-none', onPaper ? 'text-ink' : 'text-paper')}>{Math.round(s)}</span>
    </span>
  )
}

/** Energy sparkline (solid) against the target arc (dashed). */
export function EnergySpark({ energies, positions, arc, className, height = 44 }: { energies: number[]; positions: number[]; arc: Arc; className?: string; height?: number }) {
  const W = 200
  const H = 50
  const y = (e: number) => H - 4 - ((e - 1) / 9) * (H - 8)
  const pts = energies.map((e, i) => `${(positions[i] ?? 0) * W},${y(e)}`).join(' ')
  const target = Array.from({ length: 41 }, (_, i) => `${(i / 40) * W},${y(arcTarget(arc, i / 40))}`).join(' ')
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className={cx('w-full', className)} style={{ height }} role="img" aria-label="Energy curve against the target arc">
      <polyline points={target} fill="none" stroke="#8FC1B5" strokeWidth="2" strokeDasharray="5 4" vectorEffect="non-scaling-stroke" />
      <polyline points={pts} fill="none" stroke="#E8A33D" strokeWidth="2.5" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      {energies.map((e, i) => (
        <circle key={i} cx={(positions[i] ?? 0) * W} cy={y(e)} r="2.4" fill="#E8A33D" />
      ))}
    </svg>
  )
}
