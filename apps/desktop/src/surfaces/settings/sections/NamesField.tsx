import { backend } from '@/lib/ipc'
import { useSettings } from '@/stores/settings'
import { Field } from '../Field'

/** How Ekko calls you and what you call him; saved when the field loses focus. */
export function NamesField() {
  const userName = useSettings((s) => s.settings.userName)
  const assistantName = useSettings((s) => s.settings.assistantName)
  return (
    <Field title="Nomes" hint="Como ele te chama e como você chama ele.">
      <div className="grid grid-cols-2 gap-3">
        <NameInput
          label="Seu nome"
          value={userName}
          onCommit={(v) => void backend.setNames(v, assistantName)}
        />
        <NameInput
          label="Nome do assistente"
          value={assistantName}
          onCommit={(v) => void backend.setNames(userName, v)}
        />
      </div>
    </Field>
  )
}

function NameInput({
  label,
  value,
  onCommit,
}: {
  label: string
  value: string
  onCommit: (v: string) => void
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="label-hud">{label}</span>
      <input
        key={value}
        defaultValue={value}
        onBlur={(e) =>
          e.target.value.trim() && e.target.value !== value && onCommit(e.target.value)
        }
        onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
        className="rounded-lg border border-border-soft bg-surface px-3 py-2 text-[13px] outline-none focus:border-accent/50"
      />
    </label>
  )
}
