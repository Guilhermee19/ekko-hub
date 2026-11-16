//! PKCE (RFC 7636, S256) and random `state` values.

use base64::Engine;
use base64::engine::general_purpose::URL_SAFE_NO_PAD;
use sha2::{Digest, Sha256};

use crate::{Error, Result};

/// URL-safe random string from `bytes` of OS entropy (43 chars for 32 bytes).
pub fn random_token(bytes: usize) -> Result<String> {
    let mut buf = vec![0u8; bytes];
    getrandom::fill(&mut buf).map_err(|e| Error::OAuth(format!("sem entropia: {e}")))?;
    Ok(URL_SAFE_NO_PAD.encode(buf))
}

/// A fresh verifier (43..128 chars, RFC 7636 §4.1).
pub fn verifier() -> Result<String> {
    random_token(64)
}

/// `BASE64URL(SHA256(verifier))` without padding.
pub fn challenge(verifier: &str) -> String {
    URL_SAFE_NO_PAD.encode(Sha256::digest(verifier.as_bytes()))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn challenge_matches_rfc_7636_appendix_b() {
        let v = "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk";
        assert_eq!(challenge(v), "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM");
    }

    #[test]
    fn verifier_has_valid_length_and_alphabet() {
        let v = verifier().unwrap();
        assert!((43..=128).contains(&v.len()), "len {}", v.len());
        assert!(
            v.chars()
                .all(|c| c.is_ascii_alphanumeric() || c == '-' || c == '_')
        );
        assert_ne!(v, verifier().unwrap());
    }
}
