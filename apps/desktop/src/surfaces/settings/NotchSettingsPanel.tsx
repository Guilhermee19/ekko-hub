import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { backend, type MonitorInfo, type NotchSettings } from '@/lib/ipc'
import { useSettings } from '@/stores/settings'
import { Button, Segmented, Slider } from '@/ui/primitives'
import { Field } from './Field'

const PRESETS = [
  { label: 'Esquerda', offset: 0.18 },
  { label: 'Centro', offset: 0.5 },
  { label: 'Direita', offset: 0.82 },
]

/** Notch customization: monitor, position on the top edge, size and how it opens. */
export function NotchSettingsPanel() {
  const { notch, monitor } = useSettings((s) => s.settings)
  const set = (patch: Partial<NotchSettings>) => void backend.setNotch({ ...notch, ...patch })
  const [monitors, setMonitors] = useState<MonitorInfo[]>([])

  useEffect(() => {
    void backend.listMonitors().then(setMonitors)
  }, [])

  return (
    <>
      <Field
        title="Posição do notch"
        hint="Arraste na prévia, use os atalhos, ou arraste a barra de cima do próprio notch."
      >
        <PositionPreview offset={notch.offset} onChange={(offset) => set({ offset })} />
        <div className="mt-3 flex max-w-xl flex-wrap items-center gap-2">
          {PRESETS.map((p) => (
            <Button key={p.label} variant="subtle" onClick={() => set({ offset: p.offset })}>
              {p.label}
            </Button>
          ))}
          <span className="ml-auto font-mono text-[12px] text-muted">
            {Math.round(notch.offset * 100)}%
          </span>
        </div>
      </Field>

      {monitors.length > 1 && (
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
      )}

      <Field title="Tamanho do painel" hint="Tamanho do notch quando ele abre.">
        <Segmented
          value={notch.size}
          options={[
            { value: 'compact', label: 'Compacto' },
            { value: 'normal', label: 'Normal' },
            { value: 'large', label: 'Grande' },
          ]}
          onChange={(size) => set({ size })}
        />
      </Field>

      <Field title="Como abrir" hint="Com o mouse em cima, ou só quando você clicar nele.">
        <div className="flex flex-col items-start gap-3">
          <Segmented
            value={notch.openOn}
            options={[
              { value: 'hover', label: 'Passar o mouse' },
              { value: 'click', label: 'Clicar' },
            ]}
            onChange={(openOn) => set({ openOn })}
          />
          <label className="flex w-full max-w-md items-center gap-3 text-[12px] text-muted">
            <span className="w-28 shrink-0">Atraso do hover</span>
            <Slider
              label="Atraso do hover"
              value={notch.hoverDelayMs}
              min={0}
              max={800}
              step={20}
              disabled={notch.openOn === 'click'}
              onChange={(hoverDelayMs) => set({ hoverDelayMs })}
            />
            <span className="w-14 shrink-0 text-right font-mono">{notch.hoverDelayMs} ms</span>
          </label>
          <label className="flex w-full max-w-md items-center gap-3 text-[12px] text-muted">
            <span className="w-28 shrink-0">Animação de abrir</span>
            <Slider
              label="Duração da animação de abrir"
              value={notch.openMs}
              min={0}
              max={1000}
              step={50}
              onChange={(openMs) => set({ openMs })}
            />
            <span className="w-14 shrink-0 text-right font-mono">
              {notch.openMs === 0 ? 'sem' : `${notch.openMs} ms`}
            </span>
          </label>
        </div>
      </Field>

      <Field
        title="Avisos rápidos"
        hint="Quanto tempo avisos, volume, brilho, bateria, Caps Lock e microfone ficam no notch antes de sumir."
      >
        <label className="flex w-full max-w-md items-center gap-3 text-[12px] text-muted">
          <span className="w-28 shrink-0">Tempo na tela</span>
          <Slider
            label="Tempo dos avisos rápidos"
            value={notch.alertSeconds}
            min={1}
            max={10}
            step={1}
            onChange={(alertSeconds) => set({ alertSeconds })}
          />
          <span className="w-14 shrink-0 text-right font-mono">{notch.alertSeconds} s</span>
        </label>
      </Field>

      <Field
        title="Em repouso"
        hint="Mínimo vira só uma linha fina quando não tem nada acontecendo."
      >
        <Segmented
          value={notch.idle}
          options={[
            { value: 'pill', label: 'Pílula' },
            { value: 'minimal', label: 'Mínimo' },
          ]}
          onChange={(idle) => set({ idle })}
        />
      </Field>
    </>
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
