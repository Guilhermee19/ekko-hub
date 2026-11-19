import { Check, Copy, FolderOpen, X } from 'lucide-react'
import { useState } from 'react'
import { useDragOut } from '@/features/shelf/useDragOut'
import { useShelf } from '@/features/shelf/store'
import { backend, type CaptureSaved, type ShelfItem } from '@/lib/ipc'
import { IconButton } from '@/ui/primitives'
import './print.css'

/**
 * "Print salvo": the print that just flew into the notch. Clicking the picture copies
 * it as an image; dragging it drops the PNG file wherever it goes (chat, e-mail, folder).
 */
export function PrintCard({ print, onClose }: { print: CaptureSaved; onClose: () => void }) {
  const [copied, setCopied] = useState(false)
  const [failed, setFailed] = useState(false)
  const shelved = useShelf((s) => s.items.find((i) => i.id === print.id))
  const drag = useDragOut(print.id ? [print.id] : [])
  const item: ShelfItem = shelved ?? {
    id: print.id ?? print.path,
    path: print.path,
    name: print.name,
    isDir: false,
    size: 0,
    addedAt: 0,
  }

  const copy = () => {
    if (!print.id) return
    backend.shelfCopyImage(print.id).then(
      () => {
        setFailed(false)
        setCopied(true)
      },
      () => setFailed(true),
    )
  }

  return (
    <div className="flex h-full items-center gap-3 p-2.5 pt-1.5">
      <button
        type="button"
        {...(print.id ? drag : {})}
        onClick={copy}
        title="Clique para copiar · arraste para usar"
        aria-label="Copiar o print como imagem"
        className="print-thumb group relative h-full w-34 shrink-0 cursor-grab overflow-hidden rounded-xl border border-accent/50 bg-base active:cursor-grabbing"
      >
        <img
          src={backend.shelfPreviewUrl(item)}
          alt=""
          draggable={false}
          className="size-full object-cover"
        />
        <span className="absolute inset-0 grid place-items-center bg-base/60 opacity-0 transition-opacity group-hover:opacity-100">
          {copied ? <Check className="size-5 text-accent" /> : <Copy className="size-5 text-content" />}
        </span>
      </button>
      <div className="min-w-0 flex-1" role="status">
        <p className="print-title flex items-center gap-1.5 text-[13px] font-medium text-content">
          <Check className="size-3.5 text-accent" aria-hidden />
          {copied ? 'Print copiado' : 'Print salvo'}
        </p>
        <p className="truncate text-[11.5px] text-muted tabular-nums">
          {print.width} × {print.height} · Imagens\Ekko
        </p>
        <p className="mt-0.5 text-[11px] text-muted">
          {failed
            ? 'Não deu para copiar. Tente de novo.'
            : print.id
              ? 'Clique para copiar · arraste para usar'
              : 'Prateleira cheia: abra a pasta para usar'}
        </p>
      </div>
      <div className="flex flex-col gap-1 self-start">
        <IconButton label="Fechar" onClick={onClose} className="size-6">
          <X className="size-3" />
        </IconButton>
        {print.id && (
          <IconButton
            label="Mostrar na pasta"
            onClick={() => useShelf.getState().reveal(print.id as string)}
            className="size-6"
          >
            <FolderOpen className="size-3" />
          </IconButton>
        )}
      </div>
    </div>
  )
}
