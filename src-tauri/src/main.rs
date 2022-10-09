#![cfg_attr(
  all(not(debug_assertions), target_os = "windows"),
  windows_subsystem = "windows"
)]

use anyhow::Result;
use tauri::{LogicalSize, Manager, Position, Size, Window, Wry};

fn setup_window_dimensions(window: &Window<Wry>) -> Result<()> {
    if let Some(monitor) = Window::current_monitor(&window)? {
        window.set_size(Size::Logical(LogicalSize {
            width: 800.0,
            height: monitor.size().height.try_into().unwrap(),
        }))?;
        window.set_position(Position::Physical(tauri::PhysicalPosition {
            x: monitor
                .position()
                .x
                .checked_add(monitor.size().width.try_into().unwrap())
                .unwrap()
                .checked_sub(window.outer_size().unwrap().width.try_into().unwrap())
                .unwrap()
                .try_into()
                .unwrap(),
            y: monitor.position().y.try_into().unwrap(),
        }))?;
    }
    Ok(())
}
fn main() {
  tauri::Builder::default()
        .setup(|app| {
            let main_window = app.get_window("main").unwrap();
            setup_window_dimensions(&main_window)
                .unwrap_or_else(|err| println!("Failed to set window size/position: {}", err));
            Ok(())
        })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
