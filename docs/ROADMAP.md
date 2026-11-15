# Roadmap: Ekko Hub

> O Ekko ("eco") é um assistente de desktop **local-first para Windows**. Ele mora no topo da tela, conversa por texto e voz, usa IA grátis, local ou paga, e controla o PC.
> Referências: Kobi (experiência do produto), jarvis-tauri-ia (identidade visual e base de funções) e claude-usage-tray (modo bandeja).

**Regra do roadmap:** cada fase termina com uma **aprovação do Guilherme**. A fase seguinte só começa depois disso.
**Ordem:** telas → conversa e IA → voz → funções (da mais fácil à mais complexa) → integrações → avatar → polimento → v2 (servidor + celular).

Legenda: `[ ]` a fazer · `[~]` em andamento · `[x]` feito

---

## Visão geral

| Fase | Tema | Status |
|---|---|---|
| F0 | Fundação (repo, workspace, tema, lint, testes) | `[x]` |
| F1 | UX/UI completa com dados mock (3 rodadas) | `[~]` |
| F2 | Conversa + IA (grátis, local, paga) | `[ ]` |
| F3 | Voz (push-to-talk, STT, TTS, wake word) | `[ ]` |
| F4 | Funções fáceis (tools básicas) | `[ ]` |
| F5 | Produtividade (tarefas, lembretes, hábitos, rotinas) | `[ ]` |
| F6 | Controle do PC | `[ ]` |
| F7 | Integrações (Spotify, Calendar, MCP, memória, casa) | `[ ]` |
| F8 | Avatar do Ekko | `[ ]` |
| F9 | Polimento v1 (instalador, autostart, update) | `[ ]` |
| V2 | Servidor + app no celular | `[ ]` |

---

## F0: Fundação

- [x] Repo `ekko-hub` + docs (ROADMAP, ARCHITECTURE, DESIGN, AGENTS)
- [x] Workspace Cargo (`crates/*` + `apps/desktop/src-tauri`)
- [x] `ekko-core`: tipos de settings (DisplayMode, Persona), erros
- [x] App desktop: Tauri 2 + Vite + React 19 + TS + Tailwind 4 + zustand
- [x] Tokens de tema e personas (`data-persona`) portados do Jarvis
- [x] Lint e formatação: clippy (`deny`), rustfmt, ESLint, Prettier
- [x] Testes: `cargo test`, `vitest`
- [x] Modo galeria no navegador (`npm run dev`): todas as superfícies lado a lado, sem Tauri

**Pronto quando:** `npm run tauri dev` abre o Ekko com tema e troca de persona funcionando.

---

## F1: UX/UI (protótipo real com dados mock)

O frontend fala com o backend só via `lib/ipc`. Na F1 tudo vem de `lib/ipc/mock`, e cada fase seguinte troca o mock pelo real **sem mexer na UI**.

### F1a: design system + Notch + modos de exibição
- [x] Componentes base: Button, IconButton, Card, Segmented, Kbd, HudFrame, EkkoCore (orb), EkkoFace (avatar provisório), Waveform, Slider, ProgressBar · F1b: StatCard, Badge, ProgressRing, PageHeader, EmptyState, Toggle, Input, Check
- [x] **Notch** com todos os estados: repouso · hover/expandido · ouvindo · pensando (cancelar) · falando (interromper) · toast · atividade viva (timer, música, volume)
- [x] **Bandeja**: ícone + flyout ancorado acima da taskbar (work area + cursor) + menu de contexto (com troca de modo)
- [x] **Orb flutuante**: bolha arrastável
- [x] **Dock lateral**: barra na borda que desliza
- [x] **Central (HUD)**: janela grande com o orb do Jarvis
- [x] **Só voz**: overlay mínimo efêmero
- [x] Troca de modo sem reiniciar + modo salvo nos settings
- [x] Hover do notch preciso (área de clique = parte visível, sem atualização fora de ordem)
- [x] **Personalização do notch**: arrastar pela barra de cima (inclusive entre monitores), posição (prévia arrastável + Esquerda/Centro/Direita), monitor, tamanho do painel (Compacto/Normal/Grande), abrir por hover ou clique, atraso do hover, repouso em pílula ou linha mínima
- [x] Notch fica aberto enquanto você digita ou depois de clicar; fecha ao clicar fora ou com Esc
- [x] **Aprovação 1a** (ajustes: hover preciso + personalização do notch)

### F1b: painel e telas
Cada tela fica em `features/<tela>/` com um store zustand próprio (dados mock) que a F2+ troca pelo backend.
- [x] Shell do painel (sidebar estilo Kobi + nível/XP, contadores ao vivo, menu "Mais" no compacto)
- [x] Início: saudação, input (manda para a Conversa), cards (água, tarefas, avisos, timers), música tocando, últimas mensagens
- [x] Conversa: bolhas, streaming simulado (parar), log de ações com confirmar/cancelar, anexar print, sugestões
- [x] Tarefas e Lembretes: listas, prioridade, subtarefas, repetição, atrasadas, concluídas
- [x] Timers e Foco: timers nomeados (aparecem no notch), cronômetro com voltas, Pomodoro
- [x] Hábitos: água, leitura, exercício, pausas, sequência de 7 dias, dica de pausa
- [x] Música: capa, controles, volume, fila, dispositivo, "Conectar Spotify"
- [x] Copiados: histórico do clipboard (fixar, buscar, limpar) + snippets
- [x] Rotinas: gatilho → ações, ligar/desligar, rodar agora, editor
- [x] Meu PC: status ao vivo com gráficos, programas pesados, verificação com anel de progresso
- [x] Memória: fatos, notas e mapa (grafo)
- [x] **Aprovação 1b**

### F1c: configurações e fluxos
- [x] Janela de Configurações: Geral, Aparência, Avatar (prévia), Cérebro (IA), Voz, Funções e Autonomia, Atalhos, Privacidade e Segurança, Conexões, Diagnóstico, Sobre
- [x] Onboarding: boas-vindas → nome → IA → voz → modo de exibição → pronto (janela própria na primeira vez; "Refazer boas-vindas" em Geral)
- [x] Paleta de comandos (janela própria; `Ctrl+Alt+Espaço`, ou `Alt+Shift+Espaço` se o primeiro estiver ocupado; também no menu da bandeja)
- [x] Diálogo de confirmação de ação arriscada (perigosa exige 3 s; "Desfazer" por 6 s)
- [x] Notificações (central no painel + toast no notch) e alarme em tela (janela própria, adiar 5 min)
- [x] Regra de permissão (autonomia × risco × exceção por função) em `toolsModel.ts`, base do loop da F4
- [ ] **Aprovação 1c** ← aguardando

---

## F2: Conversa + IA

- [ ] `ekko-ai`: trait `LlmProvider` com streaming + tool calling nativo
- [ ] Providers:
  - **Grátis:** Groq e Gemini (free tier), com fallback automático entre eles
  - **Local:** Ollama (modelo com tool calling, ex.: família qwen3), com detecção e download guiado
  - **Pagos:** Anthropic (Claude), OpenAI, Gemini
- [ ] Modos do Cérebro: "Automático grátis" · "Eu escolho" · "No meu PC"
- [ ] Chaves no Windows Credential Manager (`keyring`)
- [ ] `ekko-store`: SQLite + migrações, histórico de conversa
- [ ] Personalidades: divertido, fofo, profissional, sarcástico, zen (+ personas visuais)
- [ ] "Testar esta IA" (latência + resposta)
- [ ] Tipos Rust → TS gerados (tauri-specta)
- [ ] **Aprovação F2:** conversa real pela UI nos 3 modos

## F3: Voz

- [ ] `ekko-voice`: captura de microfone (cpal) + VAD Silero
- [ ] Push-to-talk (segurar a tecla captura a frase inteira; toque rápido cancela)
- [ ] STT: whisper.cpp (filtros de alucinação do Jarvis)
- [ ] TTS: Piper (rápido) + Kokoro (qualidade), interrompível
- [ ] Modo conversa (microfone aberto, fim de frase por silêncio)
- [ ] Wake word "Ei, Ekko" com openWakeWord (ONNX) + treino com gravações do usuário
- [ ] Download dos modelos feito pelo próprio app (nada instalado à mão)
- [ ] **Aprovação F3**

## F4: Funções fáceis

- [ ] `ekko-tools`: registro de tools (1 arquivo por tool: schema, risco, executor, teste)
- [ ] Loop do agente: tool calling com várias etapas + auditoria
- [ ] Tools: hora e data, timer, cronômetro, Pomodoro, calculadora, conversão de unidades, clima (Open-Meteo), cotações (AwesomeAPI), notícias, tradução, gerar senha, cara ou coroa, piadas, notas rápidas, histórico do clipboard
- [ ] **Aprovação F4**

## F5: Produtividade

- [ ] Tarefas (listas, prioridade, subtarefas, repetição)
- [ ] Lembretes e alarmes com som
- [ ] Hábitos (água, leitura, exercício, pausas) + alerta de PC sobrecarregado
- [ ] Rotinas (gatilho por hora, evento ou frase → sequência de ações)
- [ ] Notificações nativas do Windows
- [ ] Briefing da manhã (clima + agenda + tarefas)
- [ ] Modo foco / não perturbe
- [ ] **Aprovação F5**

## F6: Controle do PC

Toda tool aqui tem nível de risco. As ações `Confirm` e `Dangerous` passam pelo diálogo de confirmação, conforme a autonomia escolhida. Tudo vai para o log de auditoria.

- [ ] Volume, mute, teclas de mídia (portado do Jarvis)
- [ ] Abrir apps e sites (validação do Jarvis `target.rs`)
- [ ] Fechar apps
- [ ] Janelas: focar, minimizar, organizar, layouts de trabalho ("modo trabalho")
- [ ] Buscar arquivos (Windows Search / Everything SDK)
- [ ] Organizar a área de trabalho com **desfazer**
- [ ] Status do PC (CPU, RAM, GPU, disco) + "Verificar meu PC"
- [ ] Desligar, reiniciar ou suspender agendado
- [ ] Screenshot + visão ("o que tem na minha tela?")
- [ ] Ditado em qualquer app (digita o que você fala)
- [ ] Ações sobre o texto selecionado (traduzir, resumir, corrigir) via hotkey
- [ ] Teclado e mouse (enigo)
- [ ] Shell com allowlist
- [ ] Esconder em tela cheia (jogos e vídeos)
- [ ] **Aprovação F6**

## F7: Integrações

- [ ] Spotify completo (OAuth: capa, fila, dispositivos, tocar em outro aparelho)
- [ ] Google Calendar
- [ ] Mandar tarefa pesada para o Claude Code
- [ ] **Cliente MCP**: plugar qualquer servidor MCP como tools
- [ ] Memória de longo prazo (notas markdown + busca vetorial, portada do Jarvis)
- [ ] Casa inteligente Tuya (portada do Jarvis)
- [ ] Câmeras e vigilância (portadas do Jarvis)
- [ ] Espelho de notificações (WhatsApp)
- [ ] Home Assistant
- [ ] **Aprovação F7**

## F8: Avatar

- [ ] Definir o personagem do Ekko (conceito, paleta por persona)
- [ ] Escolher a técnica: SVG animado · Lottie · Rive
- [ ] Expressões ligadas ao estado: repouso, ouvindo, pensando, falando, feliz, triste, surpreso, dormindo…
- [ ] Comportamentos de idle
- [ ] Customização: cor, olhos, acessórios, nome
- [ ] Sair do notch e andar pela área de trabalho
- [ ] **Aprovação F8**

## F9: Polimento v1

- [ ] Autostart com o Windows
- [ ] Instalador (NSIS/MSI) + auto-update (plugin updater do Tauri)
- [ ] Multi-monitor (lembrar monitor e posição)
- [ ] "Modo desempenho" e consumo de RAM otimizado
- [ ] Diagnóstico (mic, voz, webcam, tela, IA)
- [ ] Multi-perfis
- [ ] **Release v1.0**

## V2: Servidor + celular

- [ ] `apps/server` (axum) reaproveitando as crates
- [ ] API HTTP + WebSocket com token (padrão do `hey-jarvis` `auth_middleware`)
- [ ] Acesso remoto via Tailscale
- [ ] Pareamento do celular por QR code
- [ ] App de celular: PWA primeiro, depois nativo (Tauri mobile ou React Native)
- [ ] O PC vira o "agente remoto": o celular pede e o PC executa
- [ ] Push notifications de lembretes no celular

---

## Ideias em espera (backlog)

- Modo reunião (transcrição + resumo)
- Widgets de desktop (relógio, clima, notas)
- Plugins e skills da comunidade
- Sincronização com o iPhone Calendar
- Modo jogo (perfil de desempenho + atalhos)
