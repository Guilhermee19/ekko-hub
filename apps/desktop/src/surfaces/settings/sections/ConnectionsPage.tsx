import { Cctv, Lamp, Smartphone } from 'lucide-react'
import { Badge } from '@/ui/data'
import { ConnectionsClaudeCard } from './ConnectionsClaude'
import { ConnectionsShell, SoonConnectionCard } from './ConnectionsCard'
import { HomeAssistantCard } from './ConnectionsHomeAssistant'
import { ConnectionsMcp } from './ConnectionsMcp'
import { OAuthConnectionCard } from './ConnectionsOAuth'
import { GOOGLE_GUIDE, SPOTIFY_GUIDE } from './oauthGuides'
import { PageTitle } from './systemUi'

export function ConnectionsPage() {
  return (
    <div className="animate-rise-in mx-auto flex max-w-3xl flex-col gap-8">
      <PageTitle title="Conexões" subtitle="Serviços e aparelhos que o Ekko pode usar por você." />

      <div className="grid grid-flow-dense grid-cols-2 gap-3">
        <OAuthConnectionCard guide={SPOTIFY_GUIDE} />
        <OAuthConnectionCard guide={GOOGLE_GUIDE} />
        <ConnectionsClaudeCard />
        <HomeAssistantCard />
        <SoonConnectionCard
          icon={Lamp}
          name="Casa inteligente Tuya"
          description="Luzes, tomadas e sensores Tuya / Smart Life."
        />
        <SoonConnectionCard
          icon={Cctv}
          name="Câmeras"
          description="Ver e vigiar câmeras IP (RTSP) da casa."
        />
      </div>

      <ConnectionsMcp />
      <PhoneCard />
    </div>
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
