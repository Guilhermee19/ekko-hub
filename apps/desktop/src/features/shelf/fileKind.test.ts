import { describe, expect, it } from 'vitest'
import { fileKind, formatSize } from './fileKind'

describe('fileKind', () => {
  it('reads the extension, case-insensitive', () => {
    expect(fileKind('Capa.PNG', false)).toBe('image')
    expect(fileKind('relatorio.final.pdf', false)).toBe('doc')
    expect(fileKind('backup.7z', false)).toBe('archive')
  })

  it('folders win and unknown or dotfiles fall back', () => {
    expect(fileKind('fotos.png', true)).toBe('folder')
    expect(fileKind('Makefile', false)).toBe('other')
    expect(fileKind('.env', false)).toBe('other')
  })
})

describe('formatSize', () => {
  it('uses pt-BR decimals and drops ",0"', () => {
    expect(formatSize(12)).toBe('12 B')
    expect(formatSize(1024)).toBe('1 KB')
    expect(formatSize(1_258_291)).toBe('1,2 MB')
    expect(formatSize(820 * 1024)).toBe('820 KB')
  })
})
