#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use anyhow::Result;
use std::{fs, path::Path};
use tauri::{LogicalSize, Manager, PathResolver, Position, Size, Window, Wry};

fn setup_folders(path_resolver: &PathResolver) -> Result<()> {
    let app_dir = path_resolver.app_dir().unwrap();
    if !Path::new(&app_dir).exists() {
        fs::create_dir_all(app_dir)?;
    }
    Ok(())
}

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

#[tauri::command]
fn create_keypair_file() {
    println!("I was invoked from JS!");
}

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            setup_folders(&app.path_resolver())?;
            let main_window = app.get_window("main").unwrap();
            setup_window_dimensions(&main_window)
                .unwrap_or_else(|err| println!("Failed to set window size/position: {}", err));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![create_keypair_file])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
