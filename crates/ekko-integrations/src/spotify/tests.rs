use super::*;
use crate::Provider;
use crate::session::tests::session;

const PLAYER: &str = r#"{"is_playing":true,"progress_ms":1200,"shuffle_state":false,
  "repeat_state":"context",
  "device":{"id":"d1","name":"PC","type":"Computer","is_active":true,"volume_percent":70},
  "item":{"id":"t1","name":"Song","duration_ms":200000,"artists":[{"name":"A"},{"name":"B"}],
    "album":{"name":"Al","images":[{"url":"https://img/big"},{"url":"https://img/small"}]}}}"#;

#[test]
fn parses_the_player() {
    let p = parse_playback(&serde_json::from_str(PLAYER).unwrap());
    assert!(p.playing);
    assert_eq!(p.repeat, "context");
    let t = p.track.unwrap();
    assert_eq!(t.artist, "A, B");
    assert_eq!(t.cover_url.as_deref(), Some("https://img/big"));
    assert_eq!(p.device.unwrap().kind, "computer");
}

#[test]
fn nothing_playing_is_none() {
    let (s, _) = session(Provider::Spotify, &[(204, "")], i64::MAX);
    assert!(playback(&s).unwrap().is_none());
}

#[test]
fn devices_without_id_are_skipped() {
    let body = r#"{"devices":[{"id":null,"name":"Restrito","type":"TV"},
        {"id":"d2","name":"Celular","type":"Smartphone","is_active":false}]}"#;
    let (s, _) = session(Provider::Spotify, &[(200, body)], i64::MAX);
    let list = devices(&s).unwrap();
    assert_eq!(list.len(), 1);
    assert_eq!(list[0].kind, "smartphone");
}

#[test]
fn transfer_and_controls_hit_the_right_endpoints() {
    let (s, http) = session(
        Provider::Spotify,
        &[(204, ""), (204, ""), (204, "")],
        i64::MAX,
    );
    transfer(&s, "d2", true).unwrap();
    control(&s, Control::Next).unwrap();
    control(&s, Control::Pause).unwrap();
    let sent = http.requests();
    assert_eq!(sent[0].method, Method::Put);
    assert_eq!(sent[0].json.as_ref().unwrap()["device_ids"][0], "d2");
    assert!(sent[1].url.ends_with("/me/player/next"));
    assert_eq!(sent[1].method, Method::Post);
    assert!(sent[2].url.ends_with("/me/player/pause"));
    assert_eq!(sent[2].method, Method::Put);
}

#[test]
fn queue_includes_current_and_upcoming() {
    let body = r#"{"currently_playing":{"id":"t1","name":"Now"},
        "queue":[{"id":"t2","name":"Next","show":{"name":"Pod"}}]}"#;
    let (s, _) = session(Provider::Spotify, &[(200, body)], i64::MAX);
    let q = queue(&s).unwrap();
    assert_eq!(q.current.unwrap().title, "Now");
    assert_eq!(q.queue[0].artist, "Pod");
}

#[test]
fn player_settings_hit_the_right_endpoints() {
    let (s, http) = session(
        Provider::Spotify,
        &[(204, ""), (204, ""), (204, ""), (204, "")],
        i64::MAX,
    );
    set_shuffle(&s, true).unwrap();
    set_repeat(&s, Repeat::Track).unwrap();
    seek(&s, 61_500).unwrap();
    set_volume(&s, 250).unwrap();
    let sent = http.requests();
    assert!(
        sent.iter()
            .all(|r| r.method == Method::Put && r.json.is_none())
    );
    assert!(sent[0].url.ends_with("/me/player/shuffle?state=true"));
    assert!(sent[1].url.ends_with("/me/player/repeat?state=track"));
    assert!(sent[2].url.ends_with("/me/player/seek?position_ms=61500"));
    // Out-of-range volume is clamped before it reaches the API.
    assert!(
        sent[3]
            .url
            .ends_with("/me/player/volume?volume_percent=100")
    );
}

#[test]
fn repeat_parses_from_the_ui_strings() {
    let mode: Repeat = serde_json::from_str("\"context\"").unwrap();
    assert_eq!(mode, Repeat::Context);
}
