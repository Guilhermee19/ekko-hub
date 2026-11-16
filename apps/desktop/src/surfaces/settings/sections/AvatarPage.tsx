import { backend, type AppearanceSettings } from '@/lib/ipc'
import { cn } from '@/lib/cn'
import { useSettings } from '@/stores/settings'
import { Badge } from '@/ui/data'
import { Input, Toggle } from '@/ui/forms'
import { Card } from '@/ui/primitives'
import { Field } from '../Field'
import { ACCESSORIES, AvatarPreview, COLORS, EXPRESSIONS, EYES } from './AvatarPreview'
import { Chip, PageFrame, Row } from './GeneralControls'
import { usePrefs } from './prefsAssistant'

const BEHAVIORS = [
  { id: 'walk', title: 'Andar pela tela', hint: 'Sai do notch e passeia pela área de trabalho.' },
  { id: 'flies', title: 'Caçar mosca', hint: 'De vez em quando persegue uma mosquinha.' },
  { id: 'sleep', title: 'Dormir quando ocioso', hint: 'Cochila depois de 10 min sem uso.' },
] as const

export function AvatarPage() {
  const avatar = usePrefs((s) => s.avatar)
  const patch = usePrefs((s) => s.patch)
  const set = (v: Partial<typeof avatar>) => patch('avatar', v)
  // Eyes and color are real settings: every EkkoFace (notch, orb, chat) follows them.
  const look = useSettings((s) => s.settings.appearance)
  const setLook = (v: Partial<AppearanceSettings>) => void backend.setAppearance({ ...look, ...v })
  const toggleAccessory = (id: string) =>
    set({
      accessories: avatar.accessories.includes(id)
        ? avatar.accessories.filter((a) => a !== id)
        : [...avatar.accessories, id],
    })

  return (
    <PageFrame
      title="Avatar"
      subtitle="O personagem que mora no notch. Por enquanto, tudo aqui é só visual."
      badge={<Badge tone="accent">Prévia · chega na F8</Badge>}
    >
      <AvatarPreview
        name={avatar.name}
        expression={avatar.expression}
        accessories={avatar.accessories}
      />

      <Field title="Expressões" hint="Humor padrão. Na F8 elas mudam sozinhas com o que acontece.">
        <div className="grid grid-cols-5 gap-2">
          {EXPRESSIONS.map((e) => (
            <Chip
              key={e.id}
              active={avatar.expression === e.id}
              onClick={() => set({ expression: e.id })}
              className="justify-center"
            >
              {e.label}
            </Chip>
          ))}
        </div>
      </Field>

      <Field title="Cor" hint="Por padrão segue o accent da persona escolhida em Aparência.">
        <div className="flex flex-wrap gap-2">
          {COLORS.map((c) => (
            <Chip
              key={c.id}
              active={look.avatarColor === c.id}
              onClick={() => setLook({ avatarColor: c.id })}
            >
              <span className={cn('size-3 rounded-full', c.swatch)} aria-hidden /> {c.label}
            </Chip>
          ))}
        </div>
      </Field>

      <Field title="Olhos" hint="Formato dos olhos.">
        <div className="flex flex-wrap gap-2">
          {EYES.map((e) => (
            <Chip
              key={e.id}
              active={look.avatarStyle === e.id}
              onClick={() => setLook({ avatarStyle: e.id })}
            >
              {e.label}
            </Chip>
          ))}
        </div>
      </Field>

      <Field title="Acessórios" hint="Escolha quantos quiser.">
        <div className="grid grid-cols-6 gap-2">
          {ACCESSORIES.map((a) => (
            <Chip
              key={a.id}
              active={avatar.accessories.includes(a.id)}
              onClick={() => toggleAccessory(a.id)}
              className="flex-col justify-center gap-1 py-2.5"
            >
              <a.icon className="size-5" aria-hidden />
              <span className="text-[11px]">{a.label}</span>
            </Chip>
          ))}
        </div>
      </Field>

      <Field
        title="Nome do personagem"
        hint="Apelido do bonequinho. O nome do assistente fica em Aparência."
      >
        <div className="w-64">
          <Input
            aria-label="Nome do personagem"
            value={avatar.name}
            maxLength={20}
            onChange={(e) => set({ name: e.target.value })}
          />
        </div>
      </Field>

      <Field title="Comportamentos" hint="Coisas que ele faz sozinho quando você não está usando.">
        <Card className="divide-y divide-border-soft py-0.5">
          {BEHAVIORS.map((b) => (
            <Row key={b.id} title={b.title} hint={b.hint}>
              <Toggle
                label={b.title}
                checked={avatar.behaviors[b.id]}
                onChange={(v) => set({ behaviors: { ...avatar.behaviors, [b.id]: v } })}
              />
            </Row>
          ))}
        </Card>
      </Field>
    </PageFrame>
  )
}
