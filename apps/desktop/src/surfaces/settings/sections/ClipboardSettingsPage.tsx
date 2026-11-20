import { useClipboard } from '@/features/clipboard/store'
import { CLIPBOARD_LIMITS } from '@/lib/ipc'
import { Toggle } from '@/ui/forms'
import { Card, Segmented } from '@/ui/primitives'
import { Field } from '../Field'
import { PageFrame, Row } from './GeneralControls'

/** Copiados: whether history is recorded and how much of it stays on the PC. */
export function ClipboardSettingsPage() {
  const limit = useClipboard((s) => s.limit)
  const paused = useClipboard((s) => s.paused)
  const { setLimit, setPaused } = useClipboard.getState()
  return (
    <PageFrame
      title="Copiados"
      subtitle="O histórico do que você copia: textos, imagens e arquivos. Tudo fica só neste PC."
    >
      <Field title="Histórico" hint="Senhas de gerenciadores ficam de fora sempre.">
        <Card className="py-0.5">
          <Row
            title="Guardar o que eu copiar"
            hint="Desligado, nada novo entra no histórico até você ligar de novo."
          >
            <Toggle
              label="Guardar o que eu copiar"
              checked={!paused}
              onChange={(on) => setPaused(!on)}
            />
          </Row>
        </Card>
      </Field>
      <Field
        title="Quantos guardar"
        hint="Os mais antigos (e as imagens deles) são apagados do PC. Os fixados ficam sempre."
      >
        <div className="flex items-center gap-3 text-[12px] text-muted">
          <span>Guardar os últimos</span>
          <Segmented
            value={String(limit)}
            options={CLIPBOARD_LIMITS.map((n) => ({ value: String(n), label: String(n) }))}
            onChange={(v) => setLimit(Number(v))}
          />
        </div>
      </Field>
    </PageFrame>
  )
}
