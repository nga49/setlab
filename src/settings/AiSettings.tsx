import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { setSetting, useSettings } from '../db/settings'
import { DEFAULT_FAST_MODEL, DEFAULT_MAIN_MODEL, MODELS } from '../ai/models'
import { monthKey } from '../ai/client'
import { S } from '../strings'
import { cx, SectionLabel, VuMeter } from '../ui/kit'

const field = 'h-12 rounded-lg bg-walnut-2 px-3 text-[16px] text-paper outline-none placeholder:text-paper-dim/60 focus-visible:ring-2 focus-visible:ring-mustard'

/** Claude API key, model choices, monthly budget and cost meter (docs/AI.md §1, §3). */
export function AiSettings() {
  const s = useSettings()
  const usage = useLiveQuery(() => db.aiUsage.get(monthKey()), [])
  const [key, setKey] = useState(s.aiKey)
  useEffect(() => setKey(s.aiKey), [s.aiKey])
  const spentEur = (usage?.costUsd ?? 0) * s.eurPerUsd
  const ratio = s.aiBudgetEur > 0 ? spentEur / s.aiBudgetEur : 0
  const level = ratio >= 1 ? 'over' : ratio >= 0.8 ? 'warn' : 'ok'

  return (
    <section className="flex flex-col gap-3" aria-labelledby="s-ai">
      <SectionLabel>
        <span id="s-ai">🟣 {S.settings.ai}</span>
      </SectionLabel>
      <label className="flex flex-col gap-1">
        <span className="text-[14px] text-paper-dim">Claude API key</span>
        <input
          type="password"
          autoComplete="off"
          value={key}
          placeholder="sk-ant-…"
          onChange={(e) => setKey(e.target.value)}
          onBlur={() => setSetting('aiKey', key.trim())}
          className={field}
          data-testid="ai-key"
        />
        <span className="text-[12px] text-paper-dim/80">From console.anthropic.com. Stored on this phone only, sent only to Anthropic. Without a key everything except AI search and estimates works.</span>
      </label>
      <div className="grid grid-cols-1 gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-[14px] text-paper-dim">Fast model (estimates, tips)</span>
          <select value={s.aiFastModel || DEFAULT_FAST_MODEL} onChange={(e) => setSetting('aiFastModel', e.target.value)} className={field}>
            {MODELS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label} · ${m.inputPerM}/${m.outputPerM} per M
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[14px] text-paper-dim">Main model (web search discovery)</span>
          <select value={s.aiMainModel || DEFAULT_MAIN_MODEL} onChange={(e) => setSetting('aiMainModel', e.target.value)} className={field}>
            {MODELS.filter((m) => m.webSearch).map((m) => (
              <option key={m.id} value={m.id}>
                {m.label} · ${m.inputPerM}/${m.outputPerM} per M
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-[14px] text-paper-dim">Monthly budget (€)</span>
          <input inputMode="decimal" value={s.aiBudgetEur} onChange={(e) => setSetting('aiBudgetEur', Math.max(0, Number(e.target.value) || 0))} className={field} data-testid="ai-budget" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[14px] text-paper-dim">€ per $1 (approx.)</span>
          <input inputMode="decimal" value={s.eurPerUsd} onChange={(e) => setSetting('eurPerUsd', Math.max(0.1, Number(e.target.value) || 0.92))} className={field} />
        </label>
      </div>
      <div className={cx('flex flex-col gap-2 rounded-xl p-3', level === 'over' ? 'bg-rust/25' : level === 'warn' ? 'bg-mustard/20' : 'bg-walnut-2')} data-testid="ai-meter" role="status">
        <p className="font-mono text-[14px] text-paper">
          This month: ~€{spentEur.toFixed(2)} of €{s.aiBudgetEur}
          {level === 'warn' ? ' · ⚠️ 80% used' : level === 'over' ? ' · ⛔ budget reached: AI asks before each call' : ''}
        </p>
        <VuMeter value={Math.min(10, ratio * 10)} label="Budget used" />
        <p className="font-mono text-[11px] text-paper-dim">
          {usage?.calls ?? 0} calls · {(usage?.inputTokens ?? 0).toLocaleString()} in / {(usage?.outputTokens ?? 0).toLocaleString()} out tokens · {usage?.webSearches ?? 0} web searches. Prices are approximate.
        </p>
      </div>
    </section>
  )
}
