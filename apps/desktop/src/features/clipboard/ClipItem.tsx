import {
  Code2,
  Copy,
  File,
  Files,
  Image,
  Link2,
  Pin,
  PinOff,
  Trash2,
  Type,
  type LucideIcon,
} from 'lucide-react'
import { useState } from 'react'
import { backend } from '@/lib/ipc'
import { cn } from '@/lib/cn'
import { IconButton } from '@/ui/primitives'
import { useClipboard, type Clip, type ClipKind } from './store'
import { relativeTime } from './time'

const KIND: Record<ClipKind, { icon: LucideIcon; label: string }> = {
  text: { icon: Type, label: 'Texto' },
  link: { icon: Link2, label: 'Link' },
  code: { icon: Code2, label: 'Código' },
  image: { icon: Image, label: 'Imagem' },
  files: { icon: Files, label: 'Arquivos' },
}

export function ClipItem({ clip, now }: { clip: Clip; now: number }) {
  const { copyItem, togglePin, remove } = useClipboard.getState()
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
        <IconButton label="Copiar de novo" onClick={() => copyItem(clip.id)}>
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

/** Last part of a Windows path ("C:\\a\\b.pdf" → "b.pdf"). */
const baseName = (path: string) => path.split(/[\\/]/).filter(Boolean).pop() ?? path

function Preview({ clip }: { clip: Clip }) {
  if (clip.kind === 'image') return <ImagePreview clip={clip} />
  if (clip.kind === 'files') {
    const files = clip.files ?? []
    const extra = files.length - 3
    return (
      <ul className="flex flex-col gap-0.5">
        {files.slice(0, 3).map((f) => (
          <li key={f} className="flex min-w-0 items-center gap-1.5 text-[13px]" title={f}>
            <File className="size-3 shrink-0 text-muted" aria-hidden />
            <span className="truncate">{baseName(f)}</span>
          </li>
        ))}
        {extra > 0 && (
          <li className="text-[11px] text-muted">
            +{extra} {extra === 1 ? 'arquivo' : 'arquivos'}
          </li>
        )}
      </ul>
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

/** Thumbnail of the saved PNG; a grid placeholder when it cannot be shown. */
function ImagePreview({ clip }: { clip: Clip }) {
  const url = backend.clipboardImageUrl(clip)
  const [broken, setBroken] = useState(false)
  return (
    <div className="flex items-center gap-2">
      {url && !broken ? (
        <img
          src={url}
          alt={clip.content}
          loading="lazy"
          onError={() => setBroken(true)}
          className="h-14 max-w-32 shrink-0 rounded-md border border-border-soft bg-base object-contain"
        />
      ) : (
        <span
          aria-hidden
          className="hud-grid h-10 w-16 shrink-0 rounded-md border border-border-soft bg-base"
        />
      )}
      <span className="truncate text-[13px]">{clip.content}</span>
    </div>
  )
}
