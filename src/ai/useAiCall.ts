import { useCallback, useState } from 'react'
import { AiError, type CallOptions } from './client'
import { useToast } from '../ui/Toast'

/** Runs an AI call with busy state, plain-words errors and the over-budget confirmation. */
export function useAiCall() {
  const [busy, setBusy] = useState(false)
  const toast = useToast()
  const run = useCallback(
    async <T,>(fn: (o: CallOptions) => Promise<T>): Promise<T | null> => {
      setBusy(true)
      try {
        try {
          return await fn({})
        } catch (e) {
          if (e instanceof AiError && e.kind === 'budget' && window.confirm(`${e.message}\n\nSpend more this month?`)) return await fn({ confirmOverBudget: true })
          throw e
        }
      } catch (e) {
        toast(e instanceof Error ? e.message : 'AI call failed', 'error')
        return null
      } finally {
        setBusy(false)
      }
    },
    [toast],
  )
  return { busy, run }
}
