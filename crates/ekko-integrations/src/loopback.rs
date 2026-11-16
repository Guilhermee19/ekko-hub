//! Loopback redirect (RFC 8252 §7.3): a one-shot HTTP listener on 127.0.0.1.

use std::io::{ErrorKind, Read, Write};
use std::net::{TcpListener, TcpStream};
use std::time::{Duration, Instant};

use url::Url;

use crate::{Error, Result};

pub const CALLBACK_PATH: &str = "/callback";

const DONE_PAGE: &str = "<!doctype html><html lang=\"pt-BR\"><meta charset=\"utf-8\">\
<title>Ekko</title><body style=\"font-family:system-ui;background:#0b0d12;color:#e8eaf0;\
display:grid;place-items:center;height:100vh;margin:0\"><div style=\"text-align:center\">\
<h1 style=\"font-size:20px\">Pronto! Conta conectada ao Ekko.</h1>\
<p style=\"opacity:.7\">Pode fechar esta aba.</p></div></body></html>";

const FAIL_PAGE: &str = "<!doctype html><html lang=\"pt-BR\"><meta charset=\"utf-8\">\
<title>Ekko</title><body style=\"font-family:system-ui;background:#0b0d12;color:#e8eaf0;\
display:grid;place-items:center;height:100vh;margin:0\"><div style=\"text-align:center\">\
<h1 style=\"font-size:20px\">Não deu para conectar.</h1>\
<p style=\"opacity:.7\">Volte ao Ekko para ver o motivo. Pode fechar esta aba.</p></div></body></html>";

pub struct Loopback {
    listener: TcpListener,
    port: u16,
}

impl Loopback {
    /// `port = 0` picks an ephemeral port (Google); Spotify needs its registered one.
    pub fn bind(port: u16) -> Result<Self> {
        let listener = TcpListener::bind(("127.0.0.1", port)).map_err(|e| {
            if e.kind() == ErrorKind::AddrInUse {
                Error::OAuth(format!(
                    "a porta {port} está em uso (outra conexão aberta?)"
                ))
            } else {
                Error::Io(e)
            }
        })?;
        let port = listener.local_addr()?.port();
        listener.set_nonblocking(true)?;
        Ok(Self { listener, port })
    }

    pub fn redirect_uri(&self) -> String {
        format!("http://127.0.0.1:{}{CALLBACK_PATH}", self.port)
    }

    /// Waits for the browser to hit the callback and returns the auth `code`.
    /// Stray requests (favicon…) get a 404 and are ignored.
    pub fn wait(&self, expected_state: &str, timeout: Duration) -> Result<String> {
        let deadline = Instant::now() + timeout;
        loop {
            match self.listener.accept() {
                Ok((stream, _)) => {
                    if let Some(result) = handle(stream, expected_state) {
                        return result;
                    }
                }
                Err(e) if e.kind() == ErrorKind::WouldBlock => {
                    if Instant::now() >= deadline {
                        return Err(Error::Timeout);
                    }
                    std::thread::sleep(Duration::from_millis(100));
                }
                Err(e) => return Err(Error::Io(e)),
            }
        }
    }
}

fn handle(mut stream: TcpStream, expected_state: &str) -> Option<Result<String>> {
    let _ = stream.set_nonblocking(false);
    let _ = stream.set_read_timeout(Some(Duration::from_secs(5)));
    let target = read_request_target(&mut stream)?;
    let Some(outcome) = parse_callback(&target, expected_state) else {
        respond(&mut stream, "404 Not Found", "");
        return None;
    };
    let page = if outcome.is_ok() {
        DONE_PAGE
    } else {
        FAIL_PAGE
    };
    respond(&mut stream, "200 OK", page);
    Some(outcome)
}

/// Reads the request head and returns the target of `GET <target> HTTP/1.1`.
fn read_request_target(stream: &mut TcpStream) -> Option<String> {
    let mut buf = Vec::with_capacity(1024);
    let mut chunk = [0u8; 1024];
    while !buf.windows(4).any(|w| w == b"\r\n\r\n") && buf.len() < 16 * 1024 {
        match stream.read(&mut chunk) {
            Ok(0) | Err(_) => break,
            Ok(n) => buf.extend_from_slice(&chunk[..n]),
        }
    }
    let head = String::from_utf8_lossy(&buf);
    let mut parts = head.lines().next()?.split_whitespace();
    let target = match (parts.next(), parts.next()) {
        (Some("GET"), Some(target)) => target.to_owned(),
        _ => {
            respond(stream, "405 Method Not Allowed", "");
            return None;
        }
    };
    Some(target)
}

fn respond(stream: &mut TcpStream, status: &str, body: &str) {
    let reply = format!(
        "HTTP/1.1 {status}\r\nContent-Type: text/html; charset=utf-8\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{body}",
        body.len()
    );
    let _ = stream.write_all(reply.as_bytes());
    let _ = stream.flush();
}

/// `None` = not our callback (keep waiting). Otherwise the code or why it failed.
pub fn parse_callback(target: &str, expected_state: &str) -> Option<Result<String>> {
    let url = Url::parse(&format!("http://127.0.0.1{target}")).ok()?;
    if url.path() != CALLBACK_PATH {
        return None;
    }
    let get = |key: &str| {
        url.query_pairs()
            .find(|(k, _)| k == key)
            .map(|(_, v)| v.into_owned())
    };
    if let Some(error) = get("error") {
        let reason = if error == "access_denied" {
            "acesso negado no navegador".into()
        } else {
            error
        };
        return Some(Err(Error::OAuth(reason)));
    }
    if get("state").as_deref() != Some(expected_state) {
        return Some(Err(Error::OAuth(
            "state inválido (possível ataque CSRF)".into(),
        )));
    }
    Some(get("code").ok_or_else(|| Error::OAuth("o navegador não devolveu o código".into())))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_code_and_checks_state() {
        let ok = parse_callback("/callback?code=abc%2F1&state=xyz", "xyz").unwrap();
        assert_eq!(ok.unwrap(), "abc/1");
        let bad = parse_callback("/callback?code=abc&state=nope", "xyz").unwrap();
        assert!(bad.unwrap_err().to_string().contains("state"));
        let denied = parse_callback("/callback?error=access_denied&state=xyz", "xyz").unwrap();
        assert!(denied.unwrap_err().to_string().contains("negado"));
        assert!(parse_callback("/favicon.ico", "xyz").is_none());
    }

    #[test]
    fn serves_one_callback_over_tcp() {
        let lb = Loopback::bind(0).unwrap();
        let uri = lb.redirect_uri();
        assert!(uri.starts_with("http://127.0.0.1:") && uri.ends_with("/callback"));
        let addr = uri
            .trim_start_matches("http://")
            .trim_end_matches("/callback")
            .to_owned();
        let client = std::thread::spawn(move || {
            let get = |path: &str| {
                let mut s = TcpStream::connect(&addr).unwrap();
                write!(s, "GET {path} HTTP/1.1\r\nHost: x\r\n\r\n").unwrap();
                let mut out = String::new();
                let _ = s.read_to_string(&mut out);
                out
            };
            let stray = get("/favicon.ico");
            let page = get("/callback?code=C&state=S");
            (stray, page)
        });
        let code = lb.wait("S", Duration::from_secs(5)).unwrap();
        assert_eq!(code, "C");
        let (stray, page) = client.join().unwrap();
        assert!(stray.starts_with("HTTP/1.1 404"));
        assert!(page.contains("Pode fechar esta aba"));
    }

    #[test]
    fn times_out_without_a_browser() {
        let lb = Loopback::bind(0).unwrap();
        let err = lb.wait("S", Duration::from_millis(150)).unwrap_err();
        assert!(matches!(err, Error::Timeout));
    }
}
