# Spec: refresh de UI/UX do Ekko

> **Status:** proposta. **P1 implementada** (forma com orelhas, sem borda na pílula, aura embaixo). A prateleira de arquivos já vive no notch aberto e é candidata à aba `Bandeja` do peek (P2).
> **Escopo:** visual e interação das superfícies existentes (notch, painel, bandeja, Início, Meu PC). Nenhuma feature nova de backend.
> **Referências:** 5 imagens de inspiração (card "Hire Me" com base colorida, barra lateral com anéis no celular, barra de volume/silencioso saindo da borda, notch do Mac expandido estilo "Nook", pílulas de métrica com anel e glow).

---

## 1. Diagnóstico do estado atual

Olhando `docs/screenshots/notch-home.webp`, `mypc.webp`, `mode-tray.webp` e `pill-music.webp`:

| # | Problema | Onde | Efeito |
|---|---|---|---|
| D1 | O notch "abre" direto no painel completo (sidebar + conteúdo, ~1440 px). Não existe um nível intermediário. | `surfaces/notch`, `surfaces/panel` | Passar o mouse para ver a música joga o usuário num app inteiro. Muito peso para uma olhada rápida. |
| D2 | O notch é um retângulo com cantos inferiores arredondados. Ele encosta na borda, mas não parece **sair** dela. | `.notch-pill` em `theme/tokens.css` | Parece uma janela flutuante colada no topo, não parte da tela. |
| D3 | Cards todos iguais: `bg-surface` chapado + borda 1px. Sem elevação, sem luz. | `ui/primitives.tsx` (`Card`) | Interface plana; nada guia o olho. Os 4 cards do Início têm o mesmo peso. |
| D4 | Cards do Início mostram `0`, `0`, `0/8`: números grandes que dizem "nada". | `features/home/HomeCards.tsx` | O espaço mais nobre da tela comunica vazio. |
| D5 | `label-hud` (10 px, maiúsculas, tracking 0.2em) em todo título de card. | `tokens.css`, cards | Ruído visual, leitura lenta. Fica com cara de "tema sci-fi", não de produto. |
| D6 | Sidebar com 4 itens "EM BREVE" no meio da navegação, barra de nível/XP no topo e "Notificações" cortado no fim. | `surfaces/panel/nav.ts`, `PanelShell.tsx` | Metade da navegação leva a lugar nenhum; o item real some por overflow. |
| D7 | Faixa tracejada "PROTÓTIPO · SIMULAR ESTADOS" no Início de produção. | `features/home/HomePage.tsx` | Ferramenta de dev exposta ao usuário. |
| D8 | Meu PC: barras e sparklines finas, todas na mesma cor, sem sinal de "está alto". | `features/mypc/StatusGrid.tsx` | Disco a 85% e GPU a 12% parecem igualmente tranquilos. |
| D9 | Mudanças rápidas de estado (volume, mic, não perturbe) não têm um feedback próprio no notch. | `NotchSurface.tsx` | Usuário não sabe se o atalho funcionou. |

---

## 2. O que tirar de cada referência

### R1 · Card "Hire Me" (base colorida por baixo)
- **Camadas:** um card escuro em cima de uma "base" accent que aparece só embaixo, com uma frase de estado. Dá identidade sem pintar a interface de cor.
- **Hierarquia limpa:** meta-label em cima à esquerda (sentence case, cinza), hora em cima à direita, avatar + nome + ponto de status, duas ações de mesmo peso.
- **Luz:** gradiente sutil (canto superior mais claro), borda interna clara no topo, sombra grande e macia.
- **Botões secundários "elevados":** cinza translúcido, ícone + texto, mesmo tamanho lado a lado.

### R2 · Barra lateral com anéis (celular)
- Forma preta que **brota da borda** com cantos côncavos (filete invertido) onde encontra a tela.
- Métrica como **anel + ícone dentro + % embaixo**. Cada anel tem cor própria.

### R3 · Volume / Silencioso / Trabalho
- A mesma forma "líquida" saindo da borda, com curvas em S suaves.
- **Estados transitórios** como ícone colorido + rótulo curto em maiúsculas (`SILENT`, `WORK`).
- Volume como slider vertical grosso, preenchimento claro.

### R4 · Notch do Mac estilo "Nook"
- O notch expande **no mesmo preto da moldura**: parece que a tela cresceu, não que abriu uma janela.
- **Painel compacto de duas colunas:** mídia à esquerda, agenda à direita, divisor fino.
- Abas pequenas em pílula no topo (`Nook`, `Tray`) + engrenagem à direita.
- Faixa de dias horizontal com o dia de hoje destacado em cor e maior.

### R5 · Pílulas de métrica (Spline)
- Forma de pílula, anel à esquerda, número grande + legenda pequena à direita.
- O anel **projeta um glow da própria cor** dentro da pílula (radial atrás do anel).
- Superfície com gradiente escuro e borda clara de 1px, sombra difusa embaixo.

---

## 3. Princípios do refresh

1. **O Ekko sai da tela, não flutua sobre ela.** Toda superfície presa a uma borda (notch, dock, bandeja) usa a forma com filete invertido.
2. **Três níveis de atenção:** pílula (olhar) → *peek* (consultar) → painel (trabalhar). Cada nível só aparece quando o anterior não basta.
3. **Luz, não cor.** Profundidade vem de gradiente, highlight e sombra. O accent continua sendo a única cor de identidade.
4. **Cor com significado.** Fora o accent, cor só aparece para dizer estado (ok, atenção, crítico, gravando).
5. **Vazio não ganha número grande.** Sem dado, o card encolhe ou vira um convite de ação.

---

## 4. Propostas

### P1 · Forma do notch com filete invertido (R2, R3, R4) — **alta**

Hoje: retângulo com `border-bottom-*-radius`.
Proposta: adicionar duas "orelhas" côncavas nos cantos superiores, onde o notch encontra a borda da tela.

```
 ───────╮                    ╭───────   ← borda da tela
        ╰──╮              ╭──╯          ← filete invertido (orelha)
           │   pílula     │
           ╰──────────────╯
```

- Implementar com dois pseudo-elementos (`::before`/`::after`) usando `radial-gradient` transparente no centro, ou um `mask` SVG. Raio da orelha = `--notch-radius * 0.6`.
- Ao expandir, as orelhas acompanham a largura (mesma animação).
- Remover a borda accent em volta da pílula fechada: a forma preta já se separa do wallpaper. A borda/glow accent fica só para **estado ativo** (ouvindo, alarme).
- Mesma forma para o **dock lateral** (orelhas em cima e embaixo, como R2/R3).
- Novo token: `--notch-ear: calc(var(--notch-radius) * 0.6)`. Respeita a opção "formato" das Configurações de aparência.

### P2 · Nível "peek": notch expandido compacto (R4) — **alta**

Novo estado entre a pílula e o painel. Hover na pílula abre o peek; clique (ou "Abrir Ekko") vai para o painel completo.

```
╭──────────────────────────────────────────────────────╮
│ (Agora) (Bandeja)                          ⚙   ↗     │
│ ┌────┐ Do I Wanna Know?       │  Nov  14 15 [16] 17 18│
│ │capa│ Arctic Monkeys         │       ──────────────  │
│ └────┘ ⏮  ⏯  ⏭   ▂▃▅▃▂     │  15:00 Daily · em 28m │
│ ◔ Café passando  03:19  ⏸     │                       │
╰──────────────────────────────────────────────────────╯
```

- **Coluna esquerda:** "Agora": música, ou timer ativo se não houver música; se houver os dois, timer vira uma linha abaixo da música.
- **Coluna direita:** faixa de 5–7 dias com hoje destacado (accent, maior, `font-semibold`) + próximo compromisso ou "Nada para hoje".
- **Abas em pílula** no topo: `Agora` e `Bandeja` (bandeja = atalhos rápidos: água +1, nova tarefa, novo timer, Meu PC). Engrenagem e "abrir painel" à direita.
- Largura ~640 px, altura ~150 px. Fundo `--notch-bg` (mesmo preto da pílula), sem card dentro de card.
- O painel completo continua existindo para Tarefas, Agenda, Meu PC etc.
- Arquivos: novo `surfaces/notch/NotchPeek.tsx`; `surfaces/notch/layout.ts` ganha o estado `peek`; geometria em `src-tauri/src/display/geometry.rs`.

### P3 · Estados transitórios no notch (R3) — **média**

Quando algo muda por atalho ou sistema, a pílula mostra 1,5 s de feedback e volta ao que mostrava antes:

| Evento | Pílula mostra |
|---|---|
| Volume do Windows mudou | ícone de alto-falante + barra horizontal grossa com o nível (no dock: vertical, igual R3) |
| Mic ligado/desligado | ícone de mic em `danger` + `Ouvindo` / `Mic desligado` |
| Não perturbe / horário silencioso | ícone de lua + `Silencioso` |
| Timer adicionado | ícone de timer + `Timer de 25 min` |

- Rótulo curto, `text-[11px] font-semibold uppercase tracking-wide`, ícone em cor de estado.
- Entra no `lib/pillPriority.ts` como prioridade "toast", acima de música, abaixo de alarme.

### P4 · Superfícies com luz (R1, R5) — **alta**

Novos tokens em `theme/tokens.css` (todos derivados dos existentes, então personas continuam funcionando):

```css
--surface-gradient: linear-gradient(
  160deg,
  color-mix(in srgb, var(--color-surface) 100%, white 4%) 0%,
  var(--color-surface) 60%
);
--edge-highlight: inset 0 1px 0 color-mix(in srgb, white 7%, transparent);
--elevation-1: 0 1px 2px rgb(0 0 0 / .4), 0 8px 24px -8px rgb(0 0 0 / .5);
--elevation-2: 0 2px 4px rgb(0 0 0 / .4), 0 24px 48px -12px rgb(0 0 0 / .6);
```

- `Card` passa a usar `background: var(--surface-gradient)`, `box-shadow: var(--edge-highlight), var(--elevation-1)`, raio 16 px (hoje 12).
- Borda: manter 1px `border-soft`, mas com 60% de opacidade; quem separa é a sombra.
- Painel/janela principal usa `--elevation-2`.
- `.glass` ganha o `--edge-highlight`.
- Atualizar a seção **Superfícies** de `docs/DESIGN.md`.

### P5 · Botão secundário "elevado" (R1) — **média**

Nova variante `variant="raised"` em `Button`:
- Fundo `color-mix(surface-hover, white 6%)`, `--edge-highlight`, raio 12 px, altura 40 px, ícone 16 px + texto 14 px medium.
- Hover: +3% de branco. Pressionado: `scale(0.98)`, sem highlight.
- Uso: pares de ações (`Verificar agora` / `Limpar`, `Conectar` / `Ver passo a passo`, ações do card de presença).
- O botão primário (accent sólido) continua só para **a** ação principal da tela.

### P6 · Card de presença com base de estado (R1) — **alta**

Substitui o topo da sidebar (avatar + "Pronto" + barra de nível) e vira o primeiro bloco do Início:

```
╭────────────────────────────────────────╮
│ Assistente                     ⏰ 14:32 │
│ (••)  Ekko                              │
│       ● Pronto                          │
│ [ ⊕ Novo timer ]   [ ✎ Nova tarefa ]    │
╰────────────────────────────────────────╯
│        ⚡ Focando · faltam 18 min        │  ← base accent
╰────────────────────────────────────────╯
```

- A base accent só aparece quando existe algo para dizer (timer de foco, próxima reunião em < 15 min, "3 lembretes hoje"). Sem nada, o card fica sozinho, sem base.
- Texto da base em `--color-base` sobre `--color-accent` (checar contraste por persona).
- A barra de nível/XP sai da navegação; se continuar existindo, vai para dentro do card como detalhe pequeno.

### P7 · Métricas em anel com glow (R2, R5) — **alta**

Novo componente `ui/RingStat.tsx`:
- Anel SVG (traço 6 px, trilha `border-soft`), ícone ou valor no centro.
- Glow: `radial-gradient` da cor do anel a 18% atrás do anel, vazando para dentro do card (R5).
- Animação de preenchimento ao montar (320 ms, `--ease-out-soft`); desliga em reduced motion.
- Variante `pill` (R5): anel à esquerda, número 24 px semibold + legenda 12 px à direita, raio total.
- Variante `compact` (R2): anel 36 px com ícone dentro, % embaixo. Para o dock e o peek.

**Onde usar:**
- **Início:** Água (`3/8`, anel = progresso do dia) e Timer (anel = tempo restante) viram `RingStat pill`. Tarefas e Avisos viram linhas de texto ("2 tarefas para hoje", "Nada agendado") ou somem quando zerados (D4).
- **Meu PC:** CPU, Memória, GPU e Disco viram anéis; a sparkline fica embaixo, menor. Rede continua com gráfico (não é porcentagem).
- **Dock lateral:** coluna de anéis compactos (CPU, memória, timer), igual R2.

### P8 · Cor de estado (R2, R5) — **média, precisa de ADR**

A regra "o accent é a única cor" continua para **identidade**. Adicionar tokens **semânticos**, usados só para estado:

| Token | Uso |
|---|---|
| `--color-ok` | métrica normal, conexão ok |
| `--color-warn` | métrica alta (ex.: > 75%), lembrete atrasado |
| `--color-danger` (já existe) | crítico (> 90%), gravando, erro |

- O anel da métrica é accent até o limite de aviso; acima disso muda para `warn`/`danger`. Assim Disco 85% fica visivelmente diferente de GPU 12% (D8).
- Cada persona define os três valores para combinar com a paleta.
- Registrar em `docs/adr/` (muda uma regra do `DESIGN.md`).
- **Não** adotar uma cor por métrica (como R2 faz): isso quebraria a ideia de persona.

### P9 · Tipografia mais calma (R1, R5) — **média**

- Títulos de card: **sentence case**, 12–13 px, `text-muted`, sem tracking (`Água`, `Próxima reunião`). Igual ao "Web Designer" e "Sales by Day".
- `label-hud` fica só para cabeçalhos de seção e telemetria (Meu PC, logs), onde o tom técnico ajuda.
- Números grandes: `Segoe UI Variable Display` semibold + `tabular-nums`. `font-mono` só para relógios/timers e logs.
- Escala: 12 / 13 / 14 / 18 / 24 / 32. Hoje há muitos tamanhos próximos.

### P10 · Navegação (D6, D7) — **alta**

- Itens "Em breve" saem do meio da lista. Ficam num grupo recolhido no fim ("Em breve · 4"), ou somem até existirem (o README já lista o que vem).
- Grupos com separador: **Dia** (Início, Tarefas, Timers, Agenda, Hábitos) · **Mídia e PC** (Música, Meu PC) · **Sistema** (Notificações, Configurações).
- Garantir que a sidebar role ou caiba: "Notificações" não pode ficar cortado.
- Item ativo: fundo `surface-hover` + `--edge-highlight` + barra accent de 2 px à esquerda (hoje só o fundo).
- Faixa "Protótipo · simular estados" sai do Início; fica só na galeria (`surfaces/gallery`) ou atrás de uma flag de dev.

### P11 · Bandeja e dock — **baixa**

- Bandeja (`mode-tray`): aplicar P4/P6/P7. A barra de abas inferior ganha indicador em pílula sob o ícone ativo.
- Dock lateral: forma de P1 nas duas pontas + coluna de `RingStat compact` + engrenagem no pé (R2).

### P12 · Movimento — **média**

- Pílula → peek → painel: morph único (largura, altura e raio juntos), mola curta (`stiffness ~400, damping ~32`), 280–320 ms.
- Conteúdo do peek entra 60 ms depois do container, com `fade + translateY(4px)`, stagger de 30 ms por coluna.
- Estado transitório (P3): entra com crossfade de 160 ms, sai em 120 ms.
- Anéis: preenchem do zero na primeira montagem; depois só interpolam o valor.
- Tudo respeita `data-reduce-motion` (já existe a infra em `tokens.css`).

---

## 5. Acessibilidade e checagens

- Contraste: `--color-muted` sobre o novo `--surface-gradient` precisa de ≥ 4.5:1 nas 3 personas; texto da base accent (P6) idem.
- Cor nunca sozinha: anel em `warn`/`danger` vem com o número e, acima do limite, um ícone de alerta.
- Estados transitórios (P3) anunciados via `aria-live="polite"`.
- Peek acessível por teclado: o atalho global abre o peek com foco na primeira ação; `Esc` fecha; `Enter` em "abrir painel" leva ao painel.
- Alvos de toque/clique ≥ 32 px no notch (hoje os controles da música estão perto disso).

---

## 6. Plano de execução sugerido

| Fase | Entrega | Propostas | Toca em |
|---|---|---|---|
| 1 · Base visual | Tokens de luz, `Card`, `Button raised`, tipografia | P4, P5, P9 | `tokens.css`, `ui/primitives.tsx`, `DESIGN.md` |
| 2 · Limpeza | Sidebar agrupada, "Em breve" fora, protótipo fora do Início | P10 | `surfaces/panel/*`, `features/home/HomePage.tsx` |
| 3 · Métricas | `RingStat` + cor de estado + ADR | P7, P8 | `ui/RingStat.tsx`, `features/home`, `features/mypc/StatusGrid.tsx`, `docs/adr/` |
| 4 · Início | Card de presença com base | P6 | `features/home/*` |
| 5 · Notch | Forma com orelhas, peek, estados transitórios, movimento | P1, P2, P3, P12 | `surfaces/notch/*`, `lib/pillPriority.ts`, `geometry.rs` |
| 6 · Modos | Bandeja e dock | P11 | `surfaces/dock`, `surfaces/panel` |

Cada fase atualiza os screenshots em `docs/screenshots/` e passa em `npm run check` + `cargo clippy`/`cargo test` quando tocar Rust.

---

## 7. Perguntas em aberto

1. **Peek substitui ou convive** com a abertura direta do painel? Sugestão: hover = peek, clique = painel; configurável.
2. **Nível/XP** continua existindo? Se sim, onde (card de presença ou Configurações)?
3. **Cores semânticas (P8):** ok abrir exceção na regra do accent único só para estado?
4. **Itens "Em breve":** grupo recolhido ou esconder de vez até ficarem prontos?
