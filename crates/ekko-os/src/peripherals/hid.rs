//! Thin Win32 HID layer: list collections, open one, feature reports and reads.

use windows::Win32::Devices::DeviceAndDriverInstallation::{
    CM_GET_DEVICE_INTERFACE_LIST_PRESENT, CM_Get_Device_Interface_List_SizeW,
    CM_Get_Device_Interface_ListW, CR_SUCCESS,
};
use windows::Win32::Devices::HumanInterfaceDevice::{
    HIDD_ATTRIBUTES, HIDP_CAPS, HIDP_STATUS_SUCCESS, HidD_FreePreparsedData, HidD_GetAttributes,
    HidD_GetFeature, HidD_GetHidGuid, HidD_GetPreparsedData, HidD_SetFeature, HidP_GetCaps,
    PHIDP_PREPARSED_DATA,
};
use windows::Win32::Foundation::{CloseHandle, GENERIC_READ, GENERIC_WRITE, HANDLE};
use windows::Win32::Storage::FileSystem::{
    CreateFileW, FILE_FLAGS_AND_ATTRIBUTES, FILE_SHARE_READ, FILE_SHARE_WRITE, OPEN_EXISTING,
    ReadFile,
};
use windows::core::{HSTRING, PCWSTR};

use super::HidInfo;

/// Every present HID collection whose path passes `keep`, with its caps.
pub fn list(keep: fn(&str) -> bool) -> Vec<HidInfo> {
    paths()
        .into_iter()
        .filter(|p| keep(p))
        .filter_map(|path| Device::open_raw(&path, 0).and_then(|d| d.info(path)))
        .collect()
}

fn paths() -> Vec<String> {
    // SAFETY: the buffer is sized by the first call; the list is UTF-16 multi-sz.
    unsafe {
        let guid = HidD_GetHidGuid();
        let mut len = 0u32;
        let flags = CM_GET_DEVICE_INTERFACE_LIST_PRESENT;
        if CM_Get_Device_Interface_List_SizeW(&mut len, &guid, PCWSTR::null(), flags) != CR_SUCCESS
        {
            return Vec::new();
        }
        let mut buf = vec![0u16; len as usize];
        if CM_Get_Device_Interface_ListW(&guid, PCWSTR::null(), &mut buf, flags) != CR_SUCCESS {
            return Vec::new();
        }
        buf.split(|c| *c == 0)
            .filter(|s| !s.is_empty())
            .map(String::from_utf16_lossy)
            .collect()
    }
}

/// An open HID collection; closed on drop. Shared with other apps (no exclusivity).
pub struct Device(HANDLE);

impl Device {
    /// `write` is needed only to send feature reports.
    pub fn open(path: &str, write: bool) -> Option<Self> {
        let access = if write {
            GENERIC_READ.0 | GENERIC_WRITE.0
        } else {
            GENERIC_READ.0
        };
        Self::open_raw(path, access)
    }

    fn open_raw(path: &str, access: u32) -> Option<Self> {
        // SAFETY: plain open; the handle is owned by the returned value.
        unsafe {
            CreateFileW(
                &HSTRING::from(path),
                access,
                FILE_SHARE_READ | FILE_SHARE_WRITE,
                None,
                OPEN_EXISTING,
                FILE_FLAGS_AND_ATTRIBUTES(0),
                None,
            )
        }
        .ok()
        .map(Self)
    }

    fn info(&self, path: String) -> Option<HidInfo> {
        let mut attrs = HIDD_ATTRIBUTES {
            Size: size_of::<HIDD_ATTRIBUTES>() as u32,
            ..Default::default()
        };
        let mut caps = HIDP_CAPS::default();
        // SAFETY: out-params we own; the preparsed data is freed right after use.
        unsafe {
            if !HidD_GetAttributes(self.0, &mut attrs) {
                return None;
            }
            let mut pre = PHIDP_PREPARSED_DATA::default();
            if !HidD_GetPreparsedData(self.0, &mut pre) {
                return None;
            }
            let status = HidP_GetCaps(pre, &mut caps);
            let _ = HidD_FreePreparsedData(pre);
            if status != HIDP_STATUS_SUCCESS {
                return None;
            }
        }
        Some(HidInfo {
            path,
            vid: attrs.VendorID,
            pid: attrs.ProductID,
            usage_page: caps.UsagePage,
            usage: caps.Usage,
            input_len: caps.InputReportByteLength,
            feature_len: caps.FeatureReportByteLength,
        })
    }

    /// `report[0]` is the report ID; the length must match the collection's.
    pub fn set_feature(&self, report: &[u8]) -> bool {
        // SAFETY: the buffer outlives the call.
        unsafe { HidD_SetFeature(self.0, report.as_ptr().cast(), report.len() as u32) }
    }

    pub fn get_feature(&self, report: &mut [u8]) -> bool {
        // SAFETY: the buffer outlives the call.
        unsafe { HidD_GetFeature(self.0, report.as_mut_ptr().cast(), report.len() as u32) }
    }

    /// Blocks until the next input report; false once the device is gone.
    pub fn read(&self, buf: &mut [u8]) -> bool {
        let mut got = 0u32;
        // SAFETY: synchronous read into a buffer we own.
        unsafe { ReadFile(self.0, Some(buf), Some(&mut got), None) }.is_ok() && got > 0
    }
}

impl Drop for Device {
    fn drop(&mut self) {
        // SAFETY: we own the handle.
        let _ = unsafe { CloseHandle(self.0) };
    }
}
