import { Code2, Copy, Image, Link2, Pin, PinOff, Trash2, Type, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/cn'
import { IconButton } from '@/ui/primitives'
import { useClipboard, type Clip, type ClipKind } from './store'
import { relativeTime } from './time'

const KIND: Record<ClipKind, { icon: LucideIcon; label: string }> = {
  text: { icon: Type, label: 'Texto' },
  link: { icon: Link2, label: 'Link' },
  code: { icon: Code2, label: 'Código' },
  image: { icon: Image, label: 'Imagem' },
}

export function ClipItem({ clip, now }: { clip: Clip; now: number }) {
  const { copy, togglePin, remove } = useClipboard.getState()
  const { icon: Icon, label } = KIND[clip.kind]
  return (
    <li
      className={cn(
        'group flex items-start gap-2.5 rounded-xl border bg-surface p-2.5 transition-colors hover:bg-surface-hover',
        clip.pinned ? 'border-accent/30' : 'border-border-soft',
      )}
    >
      <span
        className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg bg-accent/10 text-accent"
        title={label}
      >
        <Icon className="size-3.5" aria-label={label} />
      </span>
      <div className="min-w-0 flex-1">
        <Preview clip={clip} />
        <div className="mt-1 flex items-center gap-1.5 text-[11px] text-muted">
          {clip.pinned && <Pin className="size-3 text-accent" aria-label="Fixado" />}
          <span className="truncate">{clip.source}</span>
          <span aria-hidden>·</span>
          <span className="shrink-0 tabular-nums">{relativeTime(clip.at, now)}</span>
        </div>
      </div>
      <div className="flex shrink-0 items-center opacity-70 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
        <IconButton label="Copiar" onClick={() => copy(clip.content)}>
          <Copy className="size-3.5" />
        </IconButton>
        <IconButton
          label={clip.pinned ? 'Desafixar' : 'Fixar'}
          active={clip.pinned}
          onClick={() => togglePin(clip.id)}
        >
          {clip.pinned ? <PinOff className="size-3.5" /> : <Pin className="size-3.5" />}
        </IconButton>
        <IconButton label="Apagar" onClick={() => remove(clip.id)}>
          <Trash2 className="size-3.5" />
        </IconButton>
      </div>
    </li>
  )
}

function Preview({ clip }: { clip: Clip }) {
  if (clip.kind === 'image') {
    return (
      <div className="flex items-center gap-2">
        <span
          aria-hidden
          className="hud-grid h-10 w-16 shrink-0 rounded-md border border-border-soft bg-base"
        />
        <span className="truncate text-[13px]">{clip.content}</span>
      </div>
    )
  }
  if (clip.kind === 'code') {
    return (
      <code className="block truncate rounded-md bg-base/70 px-2 py-1 font-mono text-[11px]">
        {clip.content}
      </code>
    )
  }
  return (
    <p
      className={cn(
        'line-clamp-2 text-[13px] break-words',
        clip.kind === 'link' && 'break-all text-accent',
      )}
    >
      {clip.content}
    </p>
  )
}
