use super::*;

fn track(title: &str) -> NowPlaying {
    NowPlaying {
        title: title.to_owned(),
        artist: "Arctic Monkeys".to_owned(),
        album: "AM".to_owned(),
        app_id: "Spotify.exe".to_owned(),
        source: "Spotify".to_owned(),
        playing: true,
        position_ms: 10_000,
        duration_ms: 272_000,
        can_seek: true,
        thumbnail: None,
    }
}

#[test]
fn appearing_and_disappearing_are_changes() {
    let a = track("Do I Wanna Know?");
    assert!(changed(None, Some(&a), 0));
    assert!(changed(Some(&a), None, 0));
    assert!(!changed(None, None, 0));
}

#[test]
fn track_and_state_changes_are_detected() {
    let a = track("Do I Wanna Know?");
    assert!(changed(Some(&a), Some(&track("R U Mine?")), 1_000));
    let paused = NowPlaying {
        playing: false,
        ..a.clone()
    };
    assert!(changed(Some(&a), Some(&paused), 1_000));
    let art = NowPlaying {
        thumbnail: Some("data:x".into()),
        ..a.clone()
    };
    assert!(changed(Some(&a), Some(&art), 1_000));
}

#[test]
fn position_only_counts_when_it_jumps() {
    let a = track("Do I Wanna Know?");
    // Playing: 5 s later the position moved ~5 s, as the UI clock expects.
    let later = NowPlaying {
        position_ms: 15_300,
        ..a.clone()
    };
    assert!(!changed(Some(&a), Some(&later), 5_000));
    // A seek forward.
    let seeked = NowPlaying {
        position_ms: 120_000,
        ..a.clone()
    };
    assert!(changed(Some(&a), Some(&seeked), 5_000));
    // Paused: the position must stay put.
    let paused = NowPlaying {
        playing: false,
        ..a.clone()
    };
    let moved = NowPlaying {
        position_ms: 14_000,
        ..paused.clone()
    };
    assert!(changed(Some(&paused), Some(&moved), 5_000));
    assert!(!changed(Some(&paused), Some(&paused.clone()), 5_000));
}

#[test]
fn extrapolation_is_clamped_to_the_duration() {
    assert_eq!(extrapolate(1_000, 500, true, 10_000), 1_500);
    assert_eq!(extrapolate(1_000, 500, false, 10_000), 1_000);
    assert_eq!(extrapolate(9_800, 5_000, true, 10_000), 10_000);
    assert_eq!(extrapolate(9_800, 5_000, true, 0), 14_800);
}

#[test]
fn friendly_names() {
    let cases = [
        ("Spotify.exe", "Spotify"),
        ("SpotifyAB.SpotifyMusic_zpdnekdrzrea0!Spotify", "Spotify"),
        ("chrome", "Chrome"),
        ("Chrome", "Chrome"),
        ("MSEdge", "Edge"),
        ("msedge.exe", "Edge"),
        ("firefox.exe", "Firefox"),
        ("308046B0AF4A39CB", "Firefox"),
        (
            "Chrome._crx_cinhimbnkkaeohfgghhklpknlkffjgod",
            "YouTube Music",
        ),
        (
            "Microsoft.ZuneMusic_8wekyb3d8bbwe!Microsoft.ZuneMusic",
            "Media Player",
        ),
        ("Arc.exe", "Arc"),
        ("C:\\Tools\\coolplayer.exe", "Coolplayer"),
        ("Contoso.Player_abc!App", "App"),
    ];
    for (id, name) in cases {
        assert_eq!(friendly_app_name(id), name, "{id}");
    }
    // "arc" must not match inside other words.
    assert_eq!(friendly_app_name("research.exe"), "Research");
}

#[test]
fn data_url_sniffs_the_mime() {
    let jpeg = [0xFF, 0xD8, 0xFF, 0xE0, 1, 2];
    assert!(
        data_url(&jpeg, "")
            .unwrap()
            .starts_with("data:image/jpeg;base64,")
    );
    let png = [0x89, b'P', b'N', b'G', 0, 0];
    assert!(
        data_url(&png, "image/jpeg")
            .unwrap()
            .starts_with("data:image/png;")
    );
    assert!(
        data_url(&[1, 2, 3], "image/webp")
            .unwrap()
            .starts_with("data:image/webp;")
    );
    assert!(data_url(&[], "image/png").is_none());
    assert!(data_url(&vec![0; thumb::MAX_THUMB_BYTES + 1], "").is_none());
}

#[test]
fn thumbnails_load_once_per_track() {
    let mut cache = ThumbCache::default();
    let mut loads = 0;
    for _ in 0..3 {
        cache.get_or_load("a", || {
            loads += 1;
            Some("art-a".into())
        });
    }
    assert_eq!(loads, 1);
}

#[test]
fn stale_or_missing_art_is_retried_a_few_times() {
    let mut cache = ThumbCache::default();
    cache.get_or_load("a", || Some("art-a".into()));
    // Right after the change the player still serves the old art.
    let mut loads = 0;
    for _ in 0..5 {
        cache.get_or_load("b", || {
            loads += 1;
            Some("art-a".into())
        });
    }
    assert_eq!(loads, 3);
    // Missing art is retried, then a late arrival is picked up.
    let mut cache = ThumbCache::default();
    assert_eq!(cache.get_or_load("c", || None), None);
    assert_eq!(
        cache.get_or_load("c", || Some("art-c".into())),
        Some("art-c".into())
    );
    assert_eq!(cache.get_or_load("c", || None), Some("art-c".into()));
}

#[test]
fn serializes_camel_case() {
    let json = serde_json::to_value(track("x")).unwrap();
    assert_eq!(json["appId"], "Spotify.exe");
    assert_eq!(json["positionMs"], 10_000);
    assert!(json["thumbnail"].is_null());
}
