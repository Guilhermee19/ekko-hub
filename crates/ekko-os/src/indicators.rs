//! Quick system indicators the notch reacts to: Caps Lock and screen brightness.
//! Brightness comes from WMI (`WmiMonitorBrightness`), which only laptops and some
//! all-in-ones expose; external monitors give None.

/// True while Caps Lock is on.
pub fn caps_lock() -> bool {
    #[cfg(windows)]
    {
        use windows::Win32::UI::Input::KeyboardAndMouse::{GetKeyState, VK_CAPITAL};
        // SAFETY: plain query; the low bit is the toggle state.
        unsafe { GetKeyState(i32::from(VK_CAPITAL.0)) & 1 == 1 }
    }
    #[cfg(not(windows))]
    {
        false
    }
}

/// Seconds since the last keyboard or mouse input anywhere on the PC.
pub fn idle_secs() -> u32 {
    #[cfg(windows)]
    {
        use windows::Win32::System::SystemInformation::GetTickCount;
        use windows::Win32::UI::Input::KeyboardAndMouse::{GetLastInputInfo, LASTINPUTINFO};
        let mut info = LASTINPUTINFO {
            cbSize: size_of::<LASTINPUTINFO>() as u32,
            dwTime: 0,
        };
        // SAFETY: `info` is a valid, correctly sized out parameter.
        if !unsafe { GetLastInputInfo(&mut info) }.as_bool() {
            return 0;
        }
        // Both tick counts wrap together (~49 days), so the difference stays right.
        // SAFETY: plain query.
        unsafe { GetTickCount() }.wrapping_sub(info.dwTime) / 1000
    }
    #[cfg(not(windows))]
    {
        0
    }
}

/// Reads the built-in screen brightness. Holds a WMI connection: create it once on
/// the thread that polls (COM objects stay on their thread).
pub struct BrightnessReader {
    #[cfg(windows)]
    inner: Option<win::Wmi>,
}

impl BrightnessReader {
    pub fn new() -> Self {
        Self {
            #[cfg(windows)]
            inner: win::Wmi::connect().ok(),
        }
    }

    /// 0..100, or None when the screen has no software brightness.
    pub fn read(&self) -> Option<u8> {
        #[cfg(windows)]
        {
            self.inner.as_ref()?.brightness()
        }
        #[cfg(not(windows))]
        {
            None
        }
    }
}

impl Default for BrightnessReader {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(windows)]
mod win {
    use windows::Win32::System::Com::{
        CLSCTX_INPROC_SERVER, COINIT_MULTITHREADED, CoCreateInstance, CoInitializeEx,
        CoSetProxyBlanket, CoUninitialize, EOAC_NONE, RPC_C_AUTHN_LEVEL_CALL,
        RPC_C_IMP_LEVEL_IMPERSONATE,
    };
    use windows::Win32::System::Rpc::{RPC_C_AUTHN_WINNT, RPC_C_AUTHZ_NONE};
    use windows::Win32::System::Variant::VARIANT;
    use windows::Win32::System::Wmi::{
        IWbemClassObject, IWbemLocator, IWbemServices, WBEM_FLAG_FORWARD_ONLY,
        WBEM_FLAG_RETURN_IMMEDIATELY, WBEM_INFINITE, WbemLocator,
    };
    use windows::core::{BSTR, w};

    pub struct Wmi {
        services: IWbemServices,
        /// COM stays initialized while the connection lives.
        com: bool,
    }

    impl Drop for Wmi {
        fn drop(&mut self) {
            if self.com {
                // SAFETY: balances the successful CoInitializeEx in `connect`; the
                // services object is released right after (field drop order is fine:
                // COM tolerates release after uninit on MTA for in-proc proxies).
                unsafe { CoUninitialize() };
            }
        }
    }

    impl Wmi {
        pub fn connect() -> windows::core::Result<Self> {
            // SAFETY: COM calls on this thread; objects never leave it (Wmi is !Send).
            unsafe {
                let com = CoInitializeEx(None, COINIT_MULTITHREADED).is_ok();
                let locator: IWbemLocator =
                    CoCreateInstance(&WbemLocator, None, CLSCTX_INPROC_SERVER)?;
                let services = locator.ConnectServer(
                    &BSTR::from("ROOT\\WMI"),
                    &BSTR::new(),
                    &BSTR::new(),
                    &BSTR::new(),
                    0,
                    &BSTR::new(),
                    None,
                )?;
                CoSetProxyBlanket(
                    &services,
                    RPC_C_AUTHN_WINNT,
                    RPC_C_AUTHZ_NONE,
                    None,
                    RPC_C_AUTHN_LEVEL_CALL,
                    RPC_C_IMP_LEVEL_IMPERSONATE,
                    None,
                    EOAC_NONE,
                )?;
                Ok(Self { services, com })
            }
        }

        pub fn brightness(&self) -> Option<u8> {
            // SAFETY: COM calls on the owning thread; the VARIANT is read as the byte
            // WMI documents for CurrentBrightness (uint8).
            unsafe {
                let rows = self
                    .services
                    .ExecQuery(
                        &BSTR::from("WQL"),
                        &BSTR::from("SELECT CurrentBrightness FROM WmiMonitorBrightness"),
                        WBEM_FLAG_FORWARD_ONLY | WBEM_FLAG_RETURN_IMMEDIATELY,
                        None,
                    )
                    .ok()?;
                let mut row: [Option<IWbemClassObject>; 1] = [None];
                let mut got = 0u32;
                let _ = rows.Next(WBEM_INFINITE, &mut row, &mut got);
                let row = row[0].take()?;
                let mut value = VARIANT::default();
                row.Get(w!("CurrentBrightness"), 0, &mut value, None, None)
                    .ok()?;
                let level = value.Anonymous.Anonymous.Anonymous.bVal;
                Some(level.min(100))
            }
        }
    }
}
