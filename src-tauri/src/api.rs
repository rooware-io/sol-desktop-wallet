use crate::account_store::{DerivationType, KeypairAccount, SavedAccountsStore, StoredMnemonic};
use bip39::{Language, Mnemonic, MnemonicType};
use serde::{Deserialize, Serialize};
use std::{collections::HashMap, path::PathBuf, str::FromStr};

#[tauri::command]
pub fn import_keypair(app_handle: tauri::AppHandle, keypair_path: &str) -> Result<(), String> {
    let mut account_store = SavedAccountsStore::load(app_handle.path_resolver().app_dir().unwrap())
        .map_err(|err| format!("Failed to load accounts store: {}", err.to_string()))?;
    let keypair_path = PathBuf::from_str(keypair_path)
        .map_err(|err| format!("Failed to open keypair path: {}", err.to_string()))?;
    account_store
        .store_keypair_account(&keypair_path)
        .map_err(|err| format!("Failed to add keypair: {}", err.to_string()))?;
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

#[derive(Serialize, Deserialize, Debug)]
pub struct CreateMnemonicResponse {
    phrase: String,
}

#[tauri::command]
pub fn generate_mnemonic(/* language: &str */) -> Result<CreateMnemonicResponse, String> {
    let new_mnemonic = Mnemonic::new(MnemonicType::Words24, get_language("english")); // TODO: Support more languages
    Ok(CreateMnemonicResponse {
        phrase: new_mnemonic.phrase().to_string(),
    })
}

#[tauri::command]
pub fn save_mnemonic(
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
pub fn add_child_account(
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
pub struct GetAllAccountsResponse {
    pub keypair: HashMap<String, KeypairAccount>,
    pub mnemonic: HashMap<String, StoredMnemonic>,
}

#[tauri::command]
pub fn get_all_accounts(app_handle: tauri::AppHandle) -> Result<GetAllAccountsResponse, String> {
    let account_store = SavedAccountsStore::load(app_handle.path_resolver().app_dir().unwrap())
        .map_err(|err| format!("Failed to load accounts store: {}", err.to_string()))?;
    Ok(GetAllAccountsResponse {
        keypair: account_store.keypair,
        mnemonic: account_store.mnemonic,
    })
}

#[derive(Serialize, Deserialize, Debug)]
pub struct SignTransactionResponse {
    signed_transaction: String,
}

#[tauri::command]
pub fn sign_transaction(/* language: &str */) -> Result<SignTransactionResponse, String> {
    Ok(SignTransactionResponse {
        signed_transaction: String::new(),
    })
}
