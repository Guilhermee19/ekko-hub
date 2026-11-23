//! Windows performance counters (PDH), shared by the GPU and thermal samplers. No admin
//! needed: these are the same counters Task Manager and perfmon read.

use windows::Win32::Foundation::ERROR_SUCCESS;
use windows::Win32::System::Performance::{
    PDH_CSTATUS_NEW_DATA, PDH_CSTATUS_VALID_DATA, PDH_FMT, PDH_FMT_COUNTERVALUE_ITEM_W,
    PDH_FMT_LARGE, PDH_HCOUNTER, PDH_HQUERY, PDH_MORE_DATA, PdhAddEnglishCounterW, PdhCloseQuery,
    PdhCollectQueryData, PdhGetFormattedCounterArrayW, PdhOpenQueryW,
};
use windows::core::PCWSTR;

/// (instance name, value) for every instance of a wildcard counter.
pub type Rows = Vec<(String, f64)>;

/// A PDH query that owns its handle (closed on drop).
pub struct Query(PDH_HQUERY);

impl Query {
    pub fn open() -> Option<Self> {
        let mut query = PDH_HQUERY::default();
        // SAFETY: out-param is a valid local; closed in Drop.
        (unsafe { PdhOpenQueryW(PCWSTR::null(), 0, &mut query) } == ERROR_SUCCESS.0)
            .then_some(Self(query))
    }

    /// Adds an English counter path; None when this PC does not have it.
    pub fn add(&self, path: PCWSTR) -> Option<PDH_HCOUNTER> {
        let mut counter = PDH_HCOUNTER::default();
        // SAFETY: the query is open; `path` is a NUL-terminated literal.
        (unsafe { PdhAddEnglishCounterW(self.0, path, 0, &mut counter) } == ERROR_SUCCESS.0)
            .then_some(counter)
    }

    /// Takes a sample of every counter in the query.
    pub fn collect(&self) -> bool {
        // SAFETY: the query is open for as long as `self`.
        unsafe { PdhCollectQueryData(self.0) == ERROR_SUCCESS.0 }
    }
}

impl Drop for Query {
    fn drop(&mut self) {
        // SAFETY: opened in `open`, closed exactly once.
        unsafe {
            PdhCloseQuery(self.0);
        }
    }
}

/// Wildcard counter → (instance, value). Instances come and go between the size
/// query and the read, so `MORE_DATA` is retried.
///
/// # Safety
/// `counter` must belong to a query that is still open.
pub unsafe fn read_array(counter: PDH_HCOUNTER, format: PDH_FMT) -> Option<Rows> {
    let item = size_of::<PDH_FMT_COUNTERVALUE_ITEM_W>();
    for _ in 0..3 {
        let (mut size, mut count) = (0u32, 0u32);
        // SAFETY: size query without a buffer.
        let status =
            unsafe { PdhGetFormattedCounterArrayW(counter, format, &mut size, &mut count, None) };
        if status != PDH_MORE_DATA {
            // No instance right now (e.g. nothing drawing): empty, not an error.
            return (status == ERROR_SUCCESS.0).then(Vec::new);
        }
        let len = (size as usize).div_ceil(item);
        let mut buf = vec![PDH_FMT_COUNTERVALUE_ITEM_W::default(); len];
        // SAFETY: `buf` holds at least `size` bytes, aligned for the items.
        let status = unsafe {
            PdhGetFormattedCounterArrayW(
                counter,
                format,
                &mut size,
                &mut count,
                Some(buf.as_mut_ptr()),
            )
        };
        if status == PDH_MORE_DATA {
            continue;
        }
        if status != ERROR_SUCCESS.0 {
            return None;
        }
        let rows = buf
            .iter()
            .take(count as usize)
            .filter(|i| {
                i.FmtValue.CStatus == PDH_CSTATUS_VALID_DATA
                    || i.FmtValue.CStatus == PDH_CSTATUS_NEW_DATA
            })
            .map(|i| {
                // SAFETY: PDH wrote a NUL-terminated name into `buf` and the union
                // member that matches `format`.
                unsafe {
                    let name = i.szName.to_string().unwrap_or_default();
                    let value = if format == PDH_FMT_LARGE {
                        i.FmtValue.Anonymous.largeValue as f64
                    } else {
                        i.FmtValue.Anonymous.doubleValue
                    };
                    (name, value)
                }
            })
            .collect();
        return Some(rows);
    }
    None
}
