// Stand-in art when a player sends none. Cover gradients are the only literal colors
// allowed (they stand in for album art).

export const FALLBACK_COVERS: string[] = [
  'linear-gradient(135deg, #0b1d33 0%, #1b4f7a 55%, #5ec8ff 100%)',
  'linear-gradient(160deg, #2a1a0b 0%, #a0581c 60%, #ffc27a 100%)',
  'linear-gradient(135deg, #1b1030 0%, #5b3a8c 55%, #f1a7d0 100%)',
  'linear-gradient(200deg, #07140f 0%, #1f5c43 55%, #9be3b8 100%)',
  'linear-gradient(135deg, #12051f 0%, #3d1a6e 50%, #ff6fb1 100%)',
  'linear-gradient(170deg, #1f0d0d 0%, #8c2f2f 55%, #ffb199 100%)',
]

/** Stable stand-in per key (same track, same gradient). */
export function fallbackCover(key: string): string {
  let hash = 0
  for (const ch of key) hash = (hash * 31 + ch.charCodeAt(0)) | 0
  return FALLBACK_COVERS[Math.abs(hash) % FALLBACK_COVERS.length]
}

/** CSS background for a remote/data image URL, or the stand-in. */
export function coverOf(url: string | null, key: string): string {
  return url ? `url("${url}") center/cover` : fallbackCover(key)
}
