//! Tiny HTTP abstraction so API code can be tested with canned responses.

use std::collections::VecDeque;
use std::sync::Mutex;
use std::time::Duration;

use serde_json::Value;

use crate::{Error, Result};

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Method {
    Get,
    Post,
    Put,
}

#[derive(Debug, Clone, PartialEq)]
pub struct Request {
    pub method: Method,
    pub url: String,
    pub bearer: Option<String>,
    pub form: Option<Vec<(String, String)>>,
    pub json: Option<Value>,
}

impl Request {
    pub fn new(method: Method, url: impl Into<String>) -> Self {
        Self {
            method,
            url: url.into(),
            bearer: None,
            form: None,
            json: None,
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Response {
    pub status: u16,
    pub body: String,
}

impl Response {
    pub fn ok(&self) -> bool {
        (200..300).contains(&self.status)
    }

    /// Turns a non-2xx response into an error with the API's own message when present.
    pub fn error(&self) -> Error {
        let parsed: Option<Value> = serde_json::from_str(&self.body).ok();
        let message = parsed
            .as_ref()
            .and_then(|v| {
                let e = v.get("error")?;
                e.get("message")
                    .and_then(Value::as_str)
                    .or_else(|| v.get("error_description").and_then(Value::as_str))
                    .or_else(|| e.as_str())
                    .map(str::to_owned)
            })
            .unwrap_or_else(|| "sem detalhes".into());
        Error::Api {
            status: self.status,
            message,
        }
    }
}

pub trait Transport: Send + Sync {
    fn send(&self, req: &Request) -> Result<Response>;
}

/// Real transport (rustls). Blocking: never call it on an async runtime thread.
pub struct ReqwestTransport(reqwest::blocking::Client);

impl ReqwestTransport {
    pub fn new() -> Result<Self> {
        reqwest::blocking::Client::builder()
            .timeout(Duration::from_secs(20))
            .build()
            .map(Self)
            .map_err(|e| Error::Network(e.to_string()))
    }
}

impl Transport for ReqwestTransport {
    fn send(&self, req: &Request) -> Result<Response> {
        let mut builder = match req.method {
            Method::Get => self.0.get(&req.url),
            Method::Post => self.0.post(&req.url),
            Method::Put => self.0.put(&req.url),
        };
        if let Some(token) = &req.bearer {
            builder = builder.bearer_auth(token);
        }
        if let Some(form) = &req.form {
            builder = builder.form(form);
        } else if let Some(json) = &req.json {
            builder = builder.json(json);
        } else if req.method != Method::Get {
            // Spotify rejects bodiless PUT/POST without a length (411).
            builder = builder.header(reqwest::header::CONTENT_LENGTH, "0");
        }
        let res = builder
            .send()
            .map_err(|e| Error::Network(e.without_url().to_string()))?;
        let status = res.status().as_u16();
        let body = res.text().map_err(|e| Error::Network(e.to_string()))?;
        Ok(Response { status, body })
    }
}

/// Test double: replies in order and records every request.
#[derive(Default)]
pub struct FakeTransport {
    replies: Mutex<VecDeque<Response>>,
    pub sent: Mutex<Vec<Request>>,
}

impl FakeTransport {
    pub fn with(replies: &[(u16, &str)]) -> Self {
        let replies = replies
            .iter()
            .map(|(status, body)| Response {
                status: *status,
                body: (*body).to_owned(),
            })
            .collect();
        Self {
            replies: Mutex::new(replies),
            sent: Mutex::default(),
        }
    }

    pub fn requests(&self) -> Vec<Request> {
        self.sent.lock().expect("fake lock").clone()
    }
}

impl Transport for FakeTransport {
    fn send(&self, req: &Request) -> Result<Response> {
        self.sent.lock().expect("fake lock").push(req.clone());
        self.replies
            .lock()
            .expect("fake lock")
            .pop_front()
            .ok_or_else(|| Error::Network("sem resposta falsa".into()))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn error_prefers_api_message() {
        let spotify = Response {
            status: 404,
            body: r#"{"error":{"status":404,"message":"No active device"}}"#.into(),
        };
        assert!(spotify.error().to_string().contains("No active device"));
        let oauth = Response {
            status: 400,
            body: r#"{"error":"invalid_grant","error_description":"Bad code"}"#.into(),
        };
        assert!(oauth.error().to_string().contains("Bad code"));
        let plain = Response {
            status: 500,
            body: "oops".into(),
        };
        assert!(plain.error().to_string().contains("500"));
    }
}
