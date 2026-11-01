/** SVG geometry for the Camelot dial. Number n sits at clock position n (12 at the top). */

export const SIZE = 400
export const C = SIZE / 2
export const R_OUTER = 188
export const R_MID = 130
export const R_INNER = 74
export const GAP_DEG = 0.9

export function angleOf(num: number): number {
  return (num % 12) * 30
}

export function polar(r: number, deg: number): [number, number] {
  const a = (deg * Math.PI) / 180
  return [C + r * Math.sin(a), C - r * Math.cos(a)]
}

/** Annular sector path between radii r0 < r1, centred on `deg`, 30° wide minus a gap. */
export function sectorPath(deg: number, r0: number, r1: number): string {
  const a0 = deg - 15 + GAP_DEG / 2
  const a1 = deg + 15 - GAP_DEG / 2
  const [x0, y0] = polar(r1, a0)
  const [x1, y1] = polar(r1, a1)
  const [x2, y2] = polar(r0, a1)
  const [x3, y3] = polar(r0, a0)
  const f = (n: number) => n.toFixed(2)
  return `M${f(x0)} ${f(y0)}A${r1} ${r1} 0 0 1 ${f(x1)} ${f(y1)}L${f(x2)} ${f(y2)}A${r0} ${r0} 0 0 0 ${f(x3)} ${f(y3)}Z`
}

/** Tick marks around the dial (rotary knob notches). */
export function notches(count = 72, r0 = 192, r1 = 199): string {
  let d = ''
  for (let i = 0; i < count; i++) {
    const deg = (i * 360) / count
    const long = i % 6 === 0
    const [x0, y0] = polar(long ? r0 - 3 : r0, deg)
    const [x1, y1] = polar(r1, deg)
    d += `M${x0.toFixed(1)} ${y0.toFixed(1)}L${x1.toFixed(1)} ${y1.toFixed(1)}`
  }
  return d
}
