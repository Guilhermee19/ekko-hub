# Spec: e-mail no Ekko (Gmail e Outlook/Hotmail)

> **Status:** leitura implementada (branch `feat/email-read`): conectar Gmail e Outlook, página **E-mail** no painel e aviso no notch de e-mail novo, ambos com **Ver** abrindo no navegador. Sem filtro de importância, Apagar nem Etiqueta. O Gmail usa `gmail.readonly` (escopo restrito; ver 4.1) e o Outlook usa `Mail.Read`. A busca é uma lista dos 20 mais recentes a cada minuto, não o `history`/`delta` da seção 3. Decisões em aberto na seção 9.
> **Objetivo:** o Ekko lê a caixa de entrada do Gmail e do Hotmail/Outlook.com, separa os e-mails importantes e avisa no notch quando chega um, com **Ver**, **Apagar** e **Etiqueta**.
> **Fase:** F7 (Integrações), com a parte de IA esperando a F2.

---

## 1. O que o usuário vê

1. Em *Configurações → Conexões*, dois cards novos: **Gmail** e **Outlook (Hotmail)**. Cada um tem um botão **Conectar** que abre o login no navegador, como a Agenda já faz.
2. Chega um e-mail importante. O notch cresce com um aviso do tipo `email`:
   - remetente, assunto e as primeiras linhas;
   - **Ver**: abre o e-mail no navegador (Gmail ou Outlook na web);
   - **Apagar**: manda para a lixeira, com **Desfazer** por 5 s;
   - **Etiqueta**: abre a lista de marcadores do Gmail ou categorias do Outlook, e um clique aplica.
3. Os e-mails que não são importantes não interrompem. Eles só entram na contagem ("12 novos, 2 importantes").
4. Uma página **E-mail** no menu do painel mostra a caixa unificada com duas abas, *Importantes* e *Todos*. Cada linha tem as mesmas ações.
5. Um card **E-mails** no Início mostra os importantes não lidos.
6. O aviso respeita o que já existe: *Não perturbe* segura os avisos, *Esconder em tela cheia* adia, e vários e-mails juntos viram um aviso só ("3 e-mails importantes").

## 2. O que dá para reaproveitar

| Peça | Onde está | Uso aqui |
|---|---|---|
| OAuth Authorization Code + PKCE, loopback | `crates/ekko-integrations/src/oauth.rs`, `pkce.rs`, `loopback.rs` | Login dos dois provedores, sem mudar o fluxo |
| Tokens no Credential Manager | `crates/ekko-integrations/src/tokens.rs` (`Provider`) | Novos `Provider::Gmail` e `Provider::Outlook` |
| Cliente Google embutido no build | `google_calendar::builtin_client()` + secrets do CI | Mesmo cliente, com o escopo de e-mail adicionado (ver 4.1) |
| Poller com thread e "acordar agora" | `src-tauri/src/services/calendar.rs` | Mesmo formato para `services/mail.rs` |
| Avisos do notch com botões | `src/features/alerts/store.ts` (`Alert`, `event` com **Confirmar**) | Novo `kind: 'email'` com as três ações |
| Auditoria | `crates/ekko-core/src/audit.rs` | Toda ação de apagar ou etiquetar fica registrada |
| Card de conexão | `surfaces/settings/sections/ConnectionsOAuth.tsx` | Cards Gmail e Outlook |

O que **não** existe ainda: o crate `ekko-ai` (F2) e o registro de Tools com risco (`ekko-tools`, F4). Por isso o filtro começa por regras (seção 5), e as ações começam como comandos IPC auditados, que viram Tools quando a F4 chegar.

## 3. Arquitetura

```
crates/ekko-integrations/src/mail/
├─ mod.rs        trait MailProvider + tipos comuns (MailSummary, Label, Cursor)
├─ gmail.rs      Gmail API v1
├─ outlook.rs    Microsoft Graph v1.0
└─ importance.rs filtro puro e testado (regras + sinais do provedor)

apps/desktop/src-tauri/src/
├─ services/mail.rs   poller por conta, emite eventos, dispara o aviso
└─ commands/mail.rs   listar, abrir, apagar, desfazer, etiquetar (async)

apps/desktop/src/
├─ lib/ipc/mail*.ts        contrato + mock (galeria funciona sem conta)
├─ features/mail/          página, store, linha de e-mail, seletor de etiqueta
└─ features/alerts/        kind 'email' no AlertCard
```

```rust
pub trait MailProvider {
    /// E-mails novos na caixa de entrada desde o cursor; devolve o cursor novo.
    fn changes(&self, s: &Session, cursor: Option<&Cursor>) -> Result<(Vec<MailSummary>, Cursor)>;
    fn labels(&self, s: &Session) -> Result<Vec<Label>>;
    fn trash(&self, s: &Session, id: &str) -> Result<()>;
    fn untrash(&self, s: &Session, id: &str) -> Result<()>;
    fn set_label(&self, s: &Session, id: &str, label: &str, on: bool) -> Result<()>;
    fn web_link(&self, m: &MailSummary) -> String;
}

pub struct MailSummary {
    pub id: String, pub thread_id: String, pub account: String,
    pub from_name: String, pub from_addr: String, pub subject: String,
    pub snippet: String, pub received_ms: i64, pub unread: bool,
    pub labels: Vec<String>,
    /// Sinais do provedor: Gmail IMPORTANT / CATEGORY_*, Outlook Focused/Other.
    pub provider_hint: ProviderHint,
    pub list_unsubscribe: bool,
}
```

**Como saber que chegou e-mail novo.** As duas APIs têm push (Gmail usa Pub/Sub, o Graph usa webhook), mas o push exige um servidor público na internet. Um app de desktop não tem isso. Então o Ekko faz **polling incremental**, que é barato:

| | Gmail | Outlook / Hotmail |
|---|---|---|
| Cursor | `historyId` (`users.history.list?historyTypes=messageAdded&labelId=INBOX`) | `deltaLink` de `/me/mailFolders/inbox/messages/delta` |
| Primeira carga | `messages.list?labelIds=INBOX&maxResults=50` e guarda o `historyId` | primeira chamada do delta (só cabeçalhos, com `$select`) |
| Cursor perdido | `historyId` velho dá 404: recarrega e não avisa o que já estava lá | o delta expira: recomeça do zero, também sem avisar |
| Intervalo | 60 s (ajustável de 30 s a 5 min); imediato ao voltar do sono | igual |

Só cabeçalhos e snippet são baixados (`format=metadata` no Gmail, `$select=from,subject,bodyPreview,receivedDateTime,isRead,categories,inferenceClassification,webLink` no Graph). O corpo só é buscado em **Ver** dentro do Ekko, se isso entrar mais tarde.

**Estado em disco:** `%APPDATA%\ekko-hub\mail.json` guarda o cursor de cada conta, as regras do filtro e os últimos 200 resumos para a página abrir na hora. Não guarda o corpo nem anexo. Os tokens ficam no Credential Manager, como os de hoje.

## 4. Login e permissões

### 4.1 Gmail: o ponto mais delicado

- O escopo necessário é **`gmail.modify`**, para ler, mandar para a lixeira e mudar marcadores. Ele é um escopo **restrito** do Google ([lista de escopos](https://developers.google.com/gmail/api/auth/scopes)). Não pedir `mail.google.com/`, que permite apagar de vez.
- Um app com escopo restrito, para sair do modo de teste e atender qualquer pessoa, precisa passar pela **verificação de escopo restrito** e por uma **avaliação de segurança (CASA)**, que é paga e se repete todo ano ([guia do Google](https://developers.google.com/identity/protocols/oauth2/production-readiness/restricted-scope-verification)).
- **No modo de teste**, o refresh token expira em **7 dias**: o usuário teria que reconectar toda semana.
- **Caminho para agora (uso pessoal):** um projeto do Google Cloud em *produção, sem verificação*. Ele mostra a tela "app não verificado" no login, aceita até 100 usuários e não tem a expiração de 7 dias. Serve para o Gui e para quem testar. Usar **um cliente separado do da Agenda**: misturar o escopo restrito no cliente embutido atrapalharia a verificação da Agenda, que ainda está pendente no ROADMAP.
- **Alternativa sem OAuth:** IMAP com *senha de app* do Google, que exige verificação em duas etapas. Com IMAP IDLE o e-mail chega na hora e não depende de verificação nenhuma. Os custos são uma senha guardada no Credential Manager e um caminho de código a mais. Fica como plano B se o OAuth travar.

### 4.2 Outlook / Hotmail

- O IMAP com senha comum não funciona mais nas contas pessoais da Microsoft. O caminho é o **Microsoft Graph** com OAuth.
- Registrar um app no **Microsoft Entra** (gratuito): tipo "contas pessoais da Microsoft", cliente público, redirect `http://localhost` (aceita qualquer porta) e PKCE, sem segredo. Isso encaixa direto no `OAuthClient` atual com `client_secret: None`, como o Spotify.
- Autoridade `https://login.microsoftonline.com/consumers/oauth2/v2.0/{authorize,token}`.
- Escopos: `Mail.ReadWrite offline_access User.Read`. `Mail.ReadWrite` permite mover para *Itens Excluídos* e mudar categorias.
- O delta de mensagens funciona para contas pessoais ([doc](https://learn.microsoft.com/en-us/graph/api/message-delta)). O `mailboxItem/delta` não funciona e não deve ser usado.
- O client id vai embutido no build (`EKKO_MS_CLIENT_ID`), do mesmo jeito que o Google.

### 4.3 Mais de uma conta

O modelo aceita N contas (por exemplo, dois Gmails). O `Provider` passa a ter um id de conta: `gmail:<email>`, `outlook:<email>`. A v1 pode limitar a uma conta por provedor e já gravar no formato novo.

## 5. "Importante": o filtro

Em camadas, da mais barata para a mais cara. Cada e-mail recebe uma nota de 0 a 100 e um **motivo** curto, que aparece no aviso ("de um VIP", "marcado como importante pelo Gmail"). Avisa quem passar do limite (padrão 60).

| Camada | Sinal | Efeito |
|---|---|---|
| 1. Regras do usuário | **VIPs** (endereço ou domínio), palavras no assunto ("fatura", "urgente", "entrevista") | VIP = 100. Palavra soma pontos |
| 2. Silenciar | Remetentes ou domínios silenciados; `List-Unsubscribe` (newsletter); Gmail `CATEGORY_PROMOTIONS/SOCIAL/FORUMS`; Outlook `inferenceClassification = other` | Zera ou derruba a nota |
| 3. Sinal do provedor | Gmail `IMPORTANT`; Outlook *Focused*; resposta a uma conversa sua | Soma pontos |
| 4. Aprendizado | Remetente que você abre ou etiqueta sobe; o que você apaga sem ler desce | Ajuste por remetente, guardado em `mail.json` |
| 5. IA (depois da F2) | Modelo classifica remetente, assunto e snippet → `{importante, motivo}` | Só para o que as regras deixaram em dúvida (nota entre 30 e 70) |

- As camadas 1 a 4 são uma função pura (`importance.rs`), testável com e-mails de exemplo e sem rede.
- Sobre a camada 5 e a privacidade: o conteúdo do e-mail só sai do PC se o usuário escolher um Cérebro na nuvem, e mesmo assim só remetente, assunto e snippet. O modo *No meu PC* (Ollama) é o recomendado para isso. A tela de Privacidade mostra o que foi enviado.

## 6. Ações e risco

| Ação | Gmail | Outlook | Risco | Comportamento |
|---|---|---|---|---|
| Ver | abre `https://mail.google.com/mail/u/<email>/#all/<threadId>` | abre o `webLink` da mensagem | Safe | Marca como visto no Ekko, não como lido no servidor |
| Apagar | `messages.trash` (fica 30 dias na lixeira) | `move` para `deleteditems` | Confirm | Sem pergunta no aviso, porque o **Desfazer** de 5 s chama `untrash` ou move de volta. Auditado |
| Etiqueta | `messages.modify` com `addLabelIds` | `PATCH categories` | Safe | Lista vem de `labels.list` / `outlook/masterCategories`. Auditado |
| Marcar como lido | `removeLabelIds: UNREAD` | `PATCH isRead` | Safe | Opcional, no menu "…" |

Apagar de vez fica **fora** do escopo, de propósito.

## 7. Configurações (tela nova *E-mail*)

- Contas conectadas e o intervalo de checagem.
- **Avisar:** só importantes (padrão), todos ou nenhum.
- VIPs, palavras importantes e remetentes silenciados, com adicionar e remover. O aviso tem um atalho "Silenciar este remetente".
- Limite de importância como deslizador simples: *Menos avisos ↔ Mais avisos*.
- Som do aviso (usa o de Notificações).

## 8. Fatias de entrega

Cada fatia sobe sozinha, com testes, e já dá para usar.

1. **Outlook somente leitura.** Conectar, primeira carga, página E-mail com a lista e Ver. É o caminho sem bloqueio de verificação e valida o trait e o poller.
2. **Gmail somente leitura.** Cliente próprio, `history.list` e a mesma página.
3. **Aviso no notch.** `kind: 'email'`, agrupamento, Não perturbe e tela cheia.
4. **Apagar e Etiqueta.** Com Desfazer, seletor de etiqueta e auditoria.
5. **Filtro por regras.** VIPs, palavras, silenciar e aprendizado, com a aba Importantes e o card no Início.
6. **Filtro com IA.** Depois da F2.
7. **Tools para o agente.** Depois da F4: `mail.search`, `mail.read`, `mail.trash` e `mail.label`, para pedir "apaga as promoções de hoje" por voz ou texto.

Estimativa grossa: fatias 1 a 5 levam de 1,5 a 2 semanas de trabalho focado. O maior risco de prazo é o Gmail (4.1), não o código.

## 9. Decisões em aberto

1. **Gmail:** OAuth com cliente próprio não verificado (tela de aviso, até 100 pessoas) ou IMAP com senha de app? A recomendação é OAuth agora e verificação só se o Ekko for distribuído para mais gente.
2. **Quantas contas na v1:** uma por provedor, ou várias desde o início?
3. **"Ver":** abrir no navegador (simples) ou mostrar o e-mail dentro do Ekko (exige baixar e sanitizar o HTML)? A recomendação é o navegador na v1.
4. **Apagar no aviso:** direto com Desfazer (recomendado) ou com confirmação?
5. **Prioridade:** isso entra antes da F2 (só com regras) ou espera a IA?

## 10. Testes

- `importance.rs`: tabela de casos (VIP, newsletter, promoção, palavra-chave, remetente aprendido).
- `gmail.rs` e `outlook.rs`: parse de respostas reais anonimizadas, cursor expirado (404 / `syncStateNotFound`) e paginação, com o `Transport` falso que já existe em `http.rs`.
- Poller: não avisa na primeira carga, não avisa duas vezes o mesmo id e agrupa uma rajada.
- Frontend: `AlertCard` do e-mail na galeria com mock; Desfazer volta o item para a lista.
