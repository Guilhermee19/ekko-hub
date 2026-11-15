import type { Device, Track } from './store'

// Prototype data until the Spotify integration lands. Cover gradients are the only
// literal colors allowed (they stand in for album art).

export const DEVICES: Device[] = [
  { id: 'pc', name: 'PC do Guilherme', kind: 'desktop' },
  { id: 'phone', name: 'Celular', kind: 'phone' },
  { id: 'echo', name: 'Echo Dot', kind: 'speaker' },
]

export const TRACKS: Track[] = [
  {
    id: 't1',
    title: 'Do I Wanna Know?',
    artist: 'Arctic Monkeys',
    album: 'AM',
    durationSec: 272,
    cover: 'linear-gradient(135deg, #0b1d33 0%, #1b4f7a 55%, #5ec8ff 100%)',
  },
  {
    id: 't2',
    title: 'Garota de Ipanema',
    artist: 'Tom Jobim',
    album: 'Getz/Gilberto',
    durationSec: 324,
    cover: 'linear-gradient(160deg, #2a1a0b 0%, #a0581c 60%, #ffc27a 100%)',
  },
  {
    id: 't3',
    title: 'Coffee Break',
    artist: 'Lofi Girl',
    album: 'Lo-fi para estudar',
    durationSec: 148,
    cover: 'linear-gradient(135deg, #1b1030 0%, #5b3a8c 55%, #f1a7d0 100%)',
  },
  {
    id: 't4',
    title: 'Tempo Perdido',
    artist: 'Legião Urbana',
    album: 'Dois',
    durationSec: 301,
    cover: 'linear-gradient(200deg, #07140f 0%, #1f5c43 55%, #9be3b8 100%)',
  },
  {
    id: 't5',
    title: 'Midnight City',
    artist: 'M83',
    album: 'Hurry Up, We’re Dreaming',
    durationSec: 244,
    cover: 'linear-gradient(135deg, #12051f 0%, #3d1a6e 50%, #ff6fb1 100%)',
  },
  {
    id: 't6',
    title: 'Ainda Bem',
    artist: 'Marisa Monte',
    album: 'O Que Você Quer Saber de Verdade',
    durationSec: 236,
    cover: 'linear-gradient(170deg, #1f0d0d 0%, #8c2f2f 55%, #ffb199 100%)',
  },
]
