#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use anyhow::Result;
use solana_sdk::{signature::read_keypair_file, signer::Signer};
use std::{fs, path::Path};
use tauri::{LogicalSize, Manager, PathResolver, Position, Size, Window, Wry};
use tauri_plugin_fs_watch::Watcher;

fn setup_folders(path_resolver: &PathResolver) -> Result<()> {
    let app_dir = path_resolver.app_dir().unwrap();
    let to_create = app_dir.join("keypairs");
    if !Path::new(&to_create).exists() {
        fs::create_dir_all(to_create)?;
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
fn import_keypair(app_handle: tauri::AppHandle, keypair_path: &str) -> Result<(), String> {
    let keypair = read_keypair_file(keypair_path)
        .expect(format!("Failed to read keypair file: {}", keypair_path).as_str());
    let target_path = app_handle
        .path_resolver()
        .app_dir()
        .unwrap()
        .join(format!("keypairs/{}.json", keypair.pubkey()));
    fs::copy(keypair_path, &target_path).or(Err(format!(
        "Failed to copy {} to {}",
        keypair_path,
        target_path.to_str().unwrap()
    )))?;
    Ok(())
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_store::PluginBuilder::default().build())
        .plugin(Watcher::default())
        .setup(|app| {
            setup_folders(&app.path_resolver())?;
            let main_window = app.get_window("main").unwrap();
            setup_window_dimensions(&main_window)
                .unwrap_or_else(|err| println!("Failed to set window size/position: {}", err));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![import_keypair])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
