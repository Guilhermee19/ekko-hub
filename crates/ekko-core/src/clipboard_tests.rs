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
    for i in 1..=(MAX_CLIPS as u64 + 5) {
        c.record(&format!("item {i}"), "App", i);
    }
    assert_eq!(c.clips.len(), MAX_CLIPS + 1);
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
