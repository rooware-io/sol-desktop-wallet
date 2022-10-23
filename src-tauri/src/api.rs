use crate::account_store::{
    AccountType, DerivationType, KeypairAccount, SavedAccountsStore, StoredMnemonic,
};
use bip39::{Language, Mnemonic, MnemonicType};
use serde::{Deserialize, Serialize};
use solana_sdk::{
    derivation_path::DerivationPath,
    signature::{
        generate_seed_from_seed_phrase_and_passphrase, keypair_from_seed_and_derivation_path,
        read_keypair_file, Keypair,
    },
    transaction::Transaction,
};
use std::{collections::HashMap, fs, path::PathBuf, str::FromStr};

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
pub fn sign_transaction(
    app_handle: tauri::AppHandle,
    transaction_serialized: String,
    account_address: String,
    account_type: AccountType,
) -> Result<SignTransactionResponse, String> {
    let account_store = SavedAccountsStore::load(app_handle.path_resolver().app_dir().unwrap())
        .map_err(|err| format!("Failed to load accounts store: {}", err.to_string()))?;
    let mut transaction: Transaction =
        bincode::deserialize(base64::decode(transaction_serialized).unwrap().as_slice()).unwrap();
    // Find account using type and address
    let signer = match account_type {
        AccountType::ImportedKeypair => {
            let account = account_store.keypair.get(&account_address);
            if let Some(account) = account {
                let target_path = account_store
                    .app_dir
                    .join(format!("keypairs/{}", account.filename));
                read_keypair_file(target_path).unwrap()
            } else {
                return Err(format!("Account {} not found in store.", account_address));
            }
        }
        AccountType::MnemonicDerived {
            mnemonic_base_address,
        } => {
            let mnemonic = account_store
                .mnemonic
                .get(&mnemonic_base_address)
                .expect(format!("Mnemonic {} not found in store.", mnemonic_base_address).as_str());
            let account = mnemonic.accounts.get(&account_address).expect(
                format!(
                    "Account {} not found in mnemonic {}.",
                    account_address, mnemonic_base_address
                )
                .as_str(),
            );
            let derivation_path = match mnemonic.derivation_type {
                DerivationType::Bip44 => DerivationPath::new_bip44(Some(account.child_index), None),
                DerivationType::Bip44WithChange => {
                    DerivationPath::new_bip44(Some(account.child_index), Some(0))
                }
            };
            let mnemonic_path = account_store
                .app_dir
                .join(format!("mnemonics/{}", mnemonic.location));
            let mnemonic_phrase = fs::read_to_string(&mnemonic_path)
                .expect(format!("Mnemonic file {:?} not found.", mnemonic_path).as_str());
            let seed =
                generate_seed_from_seed_phrase_and_passphrase(&mnemonic_phrase.to_string(), "");
            keypair_from_seed_and_derivation_path(&seed, Some(derivation_path))
                .expect(format!("Could not compute keypair from mnemonic.").as_str())
        }
    };
    transaction.partial_sign(&[&signer], transaction.message.recent_blockhash);
    let signed_transaction = base64::encode(bincode::serialize(&transaction).unwrap());
    Ok(SignTransactionResponse { signed_transaction })
}
