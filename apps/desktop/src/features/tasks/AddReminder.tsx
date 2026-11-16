import { Plus } from 'lucide-react'
import { useState } from 'react'
import { IconButton } from '@/ui/primitives'
import { dayAt } from './due'
import { useTasks } from './store'

/** Next time the clock shows `hh:mm`: today, or tomorrow if it already passed. */
export function nextAt(time: string, now: number): number | null {
  const [h, m] = time.split(':').map(Number)
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null
  const today = dayAt(now, h, m)
  return today > now ? today : dayAt(now, h, m, 1)
}

/** Text + time; Enter adds. The backend fires it on time (alarm + notification). */
export function AddReminder({ now }: { now: number }) {
  const add = useTasks((s) => s.addReminder)
  const [text, setText] = useState('')
  const [time, setTime] = useState('')
  const at = nextAt(time, now)
  const ready = text.trim() !== '' && at !== null

  const submit = () => {
    // Fresh clock: `now` may be up to 30 s old.
    const when = nextAt(time, Date.now())
    if (!ready || when === null) return
    void add(text, when)
    setText('')
    setTime('')
  }

  return (
    <div className="flex items-center gap-1 rounded-lg border border-border-soft bg-base/60 py-0.5 pr-0.5 pl-2 focus-within:border-accent/50">
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && submit()}
        aria-label="Novo lembrete"
        placeholder="Lembrar de…"
        className="min-w-0 flex-1 bg-transparent text-[12px] outline-none placeholder:text-muted"
      />
      <input
        type="time"
        value={time}
        onChange={(e) => setTime(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && submit()}
        aria-label="Horário do lembrete"
        className="w-[62px] bg-transparent font-mono text-[11px] text-muted tabular-nums outline-none"
      />
      <IconButton
        label="Adicionar lembrete"
        onClick={submit}
        disabled={!ready}
        className="size-6 disabled:opacity-40"
      >
        <Plus className="size-3.5" />
      </IconButton>
    </div>
  )
}
