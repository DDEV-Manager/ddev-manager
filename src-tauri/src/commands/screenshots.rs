use std::path::PathBuf;
use std::thread;
use tauri::{Emitter, Manager, Window};

use crate::error::DdevError;
use crate::types::ScreenshotStatus;

/// Find Chrome/Chromium executable on Linux
#[cfg(target_os = "linux")]
fn find_chrome_executable() -> Option<PathBuf> {
    let candidates = [
        "/usr/bin/google-chrome",
        "/usr/bin/google-chrome-stable",
        "/usr/bin/chromium",
        "/usr/bin/chromium-browser",
        "/snap/bin/chromium",
        "/usr/bin/brave-browser",
    ];

    for path in candidates {
        let path = PathBuf::from(path);
        if path.exists() {
            return Some(path);
        }
    }

    None
}

/// Get the screenshots directory, creating it if necessary
fn get_screenshots_dir(app: &tauri::AppHandle) -> Result<PathBuf, DdevError> {
    let data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| DdevError::IoError(format!("Failed to get app data dir: {}", e)))?;

    let screenshots_dir = data_dir.join("screenshots");

    if !screenshots_dir.exists() {
        std::fs::create_dir_all(&screenshots_dir)
            .map_err(|e| DdevError::IoError(format!("Failed to create screenshots dir: {}", e)))?;
    }

    Ok(screenshots_dir)
}

/// Capture a screenshot of a project's website
/// This runs in a background thread and emits screenshot-status events
#[tauri::command]
pub fn capture_screenshot(
    app: tauri::AppHandle,
    window: Window,
    project_name: String,
    url: String,
) -> Result<(), DdevError> {
    let screenshots_dir = get_screenshots_dir(&app)?;

    // Emit started status
    let _ = window.emit(
        "screenshot-status",
        ScreenshotStatus {
            project: project_name.clone(),
            status: "started".to_string(),
            path: None,
            message: Some(format!("Capturing screenshot of {}", url)),
        },
    );

    // Spawn background thread for screenshot capture
    thread::spawn(move || {
        use headless_chrome::{Browser, LaunchOptions};

        // Emit capturing status
        let _ = window.emit(
            "screenshot-status",
            ScreenshotStatus {
                project: project_name.clone(),
                status: "capturing".to_string(),
                path: None,
                message: Some("Launching browser...".to_string()),
            },
        );

        // Launch headless browser with certificate error bypass (DDEV uses self-signed certs)
        let mut builder = LaunchOptions::default_builder();
        builder
            .headless(true)
            .ignore_certificate_errors(true)
            .window_size(Some((1280, 800)));

        // On Linux, we need to explicitly find and set the Chrome/Chromium path
        #[cfg(target_os = "linux")]
        {
            if let Some(chrome_path) = find_chrome_executable() {
                builder.path(Some(chrome_path));
            } else {
                let _ = window.emit(
                    "screenshot-status",
                    ScreenshotStatus {
                        project: project_name,
                        status: "error".to_string(),
                        path: None,
                        message: Some(
                            "Chrome or Chromium not found. Please install google-chrome or chromium."
                                .to_string(),
                        ),
                    },
                );
                return;
            }
        }

        let launch_options = match builder.build() {
            Ok(opts) => opts,
            Err(e) => {
                let _ = window.emit(
                    "screenshot-status",
                    ScreenshotStatus {
                        project: project_name,
                        status: "error".to_string(),
                        path: None,
                        message: Some(format!("Failed to build launch options: {}", e)),
                    },
                );
                return;
            }
        };

        let browser = match Browser::new(launch_options) {
            Ok(b) => b,
            Err(e) => {
                let _ = window.emit(
                    "screenshot-status",
                    ScreenshotStatus {
                        project: project_name,
                        status: "error".to_string(),
                        path: None,
                        message: Some(format!("Failed to launch browser: {}", e)),
                    },
                );
                return;
            }
        };

        let tab = match browser.new_tab() {
            Ok(t) => t,
            Err(e) => {
                let _ = window.emit(
                    "screenshot-status",
                    ScreenshotStatus {
                        project: project_name,
                        status: "error".to_string(),
                        path: None,
                        message: Some(format!("Failed to create browser tab: {}", e)),
                    },
                );
                return;
            }
        };

        // Navigate to URL
        if let Err(e) = tab.navigate_to(&url) {
            let _ = window.emit(
                "screenshot-status",
                ScreenshotStatus {
                    project: project_name,
                    status: "error".to_string(),
                    path: None,
                    message: Some(format!("Failed to navigate to URL: {}", e)),
                },
            );
            return;
        }

        // Wait for page to load
        if let Err(e) = tab.wait_until_navigated() {
            let _ = window.emit(
                "screenshot-status",
                ScreenshotStatus {
                    project: project_name,
                    status: "error".to_string(),
                    path: None,
                    message: Some(format!("Page load timeout: {}", e)),
                },
            );
            return;
        }

        // Additional delay for JavaScript rendering
        thread::sleep(std::time::Duration::from_secs(2));

        // Capture screenshot
        let png_data = match tab.capture_screenshot(
            headless_chrome::protocol::cdp::Page::CaptureScreenshotFormatOption::Png,
            None,
            None,
            true,
        ) {
            Ok(data) => data,
            Err(e) => {
                let _ = window.emit(
                    "screenshot-status",
                    ScreenshotStatus {
                        project: project_name,
                        status: "error".to_string(),
                        path: None,
                        message: Some(format!("Failed to capture screenshot: {}", e)),
                    },
                );
                return;
            }
        };

        // Save to file
        let screenshot_path = screenshots_dir.join(format!("{}.png", project_name));
        if let Err(e) = std::fs::write(&screenshot_path, png_data) {
            let _ = window.emit(
                "screenshot-status",
                ScreenshotStatus {
                    project: project_name,
                    status: "error".to_string(),
                    path: None,
                    message: Some(format!("Failed to save screenshot: {}", e)),
                },
            );
            return;
        }

        // Emit success
        let _ = window.emit(
            "screenshot-status",
            ScreenshotStatus {
                project: project_name,
                status: "finished".to_string(),
                path: Some(screenshot_path.to_string_lossy().to_string()),
                message: Some("Screenshot captured successfully".to_string()),
            },
        );
    });

    Ok(())
}

/// Get the path to a project's screenshot if it exists
#[tauri::command]
pub fn get_screenshot_path(
    app: tauri::AppHandle,
    project_name: String,
) -> Result<Option<String>, DdevError> {
    let screenshots_dir = get_screenshots_dir(&app)?;
    let screenshot_path = screenshots_dir.join(format!("{}.png", project_name));

    if screenshot_path.exists() {
        Ok(Some(screenshot_path.to_string_lossy().to_string()))
    } else {
        Ok(None)
    }
}

/// Get screenshot data as base64 for display in the webview
#[tauri::command]
pub fn get_screenshot_data(
    app: tauri::AppHandle,
    project_name: String,
) -> Result<Option<String>, DdevError> {
    use std::fs;
    use std::io::Read;

    let screenshots_dir = get_screenshots_dir(&app)?;
    let screenshot_path = screenshots_dir.join(format!("{}.png", project_name));

    if screenshot_path.exists() {
        let mut file = fs::File::open(&screenshot_path)
            .map_err(|e| DdevError::IoError(format!("Failed to open screenshot: {}", e)))?;

        let mut buffer = Vec::new();
        file.read_to_end(&mut buffer)
            .map_err(|e| DdevError::IoError(format!("Failed to read screenshot: {}", e)))?;

        use std::io::Write;
        let mut encoder = Vec::new();
        write!(encoder, "data:image/png;base64,").unwrap();

        // Base64 encode
        const BASE64_CHARS: &[u8] =
            b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

        for chunk in buffer.chunks(3) {
            let b0 = chunk[0] as usize;
            let b1 = chunk.get(1).copied().unwrap_or(0) as usize;
            let b2 = chunk.get(2).copied().unwrap_or(0) as usize;

            encoder.push(BASE64_CHARS[b0 >> 2]);
            encoder.push(BASE64_CHARS[((b0 & 0x03) << 4) | (b1 >> 4)]);

            if chunk.len() > 1 {
                encoder.push(BASE64_CHARS[((b1 & 0x0f) << 2) | (b2 >> 6)]);
            } else {
                encoder.push(b'=');
            }

            if chunk.len() > 2 {
                encoder.push(BASE64_CHARS[b2 & 0x3f]);
            } else {
                encoder.push(b'=');
            }
        }

        Ok(Some(String::from_utf8(encoder).unwrap()))
    } else {
        Ok(None)
    }
}

/// Delete a project's screenshot
#[tauri::command]
pub fn delete_screenshot(app: tauri::AppHandle, project_name: String) -> Result<(), DdevError> {
    let screenshots_dir = get_screenshots_dir(&app)?;
    let screenshot_path = screenshots_dir.join(format!("{}.png", project_name));

    if screenshot_path.exists() {
        std::fs::remove_file(&screenshot_path)
            .map_err(|e| DdevError::IoError(format!("Failed to delete screenshot: {}", e)))?;
    }

    Ok(())
}
