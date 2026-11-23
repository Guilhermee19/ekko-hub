import { useState } from 'react'
import { cn } from '@/lib/cn'
import { Input } from '@/ui/forms'
import { parseColor, type Parsed } from './palette'

interface Props {
  /** Shown while not editing. */
  hex: string
  onColor: (color: Parsed) => void
}

/** Type or paste any common color code (HEX, rgb, hsl, with or without alpha). */
export function CodeInput({ hex, onColor }: Props) {
  const [draft, setDraft] = useState<string | null>(null)
  const [bad, setBad] = useState(false)

  /** Applies `text`; true when it was a color. */
  const apply = (text: string) => {
    const color = parseColor(text)
    setBad(!color && text.trim() !== '')
    if (color) {
      onColor(color)
      setDraft(null)
    }
    return !!color
  }

  return (
    <label className="flex flex-col gap-1">
      <span className="label-hud">Código</span>
      <Input
        value={draft ?? hex.toUpperCase()}
        spellCheck={false}
        placeholder="#3FE0C5, rgb(63, 224, 197), hsl(170, 72%, 56%)"
        aria-invalid={bad}
        aria-describedby={bad ? 'color-code-error' : undefined}
        onChange={(e) => {
          setDraft(e.target.value)
          setBad(false)
        }}
        // A paste is a whole code: apply it right away.
        onPaste={(e) => {
          if (apply(e.clipboardData.getData('text'))) e.preventDefault()
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') apply(e.currentTarget.value)
          if (e.key === 'Escape') {
            setDraft(null)
            setBad(false)
          }
        }}
        // Keeps a wrong code on screen with the error, so it can be fixed.
        onBlur={(e) => draft !== null && apply(e.target.value)}
        className={cn('font-mono', bad && 'border-danger/60 focus:border-danger/60')}
      />
      {bad && (
        <span id="color-code-error" className="text-[11px] text-danger">
          Não reconheci esse código. Use HEX, rgb() ou hsl().
        </span>
      )}
    </label>
  )
}
