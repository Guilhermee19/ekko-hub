import { Music2 } from 'lucide-react'
import { Button } from '@/ui/primitives'
import { useSettings } from '@/stores/settings'
import { useMusic } from './store'

/** Shown while no Spotify account is linked (prototype: header switch). */
export function ConnectBanner() {
  const setConnected = useMusic((s) => s.setConnected)
  const name = useSettings((s) => s.settings.assistantName)
  return (
    <div className="animate-rise-in relative overflow-hidden rounded-xl border border-accent/30 bg-surface p-4">
      <div
        aria-hidden
        className="absolute -top-10 -right-10 size-32 rounded-full bg-accent/15 blur-2xl"
      />
      <div className="relative flex flex-col gap-3">
        <span className="grid size-10 place-items-center rounded-full bg-accent/15 text-accent">
          <Music2 className="hud-glow size-5" />
        </span>
        <div>
          <div className="text-[15px] font-semibold">Conecte sua conta do Spotify</div>
          <p className="mt-0.5 text-[12px] text-muted">
            Controle a música por voz, veja o que está tocando no notch e troque de dispositivo sem
            sair do que está fazendo. Requer Spotify Premium.
          </p>
        </div>
        <ul className="flex flex-col gap-1 text-[12px] text-muted">
          <li>“Ei, {name}, toca lo-fi”</li>
          <li>“Pula essa” · “Volume em 30%”</li>
        </ul>
        <Button variant="primary" className="self-start" onClick={() => setConnected(true)}>
          Conectar Spotify
        </Button>
      </div>
    </div>
  )
}
