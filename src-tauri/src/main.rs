// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    // Disable WebKit compositing on Linux to avoid graphics compatibility issues
    // This prevents errors like "Could not create GBM EGL display",
    // "DRM_IOCTL_MODE_CREATE_DUMB failed", and GBM buffer errors
    #[cfg(target_os = "linux")]
    {
        std::env::set_var("WEBKIT_DISABLE_COMPOSITING_MODE", "1");
    }

    ddev_manager_lib::run()
}
