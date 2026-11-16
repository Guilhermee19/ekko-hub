import { Music2 } from 'lucide-react'
import { backend } from '@/lib/ipc'
import { Button } from '@/ui/primitives'

/** Shown while no Spotify account is linked; the login lives in Configurações → Conexões. */
export function ConnectBanner() {
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
            Em Configurações → Conexões. Com ela, você vê a fila, troca de dispositivo e usa
            aleatório e repetir. Sem conta, os controles e o volume do Windows já funcionam com
            qualquer player. O controle remoto requer Spotify Premium.
          </p>
        </div>
        <Button
          variant="primary"
          className="self-start"
          onClick={() => void backend.openSettings()}
        >
          Abrir Conexões
        </Button>
      </div>
    </div>
  )
}
