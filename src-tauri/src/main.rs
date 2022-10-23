#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

mod account_store;
mod api;

use account_store::SavedAccountsStore;
use anyhow::Result;
use api::*;
use std::fs;
use tauri::{LogicalSize, Manager, PathResolver, Position, Size, Window, Wry};
use tauri_plugin_fs_watch::Watcher;

fn setup_folders(path_resolver: &PathResolver) -> Result<()> {
    let app_dir = path_resolver.app_dir().unwrap();
    let keypairs_folder = app_dir.join("keypairs");
    fs::create_dir_all(keypairs_folder)?;
    let mnemonics_folder = app_dir.join("mnemonics");
    fs::create_dir_all(mnemonics_folder)?;
    SavedAccountsStore::create_if_missing(app_dir)?;
    Ok(())
}

fn setup_window_dimensions(window: &Window<Wry>) -> tauri::Result<()> {
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
        .plugin(tauri_plugin_store::PluginBuilder::default().build())
        .plugin(Watcher::default())
        .setup(|app| {
            #[cfg(debug_assertions)]
            {
                let window = app.get_window("main").unwrap();
                window.open_devtools();
            }
            setup_folders(&app.path_resolver())?;
            let main_window = app.get_window("main").unwrap();
            setup_window_dimensions(&main_window)
                .unwrap_or_else(|err| println!("Failed to set window size/position: {}", err));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            import_keypair,
            generate_mnemonic,
            save_mnemonic,
            get_all_accounts,
            add_child_account
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
