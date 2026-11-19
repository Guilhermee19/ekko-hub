import { useEffect, useState } from 'react'
import { Button, Kbd } from '@/ui/primitives'
import { comboFromKey, comboKeys } from './shortcutsCombo'

/** A combo as a row of <Kbd> keys. */
export function ComboKeys({ combo }: { combo: string }) {
  return (
    <span className="inline-flex items-center gap-1" aria-label={comboKeys(combo).join(' + ')}>
      {comboKeys(combo).map((k, i) => (
        <Kbd key={`${k}-${i}`}>{k}</Kbd>
      ))}
    </span>
  )
}

/**
 * Shows a combo and an "Alterar" button. While capturing, the next key combo (with or
 * without modifiers) is recorded; Esc cancels. `presets` are one-click choices for
 * keys the page may never see (Windows can keep Print Screen for itself).
 */
export function ComboCapture({
  combo,
  label,
  onChange,
  presets,
}: {
  combo: string
  /** What is being changed, for screen readers ("Chamar o Ekko"). */
  label: string
  onChange: (combo: string) => void
  presets?: string[]
}) {
  const [capturing, setCapturing] = useState(false)

  useEffect(() => {
    if (!capturing) return
    const onKey = (e: KeyboardEvent) => {
      e.preventDefault()
      e.stopPropagation()
      if (e.key === 'Escape') return setCapturing(false)
      const next = comboFromKey(e)
      if (!next) return
      onChange(next)
      setCapturing(false)
    }
    // Windows sends only the key-up of Print Screen to apps.
    const onUp = (e: KeyboardEvent) => e.key === 'PrintScreen' && onKey(e)
    window.addEventListener('keydown', onKey, true)
    window.addEventListener('keyup', onUp, true)
    return () => {
      window.removeEventListener('keydown', onKey, true)
      window.removeEventListener('keyup', onUp, true)
    }
  }, [capturing, onChange])

  const choices = presets?.filter((p) => p.toLowerCase() !== combo.toLowerCase()) ?? []
  return (
    <span className="inline-flex flex-col items-start gap-1.5">
      <span className="inline-flex items-center gap-2">
        {capturing ? (
          <span
            role="status"
            className="animate-hud-breathe rounded border border-accent/50 bg-accent/10 px-2 py-0.5 text-[11px] text-accent"
          >
            Pressione a combinação… (Esc cancela)
          </span>
        ) : (
          <ComboKeys combo={combo} />
        )}
        <Button
          size="sm"
          variant={capturing ? 'ghost' : 'subtle'}
          aria-label={capturing ? `Cancelar alteração de ${label}` : `Alterar atalho de ${label}`}
          onClick={() => setCapturing((v) => !v)}
        >
          {capturing ? 'Cancelar' : 'Alterar'}
        </Button>
      </span>
      {choices.length > 0 && (
        <span className="flex flex-wrap items-center gap-1 text-[11px] text-muted">
          Usar:
          {choices.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => {
                setCapturing(false)
                onChange(p)
              }}
              className="rounded-md border border-border-soft px-1.5 py-0.5 hover:border-accent/50 hover:text-accent"
            >
              {comboKeys(p).join(' + ')}
            </button>
          ))}
        </span>
      )}
    </span>
  )
}
