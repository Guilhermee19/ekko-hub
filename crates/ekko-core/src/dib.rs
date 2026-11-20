//! Reading a CF_DIB clipboard image (what Paint, Office and screenshots put there) into
//! a `Frame`, so Copiados can keep it as a PNG.

use crate::capture::{CaptureError, Frame};

/// Biggest image kept: 40 megapixels (a 8K screenshot is 33).
const MAX_PIXELS: u64 = 40_000_000;
const BI_RGB: u32 = 0;
const BI_BITFIELDS: u32 = 3;

fn u32_at(b: &[u8], at: usize) -> Option<u32> {
    Some(u32::from_le_bytes(b.get(at..at + 4)?.try_into().ok()?))
}

fn bad(why: &str) -> CaptureError {
    CaptureError::Encode(why.into())
}

impl Frame {
    /// 24 or 32 bits per pixel, bottom-up or top-down, plain or with the standard
    /// BGRA masks. Anything else (palettes, JPEG inside a DIB) is refused.
    pub fn from_dib(dib: &[u8]) -> Result<Frame, CaptureError> {
        let header = u32_at(dib, 0).ok_or_else(|| bad("imagem vazia"))? as usize;
        let width = u32_at(dib, 4).ok_or_else(|| bad("imagem cortada"))? as i32;
        let height = u32_at(dib, 8).ok_or_else(|| bad("imagem cortada"))? as i32;
        let bpp = u16::from_le_bytes([
            dib.get(14).copied().unwrap_or(0),
            dib.get(15).copied().unwrap_or(0),
        ]);
        let compression = u32_at(dib, 16).ok_or_else(|| bad("imagem cortada"))?;
        if header < 40 || width <= 0 || height == 0 || !matches!(bpp, 24 | 32) {
            return Err(bad("formato de imagem não suportado"));
        }
        if compression != BI_RGB && !(compression == BI_BITFIELDS && bpp == 32) {
            return Err(bad("formato de imagem não suportado"));
        }
        let (w, h) = (width as usize, height.unsigned_abs() as usize);
        if (w as u64) * (h as u64) > MAX_PIXELS {
            return Err(bad("imagem grande demais"));
        }
        // A plain 40-byte header is followed by the three masks when BI_BITFIELDS.
        let masks = if compression == BI_BITFIELDS && header == 40 {
            12
        } else {
            0
        };
        let start = header + masks;
        let stride = (w * bpp as usize).div_ceil(32) * 4;
        let pixels = dib
            .get(start..start + stride * h)
            .ok_or_else(|| bad("imagem cortada"))?;
        let step = bpp as usize / 8;
        let mut bgra = Vec::with_capacity(w * h * 4);
        for y in 0..h {
            // Positive height = bottom-up rows.
            let row = if height > 0 { h - 1 - y } else { y };
            let line = &pixels[row * stride..row * stride + w * step];
            for px in line.chunks_exact(step) {
                bgra.extend_from_slice(&[px[0], px[1], px[2], 0xFF]);
            }
        }
        Ok(Frame {
            width: w as u32,
            height: h as u32,
            bgra,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn header(width: i32, height: i32, bpp: u16, compression: u32) -> Vec<u8> {
        let mut h = Vec::new();
        h.extend_from_slice(&40u32.to_le_bytes());
        h.extend_from_slice(&width.to_le_bytes());
        h.extend_from_slice(&height.to_le_bytes());
        h.extend_from_slice(&1u16.to_le_bytes());
        h.extend_from_slice(&bpp.to_le_bytes());
        h.extend_from_slice(&compression.to_le_bytes());
        h.extend_from_slice(&[0; 20]);
        h
    }

    #[test]
    fn round_trips_the_dib_frames_write() {
        let frame = Frame {
            width: 2,
            height: 2,
            bgra: vec![1, 2, 3, 255, 4, 5, 6, 255, 7, 8, 9, 255, 10, 11, 12, 255],
        };
        assert_eq!(Frame::from_dib(&frame.dib()).unwrap(), frame);
    }

    #[test]
    fn reads_24_bit_rows_with_padding_and_bitfield_masks() {
        // 1×2, 24 bpp: each 3-byte row is padded to 4. Bottom-up: blue row last.
        let mut dib = header(1, 2, 24, BI_RGB);
        dib.extend_from_slice(&[0, 0, 255, 0, 255, 0, 0, 0]);
        let f = Frame::from_dib(&dib).unwrap();
        assert_eq!(f.bgra, [255, 0, 0, 255, 0, 0, 255, 255]);

        // 32 bpp with the masks after the header, top-down.
        let mut dib = header(1, -1, 32, BI_BITFIELDS);
        dib.extend_from_slice(&[0; 12]);
        dib.extend_from_slice(&[9, 8, 7, 0]);
        assert_eq!(Frame::from_dib(&dib).unwrap().bgra, [9, 8, 7, 255]);
    }

    #[test]
    fn refuses_what_it_cannot_read() {
        assert!(Frame::from_dib(&[]).is_err());
        assert!(Frame::from_dib(&header(4, 4, 8, BI_RGB)).is_err());
        // Header says 4×4 but there are no pixels.
        assert!(Frame::from_dib(&header(4, 4, 32, BI_RGB)).is_err());
        assert!(Frame::from_dib(&header(10_000, 10_000, 32, BI_RGB)).is_err());
    }
}
