//! Battery levels: the laptop's (GetSystemPowerStatus) and those of connected
//! Bluetooth devices that report one (the same number Windows shows in Settings →
//! Bluetooth, read from the device property store).

use ekko_core::hud::{Battery, DeviceBattery, DeviceKind, PowerSnapshot};

pub fn snapshot() -> PowerSnapshot {
    PowerSnapshot {
        battery: battery(),
        devices: bluetooth(),
    }
}

/// None on PCs without a battery.
pub fn battery() -> Option<Battery> {
    #[cfg(windows)]
    {
        win::battery()
    }
    #[cfg(not(windows))]
    {
        None
    }
}

/// Connected Bluetooth devices with a battery level, sorted by name.
pub fn bluetooth() -> Vec<DeviceBattery> {
    #[cfg(windows)]
    {
        let mut out = win::bluetooth();
        out.sort_by(|a, b| a.name.cmp(&b.name));
        out
    }
    #[cfg(not(windows))]
    {
        Vec::new()
    }
}

/// Device-store names → battery per connected device. A headset shows up as several
/// nodes ("Fone", "Fone Hands-Free"); any node whose name starts with the device
/// name counts.
pub fn match_batteries(
    connected: &[(String, DeviceKind)],
    nodes: &[(String, u8)],
) -> Vec<DeviceBattery> {
    connected
        .iter()
        .filter_map(|(name, kind)| {
            let percent = nodes
                .iter()
                .filter(|(node, _)| node.starts_with(name.as_str()))
                .map(|(_, p)| *p)
                .max()?;
            Some(DeviceBattery {
                name: name.clone(),
                percent: percent.min(100),
                kind: *kind,
            })
        })
        .collect()
}

#[cfg(windows)]
mod win {
    use windows::Win32::Devices::Bluetooth::{
        BLUETOOTH_DEVICE_INFO, BLUETOOTH_DEVICE_SEARCH_PARAMS, BluetoothFindDeviceClose,
        BluetoothFindFirstDevice, BluetoothFindNextDevice,
    };
    use windows::Win32::Devices::DeviceAndDriverInstallation::{
        DIGCF_ALLCLASSES, DIGCF_PRESENT, SP_DEVINFO_DATA, SetupDiDestroyDeviceInfoList,
        SetupDiEnumDeviceInfo, SetupDiGetClassDevsW, SetupDiGetDevicePropertyW,
    };
    use windows::Win32::Devices::Properties::DEVPKEY_Device_FriendlyName;
    use windows::Win32::Foundation::{DEVPROPKEY, HANDLE};
    use windows::Win32::System::Power::{GetSystemPowerStatus, SYSTEM_POWER_STATUS};
    use windows::core::{GUID, PCWSTR};

    use ekko_core::hud::{Battery, DeviceBattery, DeviceKind};

    /// `{104EA319-6EE2-4701-BD47-8DDBF425BBE5} 2`: battery percent (byte).
    const BATTERY: DEVPROPKEY = DEVPROPKEY {
        fmtid: GUID::from_u128(0x104ea319_6ee2_4701_bd47_8ddbf425bbe5),
        pid: 2,
    };

    pub fn battery() -> Option<Battery> {
        let mut s = SYSTEM_POWER_STATUS::default();
        // SAFETY: fills the struct we own.
        unsafe { GetSystemPowerStatus(&mut s) }.ok()?;
        // 128: no system battery; 255: unknown.
        if s.BatteryFlag & 128 != 0 || s.BatteryLifePercent > 100 {
            return None;
        }
        Some(Battery {
            percent: s.BatteryLifePercent,
            plugged: s.ACLineStatus == 1,
        })
    }

    pub fn bluetooth() -> Vec<DeviceBattery> {
        let connected = connected_names();
        if connected.is_empty() {
            return Vec::new();
        }
        super::match_batteries(&connected, &battery_nodes())
    }

    /// Paired classic Bluetooth devices connected now, with their kind.
    fn connected_names() -> Vec<(String, DeviceKind)> {
        let params = BLUETOOTH_DEVICE_SEARCH_PARAMS {
            dwSize: size_of::<BLUETOOTH_DEVICE_SEARCH_PARAMS>() as u32,
            fReturnAuthenticated: true.into(),
            fReturnRemembered: true.into(),
            fReturnConnected: true.into(),
            fReturnUnknown: false.into(),
            fIssueInquiry: false.into(),
            cTimeoutMultiplier: 0,
            hRadio: HANDLE::default(),
        };
        let mut info = BLUETOOTH_DEVICE_INFO {
            dwSize: size_of::<BLUETOOTH_DEVICE_INFO>() as u32,
            ..Default::default()
        };
        let mut out = Vec::new();
        // SAFETY: the search handle is closed below; `info` is ours.
        unsafe {
            let Ok(find) = BluetoothFindFirstDevice(&params, &mut info) else {
                return out;
            };
            loop {
                if info.fConnected.as_bool() {
                    let len = info.szName.iter().position(|c| *c == 0).unwrap_or(0);
                    let name = String::from_utf16_lossy(&info.szName[..len]);
                    if !name.is_empty() && !out.iter().any(|(n, _)| *n == name) {
                        out.push((name, DeviceKind::from_class(info.ulClassofDevice)));
                    }
                }
                if BluetoothFindNextDevice(find, &mut info).is_err() {
                    break;
                }
            }
            let _ = BluetoothFindDeviceClose(find);
        }
        out
    }

    /// (friendly name, percent) of every present device node that reports a battery.
    fn battery_nodes() -> Vec<(String, u8)> {
        let mut out = Vec::new();
        // SAFETY: the list is destroyed below; buffers are sized per call.
        unsafe {
            let Ok(list) =
                SetupDiGetClassDevsW(None, PCWSTR::null(), None, DIGCF_PRESENT | DIGCF_ALLCLASSES)
            else {
                return out;
            };
            let mut data = SP_DEVINFO_DATA {
                cbSize: size_of::<SP_DEVINFO_DATA>() as u32,
                ..Default::default()
            };
            let mut i = 0;
            while SetupDiEnumDeviceInfo(list, i, &mut data).is_ok() {
                i += 1;
                let mut kind = Default::default();
                let mut level = [0u8; 1];
                let read = SetupDiGetDevicePropertyW(
                    list,
                    &data,
                    &BATTERY,
                    &mut kind,
                    Some(&mut level),
                    None,
                    0,
                );
                if read.is_err() {
                    continue;
                }
                let mut name = [0u8; 512];
                let mut size = 0u32;
                let named = SetupDiGetDevicePropertyW(
                    list,
                    &data,
                    &DEVPKEY_Device_FriendlyName,
                    &mut kind,
                    Some(&mut name),
                    Some(&mut size),
                    0,
                );
                if named.is_ok() {
                    let wide: Vec<u16> = name[..(size as usize).min(name.len())]
                        .as_chunks::<2>()
                        .0
                        .iter()
                        .map(|c| u16::from_le_bytes(*c))
                        .take_while(|c| *c != 0)
                        .collect();
                    out.push((String::from_utf16_lossy(&wide), level[0]));
                }
            }
            let _ = SetupDiDestroyDeviceInfoList(list);
        }
        out
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn matches_headset_nodes_by_name_prefix() {
        let connected = vec![
            ("Galaxy Buds".to_string(), DeviceKind::Headphones),
            ("Mouse".to_string(), DeviceKind::Mouse),
        ];
        let nodes = vec![
            ("Galaxy Buds Hands-Free".to_string(), 60),
            ("Galaxy Buds".to_string(), 70),
            ("Teclado".to_string(), 40),
        ];
        let got = match_batteries(&connected, &nodes);
        assert_eq!(got.len(), 1);
        assert_eq!(got[0].name, "Galaxy Buds");
        assert_eq!(got[0].percent, 70);
        assert_eq!(got[0].kind, DeviceKind::Headphones);
    }
}
