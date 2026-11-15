import {
  Cap,
  Crown,
  Flower2,
  Gem,
  Glasses,
  GraduationCap,
  HardHat,
  Headphones,
  Ribbon,
  Shirt,
  Umbrella,
  WandSparkles,
  type LucideIcon,
} from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/cn'
import type { Phase } from '@/stores/assistant'
import { EkkoFace } from '@/ui/EkkoFace'
import { Segmented } from '@/ui/primitives'
import type { AvatarColor } from './prefsAssistant'

// Avatar catalog: cosmetic until F8 picks the real technique (SVG, Lottie or Rive).

export const EXPRESSIONS = [
  { id: 'happy', label: 'Feliz' },
  { id: 'sad', label: 'Triste' },
  { id: 'surprised', label: 'Surpreso' },
  { id: 'sleeping', label: 'Dormindo' },
  { id: 'blinking', label: 'Piscando' },
  { id: 'angry', label: 'Bravo' },
  { id: 'love', label: 'Apaixonado' },
  { id: 'confused', label: 'Confuso' },
  { id: 'laughing', label: 'Rindo' },
  { id: 'bored', label: 'Entediado' },
  { id: 'proud', label: 'Orgulhoso' },
  { id: 'scared', label: 'Assustado' },
  { id: 'focused', label: 'Concentrado' },
]

export const EYES = [
  { id: 'pill', label: 'Pílula' },
  { id: 'round', label: 'Redondos' },
  { id: 'line', label: 'Linha' },
  { id: 'pixel', label: 'Pixel' },
  { id: 'visor', label: 'Visor' },
]

export const ACCESSORIES: { id: string; label: string; icon: LucideIcon }[] = [
  { id: 'glasses', label: 'Óculos', icon: Glasses },
  { id: 'cap', label: 'Boné', icon: Cap },
  { id: 'headphones', label: 'Fone', icon: Headphones },
  { id: 'tie', label: 'Gravata', icon: Shirt },
  { id: 'crown', label: 'Coroa', icon: Crown },
  { id: 'grad', label: 'Capelo', icon: GraduationCap },
  { id: 'helmet', label: 'Capacete', icon: HardHat },
  { id: 'bow', label: 'Laço', icon: Ribbon },
  { id: 'flower', label: 'Flor', icon: Flower2 },
  { id: 'wand', label: 'Varinha', icon: WandSparkles },
  { id: 'umbrella', label: 'Guarda-chuva', icon: Umbrella },
  { id: 'gem', label: 'Cristal', icon: Gem },
]

export const COLORS: { id: AvatarColor; label: string; swatch: string }[] = [
  { id: 'theme', label: 'Seguir tema', swatch: 'bg-accent' },
  { id: 'strong', label: 'Tom forte', swatch: 'bg-accent-strong' },
  { id: 'neutral', label: 'Neutro', swatch: 'bg-content' },
]

// EkkoFace paints itself with text-accent; a descendant selector wins over it.
const FACE_COLOR: Record<AvatarColor, string> = {
  theme: '',
  strong: '[&_svg]:text-accent-strong',
  neutral: '[&_svg]:text-content',
}

const PHASES: { value: Phase; label: string }[] = [
  { value: 'idle', label: 'Repouso' },
  { value: 'listening', label: 'Ouvindo' },
  { value: 'thinking', label: 'Pensando' },
  { value: 'speaking', label: 'Falando' },
]

interface AvatarPreviewProps {
  name: string
  expression: string
  color: AvatarColor
  accessories: string[]
}

/** Big face preview with a local phase picker (does not touch the global presence). */
export function AvatarPreview({ name, expression, color, accessories }: AvatarPreviewProps) {
  const [phase, setPhase] = useState<Phase>('idle')
  const mood = EXPRESSIONS.find((e) => e.id === expression)?.label ?? ''
  const worn = ACCESSORIES.filter((a) => accessories.includes(a.id))
  return (
    <div className="hud-grid flex items-center gap-6 rounded-xl border border-border-soft bg-surface p-5">
      <div className={cn('relative grid size-36 shrink-0 place-items-center', FACE_COLOR[color])}>
        <EkkoFace phase={phase} className="size-32" />
        {phase === 'idle' && (
          <span className="animate-hud-breathe absolute inset-0 rounded-full border border-accent/20" />
        )}
      </div>
      <div className="flex min-w-0 flex-col gap-3">
        <div>
          <div className="text-[18px] font-semibold">{name.trim() || 'Ekko'}</div>
          <div className="text-[12px] text-muted">
            Humor: <span className="text-accent">{mood}</span>
          </div>
        </div>
        <ul className="flex min-h-6 flex-wrap gap-1.5" aria-label="Acessórios em uso">
          {worn.length === 0 ? (
            <li className="text-[11px] text-muted">Sem acessórios</li>
          ) : (
            worn.map((a) => (
              <li
                key={a.id}
                title={a.label}
                className="grid size-6 place-items-center rounded-md bg-accent/10 text-accent"
              >
                <a.icon className="size-3.5" aria-label={a.label} />
              </li>
            ))
          )}
        </ul>
        <div>
          <div className="label-hud mb-1">Testar estado</div>
          <Segmented value={phase} options={PHASES} onChange={setPhase} />
        </div>
      </div>
    </div>
  )
}
