/** Optional tape-deck click on piano-key presses (off by default; Settings › Click sounds). */
let ctx: AudioContext | null = null

export function playClick(): void {
  try {
    ctx ??= new AudioContext()
    const t = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'square'
    osc.frequency.setValueAtTime(1800, t)
    osc.frequency.exponentialRampToValueAtTime(400, t + 0.03)
    gain.gain.setValueAtTime(0.08, t)
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.04)
    osc.connect(gain).connect(ctx.destination)
    osc.start(t)
    osc.stop(t + 0.05)
  } catch {
    /* audio not available */
  }
}

/** Listen for presses on any .piano-key while enabled. Returns an unsubscribe function. */
export function installClickSounds(): () => void {
  const on = (e: PointerEvent) => {
    if ((e.target as HTMLElement | null)?.closest?.('.piano-key')) playClick()
  }
  window.addEventListener('pointerdown', on, { passive: true })
  return () => window.removeEventListener('pointerdown', on)
}
