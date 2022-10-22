#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]
mod config;

use anyhow::Result;
use bip39::{Language, Mnemonic, MnemonicType};
use config::{KeypairAccount, SavedAccountsStore, StoredMnemonic};
use serde::{Deserialize, Serialize};
use std::{collections::HashMap, fs, path::PathBuf, str::FromStr};
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

fn get_language(language: &str) -> Language {
    match language {
        "english" => Language::English,
        "chinese-simplified" => Language::ChineseSimplified,
        "chinese-traditional" => Language::ChineseTraditional,
        "japanese" => Language::Japanese,
        "spanish" => Language::Spanish,
        "korean" => Language::Korean,
        "french" => Language::French,
        "italian" => Language::Italian,
        _ => unreachable!(),
    }
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

#[tauri::command]
fn import_keypair(app_handle: tauri::AppHandle, keypair_path: &str) -> Result<(), String> {
    let mut account_store = SavedAccountsStore::load(app_handle.path_resolver().app_dir().unwrap())
        .map_err(|err| format!("Failed to load accounts store: {}", err.to_string()))?;
    let keypair_path = PathBuf::from_str(keypair_path)
        .map_err(|err| format!("Failed to open keypair path: {}", err.to_string()))?;
    account_store
        .store_keypair_account(&keypair_path)
        .map_err(|err| format!("Failed to add keypair: {}", err.to_string()))?;
    Ok(())
}

#[derive(Serialize, Deserialize, Debug)]
struct CreateMnemonicResponse {
    phrase: String,
}

#[derive(Serialize, Deserialize, Debug, Default)]
pub enum DerivationType {
    Bip44,
    #[default]
    Bip44WithChange,
}

#[tauri::command]
fn generate_mnemonic(/* language: &str */) -> Result<CreateMnemonicResponse, String> {
    let new_mnemonic = Mnemonic::new(MnemonicType::Words24, get_language("english")); // TODO: Support more languages
    Ok(CreateMnemonicResponse {
        phrase: new_mnemonic.phrase().to_string(),
    })
}

#[tauri::command]
fn save_mnemonic(
    app_handle: tauri::AppHandle,
    phrase: String,
    derivation_type: DerivationType,
) -> Result<(), String> {
    let mut account_store = SavedAccountsStore::load(app_handle.path_resolver().app_dir().unwrap())
        .map_err(|err| format!("Failed to load accounts store: {}", err.to_string()))?;
    account_store
        .store_mnemonic(phrase, derivation_type)
        .map_err(|err| format!("Failed to add mnemonic: {}", err.to_string()))?;
    Ok(())
}

#[tauri::command]
fn add_child_account(
    app_handle: tauri::AppHandle,
    base_address: String,
    child_index: Option<u32>,
) -> Result<(), String> {
    let mut account_store = SavedAccountsStore::load(app_handle.path_resolver().app_dir().unwrap())
        .map_err(|err| format!("Failed to load accounts store: {}", err.to_string()))?;
    account_store
        .add_child_account(base_address, child_index)
        .map_err(|err| format!("Failed to add child account: {}", err.to_string()))?;
    Ok(())
}

#[derive(Serialize, Deserialize, Debug)]
struct GetAllAccountsResponse {
    pub keypair: HashMap<String, KeypairAccount>,
    pub mnemonic: HashMap<String, StoredMnemonic>,
}

#[tauri::command]
fn get_all_accounts(app_handle: tauri::AppHandle) -> Result<GetAllAccountsResponse, String> {
    let account_store = SavedAccountsStore::load(app_handle.path_resolver().app_dir().unwrap())
        .map_err(|err| format!("Failed to load accounts store: {}", err.to_string()))?;
    Ok(GetAllAccountsResponse {
        keypair: account_store.keypair,
        mnemonic: account_store.mnemonic,
    })
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
