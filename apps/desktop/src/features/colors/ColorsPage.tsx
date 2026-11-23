import { Pipette } from 'lucide-react'
import { useEffect, useState } from 'react'
import { backend } from '@/lib/ipc'
import { cn } from '@/lib/cn'
import { flashToast } from '@/stores/assistant'
import type { PageProps } from '@/surfaces/panel/pages'
import { PageHeader } from '@/ui/data'
import { Button, Card } from '@/ui/primitives'
import { ColorPanel } from './ColorPanel'
import { CurrentColor } from './CurrentColor'
import { SavedColors } from './SavedColors'
import { pickColor, useColors, watchColors } from './store'

/** Shown until something is chosen or saved: Ekko's own teal. */
const FALLBACK = '#3fe0c5'

/** Cores: choose a color (grid, spectrum, sliders), its variations, and the saved ones. */
export function ColorsPage({ compact }: PageProps) {
  useEffect(watchColors, [])
  const colors = useColors((s) => s.colors)
  // Null follows the newest saved color, so a fresh pick from the screen shows up here.
  const [chosen, setChosen] = useState<string | null>(null)
  const [opacity, setOpacity] = useState(100)
  const hex = chosen ?? colors[0]?.hex ?? FALLBACK
  const saved = colors.some((c) => c.hex === hex)

  const choose = (next: string) => setChosen(next)
  const save = () => {
    backend.colorSave(hex).then(
      () => flashToast(`${hex.toUpperCase()} salva em Cores`),
      (e: unknown) => flashToast(`Não deu para salvar: ${e}`),
    )
  }
  const pickFromScreen = () => {
    setChosen(null)
    pickColor(350)
  }

  return (
    <div className="animate-rise-in flex flex-col gap-4">
      <PageHeader
        title="Cores"
        hint="Escolha uma cor, pegue uma variação e salve as que usar."
        className="mb-0"
        actions={
          <Button variant="subtle" size="sm" onClick={pickFromScreen}>
            <Pipette className="size-3.5" />
            Pegar da tela
          </Button>
        }
      />
      <div className={cn('grid gap-4', compact ? 'grid-cols-1' : 'grid-cols-2')}>
        <Card className="p-4">
          <ColorPanel value={hex} onChange={choose} />
        </Card>
        <Card className="p-4">
          <CurrentColor
            hex={hex}
            opacity={opacity}
            onOpacity={setOpacity}
            onChange={choose}
            onSave={save}
            saved={saved}
          />
        </Card>
      </div>
      <Card className="p-4">
        <SavedColors colors={colors} selected={hex} onSelect={choose} />
      </Card>
    </div>
  )
}
