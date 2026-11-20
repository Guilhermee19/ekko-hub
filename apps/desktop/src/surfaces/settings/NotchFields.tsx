import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { backend, type MonitorInfo, type NotchSettings } from '@/lib/ipc'
import { useSettings } from '@/stores/settings'
import { Button, Segmented, Slider } from '@/ui/primitives'
import { Field } from './Field'

// One field per notch setting, so each lands on the page it belongs to (Modo de
// exibição, Notch, Pílula e avisos).

const PRESETS = [
  { label: 'Esquerda', offset: 0.18 },
  { label: 'Centro', offset: 0.5 },
  { label: 'Direita', offset: 0.82 },
]

/** Merges into the freshest settings, so fast slider ticks never resurrect old values. */
function setNotch(patch: Partial<NotchSettings>) {
  const notch = useSettings.getState().settings.notch
  void backend.setNotch({ ...notch, ...patch })
}

const useNotch = () => useSettings((s) => s.settings.notch)

export function NotchPositionField() {
  const notch = useNotch()
  return (
    <Field
      title="Posição"
      hint="Arraste na prévia, use os atalhos, ou arraste a barra de cima do próprio notch."
    >
      <PositionPreview offset={notch.offset} onChange={(offset) => setNotch({ offset })} />
      <div className="mt-3 flex max-w-xl flex-wrap items-center gap-2">
        {PRESETS.map((p) => (
          <Button key={p.label} variant="subtle" onClick={() => setNotch({ offset: p.offset })}>
            {p.label}
          </Button>
        ))}
        <span className="ml-auto font-mono text-[12px] text-muted">
          {Math.round(notch.offset * 100)}%
        </span>
      </div>
    </Field>
  )
}

/** Which screen the notch and the dock live on; hidden with a single monitor. */
export function MonitorField() {
  const monitor = useSettings((s) => s.settings.monitor)
  const [monitors, setMonitors] = useState<MonitorInfo[]>([])
  useEffect(() => {
    void backend.listMonitors().then(setMonitors)
  }, [])
  if (monitors.length < 2) return null
  return (
    <Field title="Monitor" hint="Em qual tela o notch (e o dock) fica.">
      <Segmented
        value={String(monitor)}
        options={monitors.map((m) => ({
          value: String(m.index),
          label: `${m.primary ? '★ ' : ''}${m.name} · ${m.width}×${m.height}`,
        }))}
        onChange={(v) => void backend.setMonitor(Number(v))}
      />
    </Field>
  )
}

export function NotchSizeField() {
  const notch = useNotch()
  return (
    <Field title="Tamanho do painel" hint="Tamanho do notch quando ele abre.">
      <Segmented
        value={notch.size}
        options={[
          { value: 'compact', label: 'Compacto' },
          { value: 'normal', label: 'Normal' },
          { value: 'large', label: 'Grande' },
        ]}
        onChange={(size) => setNotch({ size })}
      />
    </Field>
  )
}

export function NotchOpenField() {
  const notch = useNotch()
  return (
    <Field title="Como abrir" hint="Com o mouse em cima, ou só quando você clicar nele.">
      <div className="flex flex-col items-start gap-3">
        <Segmented
          value={notch.openOn}
          options={[
            { value: 'hover', label: 'Passar o mouse' },
            { value: 'click', label: 'Clicar' },
          ]}
          onChange={(openOn) => setNotch({ openOn })}
        />
        <SliderLine
          label="Atraso do hover"
          value={notch.hoverDelayMs}
          max={800}
          step={20}
          disabled={notch.openOn === 'click'}
          shown={`${notch.hoverDelayMs} ms`}
          onChange={(hoverDelayMs) => setNotch({ hoverDelayMs })}
        />
        <SliderLine
          label="Animação de abrir"
          value={notch.openMs}
          max={1000}
          step={50}
          shown={notch.openMs === 0 ? 'sem' : `${notch.openMs} ms`}
          onChange={(openMs) => setNotch({ openMs })}
        />
      </div>
    </Field>
  )
}

export function NotchIdleField() {
  const notch = useNotch()
  return (
    <Field title="Em repouso" hint="Mínimo vira só uma linha fina quando não tem nada acontecendo.">
      <Segmented
        value={notch.idle}
        options={[
          { value: 'pill', label: 'Pílula' },
          { value: 'minimal', label: 'Mínimo' },
        ]}
        onChange={(idle) => setNotch({ idle })}
      />
    </Field>
  )
}

export function AlertTimeField() {
  const notch = useNotch()
  return (
    <Field
      title="Tempo dos avisos"
      hint="Quanto tempo avisos, volume, brilho, bateria, Caps Lock e microfone ficam no notch antes de sumir."
    >
      <SliderLine
        label="Tempo na tela"
        value={notch.alertSeconds}
        min={1}
        max={10}
        step={1}
        shown={`${notch.alertSeconds} s`}
        onChange={(alertSeconds) => setNotch({ alertSeconds })}
      />
    </Field>
  )
}

function SliderLine({
  label,
  value,
  min = 0,
  max,
  step,
  disabled,
  shown,
  onChange,
}: {
  label: string
  value: number
  min?: number
  max: number
  step: number
  disabled?: boolean
  shown: string
  onChange: (v: number) => void
}) {
  return (
    <label className="flex w-full max-w-md items-center gap-3 text-[12px] text-muted">
      <span className="w-28 shrink-0">{label}</span>
      <Slider
        label={label}
        value={value}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        onChange={onChange}
      />
      <span className="w-14 shrink-0 text-right font-mono">{shown}</span>
    </label>
  )
}

/** Miniature monitor top edge; drag (or click) to place the notch. */
function PositionPreview({ offset, onChange }: { offset: number; onChange: (v: number) => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)

  const pick = (e: PointerEvent<HTMLDivElement>) => {
    const r = ref.current?.getBoundingClientRect()
    if (!r) return
    const v = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width))
    onChange(Math.round(v * 100) / 100)
  }

  return (
    <div
      ref={ref}
      role="slider"
      aria-label="Posição horizontal do notch"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(offset * 100)}
      tabIndex={0}
      onKeyDown={(e) => {
        const step = e.key === 'ArrowLeft' ? -0.02 : e.key === 'ArrowRight' ? 0.02 : 0
        if (step) onChange(Math.min(1, Math.max(0, Math.round((offset + step) * 100) / 100)))
      }}
      onPointerDown={(e) => {
        dragging.current = true
        e.currentTarget.setPointerCapture(e.pointerId)
        pick(e)
      }}
      onPointerMove={(e) => dragging.current && pick(e)}
      onPointerUp={() => (dragging.current = false)}
      className="hud-grid relative h-28 max-w-xl cursor-ew-resize overflow-hidden rounded-xl border border-border-soft bg-surface outline-none focus-visible:border-accent/60"
    >
      <span className="label-hud absolute bottom-2 left-3">Sua tela</span>
      <span
        className="absolute top-0 h-3 w-16 -translate-x-1/2 rounded-b-lg border border-t-0 border-accent/50 bg-accent/30 shadow-[0_0_12px_var(--color-accent)] transition-[left] duration-100"
        style={{ left: `clamp(2rem, ${offset * 100}%, calc(100% - 2rem))` }}
      />
    </div>
  )
}
