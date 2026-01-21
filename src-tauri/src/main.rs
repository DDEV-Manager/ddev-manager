// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    // Force X11 backend on Linux to avoid WebKitGTK + Wayland compatibility issues
    // This prevents errors like "Error dispatching to Wayland display",
    // "Could not create GBM EGL display", and DRM permission errors
    #[cfg(target_os = "linux")]
    {
        std::env::set_var("GDK_BACKEND", "x11");
    }

    ddev_manager_lib::run()
}
