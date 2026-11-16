//! Manual probe: prints what Windows reports as playing (GSMTC).
//! `cargo run -p ekko-os --example now_playing`

fn main() {
    match ekko_os::media::current() {
        Some(np) => {
            let thumb = np.thumbnail.as_ref().map_or(0, String::len);
            println!(
                "title={:?} artist={:?} album={:?} app={:?} source={:?} playing={} pos={}ms dur={}ms thumb={}B",
                np.title,
                np.artist,
                np.album,
                np.app_id,
                np.source,
                np.playing,
                np.position_ms,
                np.duration_ms,
                thumb
            );
        }
        None => println!("nothing playing"),
    }
}
