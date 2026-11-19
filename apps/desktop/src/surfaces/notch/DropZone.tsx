import { useShelf } from '@/features/shelf/store'
import { EkkoEyes } from '@/ui/EkkoEyes'

/** What the notch shows while files hover over it: "solte aqui". */
export function DropZone() {
  const count = useShelf((s) => s.items.length)
  return (
    <div className="flex h-full p-2.5 pt-1.5">
      <div
        role="status"
        className="animate-fade-in flex flex-1 items-center gap-4 rounded-2xl border border-dashed border-accent/50 bg-accent/5 px-5"
      >
        <EkkoEyes phase="listening" className="h-5.5 w-12.5 shrink-0" />
        <div className="min-w-0">
          <p className="text-[13px] font-medium text-content">Solte para guardar</p>
          <p className="text-[11.5px] text-muted">
            {count === 0
              ? 'Ficam aqui até você arrastar para outro lugar.'
              : count === 1
                ? 'Junta com o arquivo que já está na prateleira.'
                : `Junta com os ${count} que já estão na prateleira.`}
          </p>
        </div>
      </div>
    </div>
  )
}
