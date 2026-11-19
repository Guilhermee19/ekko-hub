import {
  File,
  FileArchive,
  FileAudio,
  FileCode,
  FileImage,
  FileSpreadsheet,
  FileText,
  FileVideo,
  Folder,
  type LucideIcon,
} from 'lucide-react'

export type FileKind =
  'folder' | 'image' | 'video' | 'audio' | 'archive' | 'sheet' | 'doc' | 'code' | 'other'

const BY_EXT: Record<string, FileKind> = {}
const add = (kind: FileKind, exts: string) => exts.split(' ').forEach((e) => (BY_EXT[e] = kind))
add('image', 'png jpg jpeg gif webp bmp svg heic ico tif tiff')
add('video', 'mp4 mkv mov avi webm wmv')
add('audio', 'mp3 wav flac ogg m4a aac')
add('archive', 'zip rar 7z tar gz')
add('sheet', 'xls xlsx csv ods')
add('doc', 'pdf doc docx txt md rtf odt ppt pptx')
add('code', 'js ts tsx jsx json rs py html css java c cpp cs go sql sh ps1 yml yaml toml')

export function fileKind(name: string, isDir: boolean): FileKind {
  if (isDir) return 'folder'
  const dot = name.lastIndexOf('.')
  return dot > 0 ? (BY_EXT[name.slice(dot + 1).toLowerCase()] ?? 'other') : 'other'
}

export const KIND_ICON: Record<FileKind, LucideIcon> = {
  folder: Folder,
  image: FileImage,
  video: FileVideo,
  audio: FileAudio,
  archive: FileArchive,
  sheet: FileSpreadsheet,
  doc: FileText,
  code: FileCode,
  other: File,
}

/** "1,2 MB", "820 KB", "12 B". */
export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  const units = ['KB', 'MB', 'GB', 'TB']
  let value = bytes / 1024
  let i = 0
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024
    i++
  }
  const text = value < 10 ? value.toFixed(1).replace('.', ',') : String(Math.round(value))
  return `${text.replace(/,0$/, '')} ${units[i]}`
}
