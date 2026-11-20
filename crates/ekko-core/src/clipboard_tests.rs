use super::*;

#[test]
fn classifies_links_code_and_text() {
    assert_eq!(classify("https://github.com/tauri-apps"), ClipKind::Link);
    assert_eq!(classify("  www.exemplo.com.br "), ClipKind::Link);
    assert_eq!(classify("veja https://a.com"), ClipKind::Text);
    assert_eq!(
        classify("const total = items.reduce((acc, i) => acc + i, 0)"),
        ClipKind::Code
    );
    assert_eq!(classify("npm run check && cargo test"), ClipKind::Code);
    assert_eq!(classify("if x {\n  y()\n}"), ClipKind::Code);
    assert_eq!(
        classify("Reunião na quinta às 15h, sala 2."),
        ClipKind::Text
    );
}

#[test]
fn records_newest_first_and_skips_blank_or_huge() {
    let mut c = Clipboard::default();
    assert!(c.record("um", "Notepad", 1));
    assert!(c.record("dois", "Chrome", 2));
    assert!(!c.record("   \n", "Chrome", 3));
    assert!(!c.record(&"x".repeat(MAX_CHARS + 1), "Chrome", 4));
    let contents: Vec<_> = c.clips.iter().map(|c| c.content.as_str()).collect();
    assert_eq!(contents, ["dois", "um"]);
    assert_eq!(c.clips[0].source, "Chrome");
}

#[test]
fn copying_again_moves_to_top_and_keeps_source_and_pin() {
    let mut c = Clipboard::default();
    c.record("a", "Word", 1);
    c.record("b", "Chrome", 2);
    let id = c.clips[1].id.clone();
    c.toggle_pin(&id);
    assert!(c.record("a", "Ekko", 3));
    assert_eq!(c.clips.len(), 2);
    assert_eq!(c.clips[0].id, id);
    assert_eq!(c.clips[0].source, "Word");
    assert_eq!(c.clips[0].at, 3);
    assert!(c.clips[0].pinned);
}

#[test]
fn paused_records_nothing() {
    let mut c = Clipboard::default();
    assert!(c.set_paused(true));
    assert!(!c.set_paused(true));
    assert!(!c.record("segredo", "App", 1));
    assert!(c.clips.is_empty());
}

#[test]
fn keeps_pinned_beyond_the_cap() {
    let mut c = Clipboard::default();
    c.record("fixo", "App", 0);
    let id = c.clips[0].id.clone();
    c.toggle_pin(&id);
    for i in 1..=(DEFAULT_LIMIT as u64 + 5) {
        c.record(&format!("item {i}"), "App", i);
    }
    assert_eq!(c.clips.len(), DEFAULT_LIMIT + 1);
    assert!(c.clips.iter().any(|c| c.id == id));
    assert!(!c.clips.iter().any(|c| c.content == "item 1"));
}

#[test]
fn clear_keeps_pinned_and_remove_by_id() {
    let mut c = Clipboard::default();
    c.record("a", "App", 1);
    c.record("b", "App", 2);
    let pinned = c.clips[0].id.clone();
    c.toggle_pin(&pinned);
    assert!(c.clear_unpinned());
    assert_eq!(c.clips.len(), 1);
    assert!(c.remove(&pinned));
    assert!(!c.remove(&pinned));
}

#[test]
fn snippets_create_update_and_refuse_blank() {
    let mut c = Clipboard::default();
    let input = |id: Option<String>, name: &str, content: &str| SnippetInput {
        id,
        name: name.into(),
        shortcut: " ;ass ".into(),
        content: content.into(),
    };
    assert!(!c.save_snippet(input(None, "  ", "x"), 1));
    assert!(c.save_snippet(input(None, "Assinatura", "Abraço"), 1));
    let id = c.snippets[0].id.clone();
    assert_eq!(c.snippets[0].shortcut, ";ass");
    assert!(c.save_snippet(input(Some(id.clone()), "Assinatura 2", "Até"), 2));
    assert_eq!(c.snippets.len(), 1);
    assert_eq!(c.snippets[0].content, "Até");
    assert!(c.remove_snippet(&id));
}

#[test]
fn json_is_camel_case_and_tolerates_missing_fields() {
    let mut c = Clipboard::default();
    c.record("https://a.com", "Edge", 7);
    let json = serde_json::to_value(&c).unwrap();
    assert_eq!(json["clips"][0]["kind"], "link");
    assert_eq!(json["clips"][0]["at"], 7);
    let back: Clipboard = serde_json::from_str(r#"{"clips":[]}"#).unwrap();
    assert!(!back.paused && back.snippets.is_empty());
}

#[test]
fn images_and_files_are_recorded_and_deduplicated() {
    let mut c = Clipboard::default();
    let image = || Copied::Image {
        path: r"C:\ekko\clipboard\img-1.png".into(),
        width: 1280,
        height: 720,
    };
    assert!(c.record_copy(image(), "Chrome", 1));
    assert_eq!(c.clips[0].kind, ClipKind::Image);
    assert_eq!(c.clips[0].content, "Imagem 1280×720");
    let files = || Copied::Files(vec![r"C:\docs\relatorio.pdf".into(), r"C:\fotos\".into()]);
    assert!(c.record_copy(files(), "Explorador de Arquivos", 2));
    assert_eq!(c.clips[0].kind, ClipKind::Files);
    assert_eq!(c.clips[0].content, "relatorio.pdf, fotos");
    // The same image again moves up instead of duplicating.
    assert!(c.record_copy(image(), "Paint", 3));
    assert_eq!(c.clips.len(), 2);
    assert_eq!(
        (c.clips[0].kind, c.clips[0].source.as_str()),
        (ClipKind::Image, "Chrome")
    );
    assert_eq!(
        c.images().collect::<Vec<_>>(),
        [r"C:\ekko\clipboard\img-1.png"]
    );
    assert!(!c.record_copy(Copied::Files(vec![]), "App", 4));
    // A text equal to an image's description is a different clip.
    assert!(c.record("Imagem 1280×720", "Notepad", 5));
    assert_eq!(c.clips.len(), 3);
}

#[test]
fn limit_snaps_to_the_options_and_trims_at_once() {
    let mut c = Clipboard::default();
    assert_eq!(c.limit, DEFAULT_LIMIT);
    for i in 0..40 {
        c.record(&format!("item {i}"), "App", i);
    }
    assert!(c.set_limit(20));
    assert_eq!((c.limit, c.clips.len()), (20, 20));
    assert_eq!(c.clips[0].content, "item 39");
    assert!(c.set_limit(90));
    assert_eq!(c.limit, 100);
    assert!(!c.set_limit(100));
    // Files saved before the limit existed get the default.
    let old: Clipboard = serde_json::from_str(r#"{"paused":false,"clips":[]}"#).unwrap();
    assert_eq!(old.limit, DEFAULT_LIMIT);
}

#[test]
fn touch_moves_a_clip_up_and_hash_is_stable() {
    let mut c = Clipboard::default();
    c.record("a", "App", 1);
    c.record("b", "App", 2);
    let id = c.clips[1].id.clone();
    assert!(c.touch(&id, 3));
    assert_eq!((c.clips[0].content.as_str(), c.clips[0].at), ("a", 3));
    assert!(!c.touch("nope", 4));
    assert_eq!(content_hash(b""), 0xcbf2_9ce4_8422_2325);
    assert_ne!(content_hash(b"a"), content_hash(b"b"));
}
