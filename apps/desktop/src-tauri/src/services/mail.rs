//! E-mail poller (read-only): every minute, the latest inbox messages of the connected
//! Gmail and Outlook accounts. Broadcasts the merged list and, separately, the ones
//! that just arrived, so the notch can announce them.

use std::collections::HashMap;
use std::sync::Mutex;
use std::sync::mpsc::{self, RecvTimeoutError, Sender};
use std::thread;
use std::time::Duration;

use ekko_integrations::mail::{self, Inbox, MailMessage, gmail, outlook};
use ekko_integrations::{Error, Provider, tokens};
use tauri::{AppHandle, Emitter, Manager};

use super::integrations::{Integrations, session};

/// `MailMessage[]` (camelCase), newest first, whenever the list changes.
pub const MAIL_CHANGED: &str = "ekko://mail/changed";
/// `MailMessage[]`: unread messages that just arrived (promotions left out).
pub const MAIL_NEW: &str = "ekko://mail/new";
const EVERY: Duration = Duration::from_secs(60);
const PROVIDERS: [Provider; 2] = [Provider::Gmail, Provider::Outlook];

/// What one account shows now, and which ids it has already seen.
#[derive(Default)]
struct Account {
    messages: Vec<MailMessage>,
    inbox: Inbox,
}

pub struct Mail {
    accounts: Mutex<HashMap<Provider, Account>>,
    wake: Mutex<Sender<()>>,
}

impl Mail {
    /// Every account merged, newest first.
    pub fn messages(&self) -> Vec<MailMessage> {
        let accounts = self.accounts.lock().expect("mail lock");
        merged(&accounts)
    }
}

fn merged(accounts: &HashMap<Provider, Account>) -> Vec<MailMessage> {
    let mut all: Vec<MailMessage> = accounts
        .values()
        .flat_map(|a| a.messages.iter().cloned())
        .collect();
    all.sort_by_key(|m| std::cmp::Reverse(m.received_ms));
    all
}

pub fn spawn(app: &AppHandle) {
    let (tx, rx) = mpsc::channel();
    app.manage(Mail {
        accounts: Mutex::new(HashMap::new()),
        wake: Mutex::new(tx),
    });
    let app = app.clone();
    thread::spawn(move || {
        loop {
            for provider in PROVIDERS {
                if let Err(err) = refresh(&app, provider) {
                    eprintln!("[ekko] e-mail ({}): {err}", provider.label());
                }
            }
            match rx.recv_timeout(EVERY) {
                Ok(()) | Err(RecvTimeoutError::Timeout) => {}
                Err(RecvTimeoutError::Disconnected) => return,
            }
        }
    });
}

/// Asks the poller to look now (after connecting, or the page's refresh button).
pub fn request_refresh(app: &AppHandle) {
    let _ = app.state::<Mail>().wake.lock().expect("wake lock").send(());
}

/// Fetches one account (blocking). Not connected = nothing listed; a network error
/// keeps the last good list.
fn refresh(app: &AppHandle, provider: Provider) -> Result<(), Error> {
    let Some(saved) = tokens::load(app.state::<Integrations>().store(), provider)? else {
        forget(app, provider);
        return Ok(());
    };
    let account = saved.account.unwrap_or_default();
    let s = session(app, provider)?;
    let fresh = match provider {
        Provider::Gmail => {
            let cache: HashMap<String, MailMessage> = app
                .state::<Mail>()
                .accounts
                .lock()
                .expect("mail lock")
                .get(&provider)
                .map(|a| {
                    a.messages
                        .iter()
                        .map(|m| (m.id.clone(), m.clone()))
                        .collect()
                })
                .unwrap_or_default();
            gmail::recent(&s, &account, mail::RECENT, &cache)?
        }
        _ => outlook::recent(&s, &account, mail::RECENT)?,
    };
    let (changed, arrivals, all) = {
        let state = app.state::<Mail>();
        let mut accounts = state.accounts.lock().expect("mail lock");
        let entry = accounts.entry(provider).or_default();
        let arrivals = entry.inbox.arrivals(&fresh);
        let changed = entry.messages != fresh;
        entry.messages = fresh;
        (changed, arrivals, merged(&accounts))
    };
    if changed {
        let _ = app.emit(MAIL_CHANGED, &all);
    }
    if !arrivals.is_empty() {
        let _ = app.emit(MAIL_NEW, &arrivals);
    }
    Ok(())
}

/// Disconnected: the account leaves the list and starts over if connected again.
pub fn forget(app: &AppHandle, provider: Provider) {
    let state = app.state::<Mail>();
    let mut accounts = state.accounts.lock().expect("mail lock");
    if accounts
        .remove(&provider)
        .is_some_and(|a| !a.messages.is_empty())
    {
        let _ = app.emit(MAIL_CHANGED, merged(&accounts));
    }
}
