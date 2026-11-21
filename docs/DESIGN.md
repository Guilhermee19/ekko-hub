# Design: Ekko Hub

**Estética do Jarvis** (HUD escuro, um único accent, glow, anéis) com o **layout do Kobi** (notch no topo, painel com sidebar e cards).

## Tokens

Todos os tokens ficam em `apps/desktop/src/theme/tokens.css`, no `@theme` do Tailwind 4. **O accent é a única cor da interface.** Grade, vinheta e glow derivam dele via `color-mix`.

| Token | Ekko (padrão, ciano) | Ultron (âmbar) | Tobby (teal) |
|---|---|---|---|
| `--color-base` | `#04070d` | `#0a0604` | `#030a09` |
| `--color-surface` | `#0a121c` | `#150d06` | `#08141a` |
| `--color-surface-hover` | `#111d2b` | `#21150a` | `#0f1f24` |
| `--color-border-soft` | `#17293a` | `#3a2611` | `#163033` |
| `--color-content` | `#dbe9f5` | `#f4e5d1` | `#d6f2ee` |
| `--color-muted` | `#6a8399` | `#9a7a5a` | `#5f8d88` |
| `--color-accent` | `#5ec8ff` | `#ff9c3f` | `#3fe0c5` |
| `--color-accent-strong` | `#0b7fc0` | `#b8560f` | `#0e9c86` |
| `--color-danger` | `#ff6b6b` | `#ff5470` | `#ff6b6b` |

**Personas:** o atributo `data-persona` no `<html>` troca a paleta inteira. Nenhum componente sabe que o tema existe. Cada persona também define voz e tom (F2/F3).

## Tipografia

- Stack do sistema: `'Segoe UI Variable', 'Segoe UI', system-ui`. Fica nativo no Windows 11.
- **Labels HUD:** `text-[10px] uppercase tracking-[0.2em] text-muted`.
- Logs e números: `font-mono` + `tabular-nums`.
- Corpo: 13–14px. Títulos de tela: 18–20px semibold.

## Superfícies

- **Vidro:** `bg-surface/70 backdrop-blur-md border border-border-soft`.
- **Notch:** fundo `base` quase opaco (o notch "sai" da borda da tela), cantos inferiores arredondados, borda accent sutil quando ativo.
- **Moldura HUD:** borda `accent/10` + colchetes `accent/40` nos cantos (`HudFrame`).
- **Cards:** `rounded-xl bg-surface border-border-soft`, hover `surface-hover`.
- Bolha do usuário `bg-accent-strong`; bolha do assistente `bg-surface border`.

## Movimento

- Entradas de 160–320 ms, curva `cubic-bezier(0.32,0.72,0,1)`; saídas mais rápidas.
- Notch: expande com mola curta (largura e altura animadas juntas).
- Anéis do orb: 38s / 22s / 11s. Respiração: 4.5s.
- `prefers-reduced-motion`: tudo desliga, exceto o glow do orb (é sinal de estado, não movimento).

## Estados do assistente (cores e sinais)

| Estado | Sinal visual |
|---|---|
| idle | ponto accent fraco "respirando" |
| listening | waveform reagindo ao microfone + ponto vermelho (`danger`) |
| thinking | anel girando + botão cancelar |
| speaking | waveform do TTS + botão interromper |
| toast | texto curto deslizando na pílula |
| activity | timer, música ou volume ao vivo na pílula |

## Ícones

`lucide-react` (traço 1.75), sempre `currentColor`.
