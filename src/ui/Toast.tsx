import { createContext, type ReactNode, useCallback, useContext, useRef, useState } from 'react'

interface ToastMsg {
  id: number
  text: string
  tone: 'info' | 'error'
}

const Ctx = createContext<(text: string, tone?: 'info' | 'error') => void>(() => {})

export function ToastProvider({ children }: { children: ReactNode }) {
  const [msgs, setMsgs] = useState<ToastMsg[]>([])
  const n = useRef(0)
  const push = useCallback((text: string, tone: 'info' | 'error' = 'info') => {
    const id = ++n.current
    setMsgs((m) => [...m.slice(-2), { id, text, tone }])
    window.setTimeout(() => setMsgs((m) => m.filter((x) => x.id !== id)), tone === 'error' ? 5000 : 2600)
  }, [])
  return (
    <Ctx.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-[104px] z-[60] flex flex-col items-center gap-2 px-4" aria-live="polite">
        {msgs.map((m) => (
          <div
            key={m.id}
            role="status"
            className={
              'animate-[toast-in_260ms_cubic-bezier(0.32,0.72,0,1)] rounded-full px-5 py-3 font-mono text-[14px] font-bold shadow-[0_8px_20px_rgb(0_0_0/0.4)] ' +
              (m.tone === 'error' ? 'bg-rust text-paper' : 'bg-paper text-ink')
            }
          >
            {m.text}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  )
}

export function useToast() {
  return useContext(Ctx)
}
