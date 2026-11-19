//! Screen prints ("Alt Gr + Print Screen"): pure pixel work on a captured frame.
//! Pixels are 32-bit BGRA rows, top to bottom, as Windows hands them over (GDI).
//! The shell captures; this crops, encodes (PNG for the file, BMP for the frozen
//! frame the selection overlay shows, DIB for the clipboard) and names the file.

use crate::clock::civil_from_days;

/// A captured image: `bgra.len() == width * height * 4`.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Frame {
    pub width: u32,
    pub height: u32,
    pub bgra: Vec<u8>,
}

/// Area picked in the overlay, in frame pixels.
#[derive(Debug, Clone, Copy, PartialEq, Eq, serde::Deserialize)]
pub struct Region {
    pub x: i64,
    pub y: i64,
    pub w: i64,
    pub h: i64,
}

#[derive(Debug, thiserror::Error)]
pub enum CaptureError {
    #[error("a área escolhida está vazia")]
    Empty,
    #[error("não deu para gerar a imagem: {0}")]
    Encode(String),
}

impl Frame {
    /// Pixels of `region` clamped to the frame; errors when nothing is left.
    pub fn crop(&self, region: Region) -> Result<Frame, CaptureError> {
        let (fw, fh) = (i64::from(self.width), i64::from(self.height));
        let x0 = region.x.clamp(0, fw);
        let y0 = region.y.clamp(0, fh);
        let x1 = (region.x + region.w).clamp(0, fw);
        let y1 = (region.y + region.h).clamp(0, fh);
        if x1 - x0 < 1 || y1 - y0 < 1 {
            return Err(CaptureError::Empty);
        }
        let (w, h) = ((x1 - x0) as usize, (y1 - y0) as usize);
        let stride = self.width as usize * 4;
        let mut bgra = Vec::with_capacity(w * h * 4);
        for row in y0 as usize..y1 as usize {
            let start = row * stride + x0 as usize * 4;
            bgra.extend_from_slice(&self.bgra[start..start + w * 4]);
        }
        Ok(Frame {
            width: w as u32,
            height: h as u32,
            bgra,
        })
    }

    /// PNG file bytes (opaque: screen pixels carry no meaningful alpha).
    pub fn png(&self) -> Result<Vec<u8>, CaptureError> {
        let mut rgb = Vec::with_capacity(self.bgra.len() / 4 * 3);
        for px in self.bgra.as_chunks::<4>().0 {
            rgb.extend_from_slice(&[px[2], px[1], px[0]]);
        }
        let mut out = Vec::new();
        let mut encoder = png::Encoder::new(&mut out, self.width, self.height);
        encoder.set_color(png::ColorType::Rgb);
        encoder.set_depth(png::BitDepth::Eight);
        // Screen content compresses well; fast keeps the save instant on 4K.
        encoder.set_compression(png::Compression::Fast);
        let encode = |e: png::EncodingError| CaptureError::Encode(e.to_string());
        let mut writer = encoder.write_header().map_err(encode)?;
        writer.write_image_data(&rgb).map_err(encode)?;
        writer.finish().map_err(encode)?;
        Ok(out)
    }

    /// Decodes a PNG back to a frame (copying a saved print to the clipboard).
    pub fn from_png(bytes: &[u8]) -> Result<Frame, CaptureError> {
        let fail = |e: png::DecodingError| CaptureError::Encode(e.to_string());
        let mut decoder = png::Decoder::new(std::io::Cursor::new(bytes));
        decoder.set_transformations(png::Transformations::EXPAND | png::Transformations::STRIP_16);
        let mut reader = decoder.read_info().map_err(fail)?;
        let size = reader
            .output_buffer_size()
            .ok_or_else(|| CaptureError::Encode("imagem grande demais".into()))?;
        let mut buf = vec![0; size];
        let info = reader.next_frame(&mut buf).map_err(fail)?;
        let channels = info.color_type.samples();
        let mut bgra = Vec::with_capacity(info.width as usize * info.height as usize * 4);
        for row in buf[..info.buffer_size()].chunks_exact(info.line_size) {
            for px in row[..info.width as usize * channels].chunks_exact(channels) {
                let (r, g, b, a) = match channels {
                    1 => (px[0], px[0], px[0], 255),
                    2 => (px[0], px[0], px[0], px[1]),
                    3 => (px[0], px[1], px[2], 255),
                    _ => (px[0], px[1], px[2], px[3]),
                };
                bgra.extend_from_slice(&[b, g, r, a]);
            }
        }
        Ok(Frame {
            width: info.width,
            height: info.height,
            bgra,
        })
    }

    /// 32-bit top-down BMP file: written in a blink, so the overlay opens instantly.
    pub fn bmp(&self) -> Vec<u8> {
        let header = self.info_header(true);
        let offset = 14 + header.len() as u32;
        let mut out = Vec::with_capacity(offset as usize + self.bgra.len());
        out.extend_from_slice(b"BM");
        out.extend_from_slice(&(offset + self.bgra.len() as u32).to_le_bytes());
        out.extend_from_slice(&[0; 4]);
        out.extend_from_slice(&offset.to_le_bytes());
        out.extend_from_slice(&header);
        out.extend_from_slice(&self.bgra);
        out
    }

    /// CF_DIB clipboard payload (bottom-up rows, as most apps expect).
    pub fn dib(&self) -> Vec<u8> {
        let mut out = self.info_header(false);
        let stride = self.width as usize * 4;
        for row in self.bgra.chunks_exact(stride).rev() {
            for px in row.as_chunks::<4>().0 {
                out.extend_from_slice(&[px[0], px[1], px[2], 0xFF]);
            }
        }
        out
    }

    /// BITMAPINFOHEADER, 32 bpp, BI_RGB.
    fn info_header(&self, top_down: bool) -> Vec<u8> {
        let height = self.height as i32;
        let mut h = Vec::with_capacity(40);
        h.extend_from_slice(&40u32.to_le_bytes());
        h.extend_from_slice(&(self.width as i32).to_le_bytes());
        h.extend_from_slice(&(if top_down { -height } else { height }).to_le_bytes());
        h.extend_from_slice(&1u16.to_le_bytes());
        h.extend_from_slice(&32u16.to_le_bytes());
        h.extend_from_slice(&0u32.to_le_bytes());
        h.extend_from_slice(&(self.bgra.len() as u32).to_le_bytes());
        h.extend_from_slice(&[0; 16]);
        h
    }
}

/// "Print 2026-11-19 15-30-12.png" in local time (no ':' — not allowed on Windows).
pub fn file_name(at_ms: u64, offset_ms: i64) -> String {
    let local = at_ms as i64 + offset_ms;
    let (days, ms) = (local.div_euclid(86_400_000), local.rem_euclid(86_400_000));
    let (y, m, d) = civil_from_days(days);
    let s = ms / 1000;
    format!(
        "Print {y:04}-{m:02}-{d:02} {:02}-{:02}-{:02}.png",
        s / 3600,
        s / 60 % 60,
        s % 60
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    /// 3×2 frame whose blue channel is the pixel index.
    fn frame() -> Frame {
        let bgra = (0..6u8).flat_map(|i| [i, 10, 20, 0]).collect();
        Frame {
            width: 3,
            height: 2,
            bgra,
        }
    }

    #[test]
    fn crop_takes_the_region_and_clamps_it() {
        let c = frame()
            .crop(Region {
                x: 1,
                y: 0,
                w: 5,
                h: 5,
            })
            .unwrap();
        assert_eq!((c.width, c.height), (2, 2));
        let blues: Vec<u8> = c.bgra.chunks(4).map(|p| p[0]).collect();
        assert_eq!(blues, vec![1, 2, 4, 5]);
        assert!(
            frame()
                .crop(Region {
                    x: 3,
                    y: 0,
                    w: 2,
                    h: 2
                })
                .is_err()
        );
        assert!(
            frame()
                .crop(Region {
                    x: -5,
                    y: -5,
                    w: 2,
                    h: 2
                })
                .is_err()
        );
    }

    #[test]
    fn png_round_trips_the_pixels() {
        let f = frame();
        let back = Frame::from_png(&f.png().unwrap()).unwrap();
        assert_eq!((back.width, back.height), (3, 2));
        let opaque: Vec<u8> = f
            .bgra
            .chunks(4)
            .flat_map(|p| [p[0], p[1], p[2], 255])
            .collect();
        assert_eq!(back.bgra, opaque);
    }

    #[test]
    fn bmp_and_dib_have_the_right_shape() {
        let f = frame();
        let bmp = f.bmp();
        assert_eq!(&bmp[..2], b"BM");
        assert_eq!(bmp.len(), 14 + 40 + 24);
        // Top-down: negative height.
        assert_eq!(i32::from_le_bytes(bmp[22..26].try_into().unwrap()), -2);
        let dib = f.dib();
        assert_eq!(dib.len(), 40 + 24);
        // Bottom-up: the first row stored is the frame's last (pixel 3), alpha opaque.
        assert_eq!(&dib[40..44], &[3, 10, 20, 255]);
    }

    #[test]
    fn file_name_uses_local_time_without_colons() {
        // 2026-11-19 18:30:12 UTC at UTC-3.
        let at = 1_795_113_012_000;
        assert_eq!(
            file_name(at, -3 * 3_600_000),
            "Print 2026-11-19 15-30-12.png"
        );
    }
}
