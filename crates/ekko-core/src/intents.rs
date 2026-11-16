//! Spoken/typed pt-BR commands → intents, without an LLM (F1.5 voice commands).
//! The AI loop (F2) will handle anything this grammar does not recognize.

use serde::Serialize;

#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(tag = "kind", rename_all = "kebab-case")]
pub enum Intent {
    StartTimer {
        seconds: u64,
        label: Option<String>,
    },
    CancelTimer,
    MediaPlayPause,
    MediaPlay,
    MediaPause,
    MediaNext,
    MediaPrevious,
    WhatsPlaying,
    VolumeSet {
        percent: u8,
    },
    VolumeUp,
    VolumeDown,
    Mute,
    WhatTime,
    WhatDate,
    NextEvent,
    TodayAgenda,
    /// Not understood; keeps the normalized text for the AI (F2) or a fallback reply.
    Unknown {
        text: String,
    },
}

/// Lowercase, strip accents/punctuation, collapse spaces, drop the wake word.
pub fn normalize(input: &str) -> String {
    let lowered: String = input
        .to_lowercase()
        .chars()
        .map(fold_accent)
        .map(|c| {
            if c.is_alphanumeric() || c == ' ' {
                c
            } else {
                ' '
            }
        })
        .collect();
    let words: Vec<&str> = lowered.split_whitespace().collect();
    let skip = match words.as_slice() {
        ["ei" | "hey" | "oi" | "ok", "ekko" | "eco" | "ecco", ..] => 2,
        ["ekko" | "eco" | "ecco", ..] => 1,
        _ => 0,
    };
    words[skip..].join(" ")
}

fn fold_accent(c: char) -> char {
    match c {
        'á' | 'à' | 'â' | 'ã' | 'ä' => 'a',
        'é' | 'ê' | 'è' => 'e',
        'í' | 'î' => 'i',
        'ó' | 'ô' | 'õ' | 'ò' => 'o',
        'ú' | 'ü' | 'û' => 'u',
        'ç' => 'c',
        other => other,
    }
}

pub fn parse(input: &str) -> Intent {
    let text = normalize(input);
    let has = |words: &[&str]| words.iter().any(|w| contains_word(&text, w));

    if let Some(intent) = parse_timer(&text) {
        return intent;
    }
    if has(&["cancela", "cancelar", "apaga"]) && has(&["timer", "alarme", "cronometro"]) {
        return Intent::CancelTimer;
    }
    if let Some(intent) = parse_volume(&text) {
        return intent;
    }
    if has(&["proxima", "proximo", "pula", "pular", "avanca"])
        && !has(&["compromisso", "evento", "reuniao"])
    {
        return Intent::MediaNext;
    }
    if has(&["anterior", "volta"]) && has(&["musica", "faixa"]) || text == "anterior" {
        return Intent::MediaPrevious;
    }
    if has(&["que musica", "o que esta tocando", "qual musica", "que som"]) {
        return Intent::WhatsPlaying;
    }
    if has(&[
        "pausa",
        "pausar",
        "pause",
        "para a musica",
        "parar a musica",
    ]) {
        return Intent::MediaPause;
    }
    if has(&[
        "continua",
        "continuar",
        "despausa",
        "play",
        "toca",
        "tocar",
        "solta o som",
    ]) {
        return Intent::MediaPlay;
    }
    if has(&["que horas", "que hora", "horas sao"]) {
        return Intent::WhatTime;
    }
    if has(&["que dia", "data de hoje", "dia e hoje"]) {
        return Intent::WhatDate;
    }
    if has(&["proximo compromisso", "proximo evento", "proxima reuniao"]) {
        return Intent::NextEvent;
    }
    if has(&["agenda", "compromissos", "o que tenho hoje", "minha agenda"]) {
        return Intent::TodayAgenda;
    }
    Intent::Unknown { text }
}

/// Whole-word (or whole-phrase) match on normalized text.
fn contains_word(text: &str, phrase: &str) -> bool {
    let padded = format!(" {text} ");
    padded.contains(&format!(" {phrase} "))
}

fn parse_timer(text: &str) -> Option<Intent> {
    let triggers = [
        "timer",
        "temporizador",
        "cronometro",
        "me avisa em",
        "me avise em",
        "alarme de",
        "conta",
    ];
    if !triggers.iter().any(|t| contains_word(text, t)) {
        return None;
    }
    let seconds = parse_duration(text)?;
    // "timer de 5 minutos para o bolo" / "pro bolo" → label "bolo".
    let label = ["para o ", "para a ", "pro ", "pra ", "do ", "da "]
        .iter()
        .filter_map(|p| text.rfind(&format!(" {p}")).map(|i| (i, p.len() + 1)))
        .max_by_key(|(i, _)| *i)
        .map(|(i, len)| text[i + len..].trim().to_owned())
        .filter(|l| !l.is_empty() && parse_duration(l).is_none());
    Some(Intent::StartTimer { seconds, label })
}

/// Sums "1 hora e 20 minutos", "meia hora", "cinco minutos", "30 segundos", "1 minuto e meio".
pub fn parse_duration(text: &str) -> Option<u64> {
    let words: Vec<&str> = text.split_whitespace().collect();
    let mut total = 0u64;
    let mut found = false;
    for (i, w) in words.iter().enumerate() {
        let unit = match *w {
            "hora" | "horas" | "h" => 3600,
            "minuto" | "minutos" | "min" => 60,
            "segundo" | "segundos" | "seg" | "s" => 1,
            _ => continue,
        };
        // "meia hora"
        if i >= 1 && words[i - 1] == "meia" && unit == 3600 {
            total += 1800;
            found = true;
            continue;
        }
        // Longest first: "vinte e cinco" before "cinco".
        let amount = [3, 1]
            .into_iter()
            .filter(|&back| i >= back)
            .find_map(|back| number(&words[i - back..i]))
            .or_else(|| (i >= 1 && matches!(words[i - 1], "um" | "uma")).then_some(1))?;
        total += amount * unit;
        found = true;
        // "e meio" right after the unit → half of it.
        if words.get(i + 1) == Some(&"e") && words.get(i + 2) == Some(&"meio") {
            total += unit / 2;
        }
    }
    (found && total > 0).then_some(total)
}

/// "5", "cinco", "vinte e cinco", "quarenta e cinco".
fn number(words: &[&str]) -> Option<u64> {
    if let [w] = words {
        return w.parse().ok().or_else(|| word_value(w));
    }
    if let [tens, "e", unit] = words {
        let (t, u) = (word_value(tens)?, word_value(unit)?);
        return (t >= 20 && t % 10 == 0 && u < 10).then_some(t + u);
    }
    None
}

fn word_value(w: &str) -> Option<u64> {
    let v = match w {
        "um" | "uma" => 1,
        "dois" | "duas" => 2,
        "tres" => 3,
        "quatro" => 4,
        "cinco" => 5,
        "seis" => 6,
        "sete" => 7,
        "oito" => 8,
        "nove" => 9,
        "dez" => 10,
        "onze" => 11,
        "doze" => 12,
        "treze" => 13,
        "quatorze" | "catorze" => 14,
        "quinze" => 15,
        "dezesseis" => 16,
        "dezessete" => 17,
        "dezoito" => 18,
        "dezenove" => 19,
        "vinte" => 20,
        "trinta" => 30,
        "quarenta" => 40,
        "cinquenta" => 50,
        "sessenta" => 60,
        "noventa" => 90,
        "cem" => 100,
        _ => return None,
    };
    Some(v)
}

fn parse_volume(text: &str) -> Option<Intent> {
    if !contains_word(text, "volume")
        && !contains_word(text, "som")
        && !contains_word(text, "muta")
        && !contains_word(text, "mudo")
    {
        return None;
    }
    if ["muta", "mudo", "silencia"]
        .iter()
        .any(|w| contains_word(text, w))
    {
        return Some(Intent::Mute);
    }
    let words: Vec<&str> = text.split_whitespace().collect();
    // Left to right, longest first: "quarenta e cinco" before "cinco".
    let explicit = (0..words.len()).find_map(|i| {
        words
            .get(i..i + 3)
            .and_then(number)
            .or_else(|| number(&words[i..=i]))
    });
    if let Some(n) = explicit {
        return Some(Intent::VolumeSet {
            percent: n.min(100) as u8,
        });
    }
    if ["aumenta", "aumentar", "sobe", "mais alto"]
        .iter()
        .any(|w| contains_word(text, w))
    {
        return Some(Intent::VolumeUp);
    }
    if [
        "abaixa",
        "abaixar",
        "diminui",
        "diminuir",
        "baixa",
        "mais baixo",
    ]
    .iter()
    .any(|w| contains_word(text, w))
    {
        return Some(Intent::VolumeDown);
    }
    None
}

#[cfg(test)]
mod tests {
    use super::*;

    fn timer(seconds: u64, label: Option<&str>) -> Intent {
        Intent::StartTimer {
            seconds,
            label: label.map(str::to_owned),
        }
    }

    #[test]
    fn strips_wake_word_accents_and_punctuation() {
        assert_eq!(normalize("Ei, Ekko! Que horas são?"), "que horas sao");
        assert_eq!(normalize("ECO próxima"), "proxima");
    }

    #[test]
    fn timers_in_digits_words_and_mixed_units() {
        assert_eq!(parse("timer de 5 minutos"), timer(300, None));
        assert_eq!(
            parse("Ei Ekko, timer de cinco minutos pro bolo"),
            timer(300, Some("bolo"))
        );
        assert_eq!(parse("me avisa em 1 hora e 20 minutos"), timer(4800, None));
        assert_eq!(parse("timer de meia hora"), timer(1800, None));
        assert_eq!(parse("cronômetro de 30 segundos"), timer(30, None));
        assert_eq!(
            parse("timer de vinte e cinco minutos para o foco"),
            timer(1500, Some("foco"))
        );
        assert_eq!(parse("timer de um minuto e meio"), timer(90, None));
    }

    #[test]
    fn timer_without_duration_is_not_a_timer() {
        assert!(matches!(parse("timer"), Intent::Unknown { .. }));
        assert_eq!(parse("cancela o timer"), Intent::CancelTimer);
    }

    #[test]
    fn media_commands() {
        assert_eq!(parse("pausa a música"), Intent::MediaPause);
        assert_eq!(parse("continua"), Intent::MediaPlay);
        assert_eq!(parse("próxima"), Intent::MediaNext);
        assert_eq!(parse("pula essa"), Intent::MediaNext);
        assert_eq!(parse("volta a música"), Intent::MediaPrevious);
        assert_eq!(parse("que música é essa?"), Intent::WhatsPlaying);
    }

    #[test]
    fn volume_commands() {
        assert_eq!(parse("volume 30"), Intent::VolumeSet { percent: 30 });
        assert_eq!(
            parse("coloca o volume em quarenta e cinco"),
            Intent::VolumeSet { percent: 45 }
        );
        assert_eq!(parse("aumenta o volume"), Intent::VolumeUp);
        assert_eq!(parse("abaixa o som"), Intent::VolumeDown);
        assert_eq!(parse("muta"), Intent::Mute);
        assert_eq!(parse("volume 250"), Intent::VolumeSet { percent: 100 });
    }

    #[test]
    fn time_date_and_agenda() {
        assert_eq!(parse("que horas são"), Intent::WhatTime);
        assert_eq!(parse("que dia é hoje"), Intent::WhatDate);
        assert_eq!(parse("qual meu próximo compromisso?"), Intent::NextEvent);
        assert_eq!(parse("o que tenho hoje na agenda"), Intent::TodayAgenda);
    }

    #[test]
    fn unknown_keeps_normalized_text() {
        assert_eq!(
            parse("Ei Ekko, conta uma piada"),
            Intent::Unknown {
                text: "conta uma piada".into()
            }
        );
    }
}
