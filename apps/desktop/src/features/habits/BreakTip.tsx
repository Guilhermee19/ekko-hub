import { Cpu } from 'lucide-react'
import { Button, Card } from '@/ui/primitives'
import { useTimers } from '@/features/timers/store'

/** Mock wellbeing nudge; later driven by real PC load + time at the keyboard. */
export function BreakTip() {
  return (
    <Card className="flex flex-col gap-2 border-accent/25">
      <div className="flex items-center gap-1.5 text-muted">
        <Cpu className="size-3.5 text-accent" aria-hidden />
        <span className="label-hud">Dica</span>
      </div>
      <p className="text-[13px] leading-snug">
        PC sobrecarregado? <span className="text-accent">Faça uma pausa.</span>
      </p>
      <p className="text-[11px] text-muted">
        CPU em <span className="font-mono tabular-nums">87%</span> e você está há{' '}
        <span className="font-mono tabular-nums">1 h 50 min</span> sem levantar.
      </p>
      <Button className="self-start" onClick={() => useTimers.getState().addTimer('Pausa', 5 * 60)}>
        Pausa de 5 min
      </Button>
    </Card>
  )
}
