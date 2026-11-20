//! CF_HDROP payload (a DROPFILES header followed by the paths): what Explorer puts on
//! the clipboard when files are copied. Pure bytes, so it is tested off Windows too.

/// sizeof(DROPFILES): pFiles, pt.x, pt.y, fNC, fWide.
const HEADER: usize = 20;

/// Paths in a CF_HDROP block (wide or ANSI names, as the header says).
pub fn decode(bytes: &[u8]) -> Vec<String> {
    let word = |at: usize| {
        bytes
            .get(at..at + 4)
            .map(|b| u32::from_le_bytes([b[0], b[1], b[2], b[3]]))
    };
    let (Some(offset), Some(wide)) = (word(0), word(16)) else {
        return Vec::new();
    };
    let Some(list) = bytes.get(offset as usize..) else {
        return Vec::new();
    };
    // Names are separated by one NUL and the list ends with an empty name.
    let names: Vec<String> = if wide != 0 {
        let units: Vec<u16> = list
            .as_chunks::<2>()
            .0
            .iter()
            .map(|c| u16::from_le_bytes(*c))
            .collect();
        units
            .split(|&u| u == 0)
            .take_while(|s| !s.is_empty())
            .map(String::from_utf16_lossy)
            .collect()
    } else {
        list.split(|&b| b == 0)
            .take_while(|s| !s.is_empty())
            .map(|s| String::from_utf8_lossy(s).into_owned())
            .collect()
    };
    names
}

/// A wide CF_HDROP block for `paths`, ready for the clipboard.
pub fn encode(paths: &[String]) -> Vec<u8> {
    let mut out = Vec::new();
    out.extend_from_slice(&(HEADER as u32).to_le_bytes());
    out.extend_from_slice(&[0; 12]);
    out.extend_from_slice(&1u32.to_le_bytes());
    for path in paths {
        for unit in path.encode_utf16().chain(std::iter::once(0)) {
            out.extend_from_slice(&unit.to_le_bytes());
        }
    }
    out.extend_from_slice(&[0, 0]);
    out
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn round_trips_wide_paths() {
        let paths = vec![r"C:\docs\relatório.pdf".to_owned(), r"D:\fotos".to_owned()];
        assert_eq!(decode(&encode(&paths)), paths);
        assert!(decode(&encode(&[])).is_empty());
    }

    #[test]
    fn reads_ansi_lists_and_ignores_garbage() {
        let mut ansi = vec![0u8; HEADER];
        ansi[0] = HEADER as u8;
        ansi.extend_from_slice(b"C:\\a.txt\0C:\\b.txt\0\0");
        assert_eq!(decode(&ansi), ["C:\\a.txt", "C:\\b.txt"]);
        assert!(decode(&[1, 2, 3]).is_empty());
        let mut far = vec![0u8; HEADER];
        far[0] = 200;
        assert!(decode(&far).is_empty());
    }
}
