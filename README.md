# Ekko Hub

O Ekko ("eco") é um assistente de desktop local-first para Windows. Ele mora no topo da tela, conversa por texto e voz, usa IA grátis, local ou paga, e controla o PC.

- Roadmap e fase atual: [docs/ROADMAP.md](docs/ROADMAP.md)
- Arquitetura: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) · Design: [docs/DESIGN.md](docs/DESIGN.md)

## Rodar

Requisitos: Node 24+, Rust estável (MSVC) e WebView2.

```bash
npm install
npm run tauri dev     # app real (notch, tray, atalho Ctrl+Shift+Espaço)
npm run dev           # abre a galeria no navegador: http://127.0.0.1:1420 (todos os modos com mock)
```

## Checar

```bash
npm run check         # eslint + tsc + vitest
npm run rust:check    # clippy -D warnings + cargo test
```

Os dados do usuário ficam em `%APPDATA%\dev.guidev.ekko\settings.json`.

## Testes de ponta a ponta

Rodam no app real, sem mexer no seu mouse ou teclado: o script conduz a janela pelo DevTools Protocol do WebView2.

```bash
# 1. Suba o app com a porta de depuração aberta
WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS=--remote-debugging-port=9333 npm run tauri dev
# 2. Com a janela de boas-vindas aberta (primeira vez, ou Configurações → Geral → Refazer boas-vindas)
npm run e2e:onboarding
```

`e2e:onboarding` percorre todas as etapas, escolhe a Bolha flutuante (cria uma janela nova) e confere que `onboarded` e o modo foram salvos.

### Release

```bash
npm run tauri build          # gera target/release/bundle/nsis/Ekko_<versão>_x64-setup.exe
npm run e2e:smoke-release    # abre o .exe de release e confere que todas as janelas montaram
```

O teste de fumaça existe porque o build de produção pode quebrar onde o modo dev não quebra: um build disparado de `c:\` minúsculo empacotava o React duas vezes e abria janelas vazias (ver `apps/desktop/vite.config.ts`).

