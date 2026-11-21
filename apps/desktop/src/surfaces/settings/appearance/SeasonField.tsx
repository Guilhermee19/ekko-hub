import { cn } from '@/lib/cn'
import { seasonOf, SEASONS } from '@/features/season/season'
import { SeasonSky } from '@/features/season/SeasonSky'
import { EkkoEyes } from '@/ui/EkkoEyes'
import { Field } from '../Field'
import { setAppearance, ToggleRow, useAppearance } from './controls'

/** Holiday looks on/off, with every look previewed (the current one marked). */
export function SeasonField() {
  const { seasonal } = useAppearance()
  const today = seasonOf(new Date())
  return (
    <Field
      title="Datas e enfeites"
      hint="O enfeite aparece sozinho na data e some quando ela passa. Os olhos do Ekko nunca mudam; o que muda é o fundo e a cor do brilho de baixo."
    >
      <ToggleRow
        label="Usar temas de época"
        hint={seasonal ? 'Ligado' : 'Desligado: o Ekko fica sempre igual'}
        checked={seasonal}
        onChange={(v) => setAppearance({ seasonal: v })}
      />
      <ul
        className={cn(
          'grid grid-cols-2 gap-2 transition-opacity duration-300 sm:grid-cols-3',
          !seasonal && 'opacity-40',
        )}
      >
        {SEASONS.map((s) => (
          <li
            key={s.id}
            className={cn(
              'flex flex-col items-center gap-2 rounded-xl border border-border-soft bg-surface p-3 text-center',
              s.id === today && 'border-accent/50',
            )}
          >
            <span
              data-season={s.id}
              className="notch-pill relative flex h-[38px] w-[150px] max-w-full items-center justify-center overflow-hidden"
            >
              <SeasonSky season={s.id} />
              <EkkoEyes phase="idle" mood="calm" className="h-4.5 w-10" />
            </span>
            <span>
              <span className="block text-[12px] font-semibold text-content">
                {s.name}
                {s.id === today && <span className="ml-1.5 text-accent">· agora</span>}
              </span>
              <span className="block text-[11px] text-muted">{s.when}</span>
              <span className="block text-[11px] text-muted">{s.look}</span>
            </span>
          </li>
        ))}
      </ul>
    </Field>
  )
}
