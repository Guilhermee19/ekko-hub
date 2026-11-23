# ADR 0002: Build para macOS

**Data:** 23/11/2026 · **Status:** aceito

## Contexto
O Ekko nasceu só para Windows, mas o núcleo já separa o código de sistema com `#[cfg(windows)]` e devolve vazio ou `Unsupported` nos outros sistemas. Faltava a casca Tauri compilar no Mac e o release gerar o instalador.

## Decisão
- O release (`.github/workflows/release.yml`) ganha o job `macos-dmg`, que roda depois do Windows num runner `macos-latest` e anexa um `.dmg` **universal** (Apple Silicon + Intel) ao mesmo release.
- `tauri.macos.conf.json` troca o bundle para `app` + `dmg`, usa `icon.icns` e assina **ad hoc** (`signingIdentity: "-"`). Sem conta de desenvolvedor Apple, não há notarização.
- As janelas transparentes exigem a feature `macos-private-api` do Tauri e `macOSPrivateApi: true`. Isso tira o app da Mac App Store, que não é um canal nosso.
- Segredos vão para o Keychain (`keyring` com `apple-native`), mantendo a regra de nunca gravar segredo em JSON.
- O que depende de HWND (arrastar da prateleira, reafirmar "sempre no topo") passa por `display::windows::native_handle` e responde "só no Windows" nos outros sistemas.
- Abrir arquivo, mostrar no Finder e abrir link usam `open`/`open -R`. A atualização em um clique continua só no Windows; no Mac, o botão abre a página do release.

## Consequências
- No Mac, os recursos de `ekko-os` (mídia, volume, bateria, print, limpeza, periféricos) ficam vazios até ganharem uma implementação própria.
- Na primeira abertura, o macOS pede confirmação em Privacidade e Segurança. Notarizar exige a conta paga da Apple e segredos no CI.
- Dá para conferir a compilação do Mac no Windows com `cargo clippy --target aarch64-apple-darwin`, mas os crates com C (`objc2`, `aws-lc-sys`) precisam de um compilador da Apple. A garantia real é o job `cargo test` no runner macOS do release.
