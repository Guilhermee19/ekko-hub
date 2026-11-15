import { CalendarDays, Cctv, Code, House, Lamp, Music, Smartphone } from 'lucide-react'
import { Badge } from '@/ui/data'
import { Button } from '@/ui/primitives'
import { ConnectionsCard, ConnectionsShell } from './ConnectionsCard'
import { ConnectionsMcp } from './ConnectionsMcp'
import { toast, usePrefsSystem } from './prefsSystem'
import { PageTitle } from './systemUi'

export function ConnectionsPage() {
  return (
    <div className="animate-rise-in mx-auto flex max-w-3xl flex-col gap-8">
      <PageTitle title="Conexões" subtitle="Serviços e aparelhos que o Ekko pode usar por você." />

      <div className="grid grid-cols-2 gap-3">
        <ConnectionsCard
          id="spotify"
          icon={Music}
          name="Spotify"
          description="Tocar, pausar, fila e tocar em outro aparelho."
          phase="F7"
          account="ekko.demo · Premium"
        />
        <ConnectionsCard
          id="calendar"
          icon={CalendarDays}
          name="Google Calendar"
          description="Agenda no briefing da manhã e eventos por voz."
          phase="F7"
          account="conta Google conectada"
        />
        <ClaudeCodeCard />
        <ConnectionsCard
          id="homeassistant"
          icon={House}
          name="Home Assistant"
          description="Controle tudo que o seu Home Assistant controla."
          phase="F7"
          account="http://homeassistant.local:8123"
        />
        <ConnectionsCard
          id="tuya"
          icon={Lamp}
          name="Casa inteligente Tuya"
          description="Luzes, tomadas e sensores Tuya / Smart Life."
          phase="F7"
          account="6 dispositivos"
        />
        <ConnectionsCard
          id="cameras"
          icon={Cctv}
          name="Câmeras"
          description="Ver e vigiar câmeras IP (RTSP) da casa."
          phase="F7"
          account="2 câmeras"
        />
      </div>

      <ConnectionsMcp />
      <PhoneCard />
    </div>
  )
}

function ClaudeCodeCard() {
  const found = usePrefsSystem((s) => s.connections.claude === 'connected')
  return (
    <ConnectionsShell
      icon={Code}
      name="Claude Code"
      description="Mandar tarefas pesadas de código para o Claude Code."
      badge={found ? <Badge tone="accent">Encontrado</Badge> : <Badge>Não encontrado</Badge>}
      meta={
        found
          ? 'C:\\Users\\…\\AppData\\Roaming\\npm\\claude.cmd'
          : 'Instale com: npm i -g @anthropic-ai/claude-code'
      }
      action={
        <Button size="sm" variant="ghost" onClick={() => toast('Claude Code v2.1 encontrado')}>
          Procurar
        </Button>
      }
    />
  )
}

function PhoneCard() {
  return (
    <ConnectionsShell
      icon={Smartphone}
      name="Celular"
      description="Fale com o Ekko pelo celular e receba lembretes lá. O PC executa, o celular pede."
      badge={<Badge>Chega na V2</Badge>}
    >
      <div className="flex items-center gap-4">
        <div className="rounded-lg border border-border-soft bg-base p-2 opacity-50">
          <QrPlaceholder />
        </div>
        <p className="max-w-xs text-[12px] text-muted">
          Na V2 você escaneia este QR code com o celular para parear, via Tailscale, sem abrir
          portas no roteador.
        </p>
      </div>
    </ConnectionsShell>
  )
}

const QR = 21

/** Deterministic QR-looking pattern; the real code comes with pairing in V2. */
function QrPlaceholder() {
  const finder = (x: number, y: number) =>
    (x < 7 && y < 7) || (x >= QR - 7 && y < 7) || (x < 7 && y >= QR - 7)
  const cells: [number, number][] = []
  for (let y = 0; y < QR; y++)
    for (let x = 0; x < QR; x++)
      if (!finder(x, y) && (x * 7 + y * 13 + x * y) % 3 === 0) cells.push([x, y])
  const corners: [number, number][] = [
    [0, 0],
    [QR - 7, 0],
    [0, QR - 7],
  ]
  return (
    <svg
      viewBox={`0 0 ${QR} ${QR}`}
      className="size-24 text-content"
      role="img"
      aria-label="QR code de pareamento (prévia)"
    >
      <g fill="currentColor">
        {cells.map(([x, y]) => (
          <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} />
        ))}
        {corners.map(([x, y]) => (
          <g key={`f${x}-${y}`}>
            <path d={`M${x} ${y}h7v7h-7z M${x + 1} ${y + 1}v5h5v-5z`} fillRule="evenodd" />
            <rect x={x + 2} y={y + 2} width={3} height={3} />
          </g>
        ))}
      </g>
    </svg>
  )
}
