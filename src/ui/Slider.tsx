import { useId } from 'react'
import { cx } from './kit'

/** Single-value slider with a visible label and value. 48 px touch height. */
export function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  format = (v) => String(v),
  testId,
}: {
  label: string
  value: number
  min: number
  max: number
  step?: number
  onChange: (v: number) => void
  format?: (v: number) => string
  testId?: string
}) {
  const id = useId()
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between">
        <label htmlFor={id} className="text-[14px] text-paper-dim">{label}</label>
        <span className="font-mono text-[16px] font-bold text-mustard">{format(value)}</span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="tape-range h-12 w-full"
        data-testid={testId}
      />
    </div>
  )
}

/** Dual-handle range slider built from two overlaid range inputs. */
export function RangeSlider({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  format = (v) => String(v),
  testId,
}: {
  label: string
  value: [number, number]
  min: number
  max: number
  step?: number
  onChange: (v: [number, number]) => void
  format?: (v: number) => string
  testId?: string
}) {
  const id = useId()
  const [a, b] = value
  const pct = (v: number) => ((v - min) / (max - min)) * 100
  return (
    <div className="flex flex-col gap-1" data-testid={testId}>
      <div className="flex items-baseline justify-between">
        <span id={id} className="text-[14px] text-paper-dim">{label}</span>
        <span className="font-mono text-[16px] font-bold text-mustard">
          {format(a)} to {format(b)}
        </span>
      </div>
      <div className="relative h-12">
        <div className="absolute inset-x-0 top-1/2 h-2 -translate-y-1/2 rounded-full bg-walnut-3" />
        <div
          className="absolute top-1/2 h-2 -translate-y-1/2 rounded-full bg-mustard"
          style={{ left: `${pct(a)}%`, right: `${100 - pct(b)}%` }}
        />
        <input
          type="range"
          aria-labelledby={id}
          aria-label={`${label} from`}
          min={min}
          max={max}
          step={step}
          value={a}
          onChange={(e) => onChange([Math.min(Number(e.target.value), b), b])}
          className={cx('tape-range dual absolute inset-0 h-12 w-full')}
        />
        <input
          type="range"
          aria-label={`${label} to`}
          min={min}
          max={max}
          step={step}
          value={b}
          onChange={(e) => onChange([a, Math.max(Number(e.target.value), a)])}
          className="tape-range dual absolute inset-0 h-12 w-full"
        />
      </div>
    </div>
  )
}
