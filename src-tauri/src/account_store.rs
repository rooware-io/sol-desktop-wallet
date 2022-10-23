use anyhow::{anyhow, bail, Result};
use names::Generator;
use serde::{Deserialize, Serialize};
use solana_sdk::derivation_path::DerivationPath;
use solana_sdk::signature::{
    generate_seed_from_seed_phrase_and_passphrase, keypair_from_seed_and_derivation_path, Signer,
};
use solana_sdk::{pubkey::Pubkey, signature::read_keypair_file};
use std::{
    collections::HashMap,
    fs::{self, File},
    io::{self, Write},
    path::PathBuf,
};

#[derive(Debug, Serialize, Deserialize)]
pub struct KeypairAccount {
    pub label: String,
    pub address: Pubkey,
    pub filename: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct MnemonicAccount {
    pub label: String,
    pub address: String,
    pub derivation_index: u32,
    pub change: u32,
}

#[derive(Serialize, Deserialize, Debug, Default)]
pub enum DerivationType {
    Bip44,
    #[default]
    Bip44WithChange,
}

#[derive(Default, Debug, Serialize, Deserialize)]
pub struct StoredMnemonic {
    pub label: String,
    pub location: String,
    pub base_address: String,
    pub accounts: HashMap<String, MnemonicAccount>,
    pub derivation_type: DerivationType,
}

#[derive(Default, Debug, Serialize, Deserialize)]
pub struct SavedAccountsStore {
    #[serde(skip)]
    app_dir: PathBuf,
    #[serde(skip)]
    account_store_file: PathBuf,
    pub keypair: HashMap<String, KeypairAccount>,
    pub mnemonic: HashMap<String, StoredMnemonic>,
}

impl SavedAccountsStore {
    const ACCOUNT_STORE_FILENAME: &str = "account_store.json";

    pub fn load(app_dir: PathBuf) -> Result<Self> {
        let account_store_file = app_dir.join(Self::ACCOUNT_STORE_FILENAME);
        let file = File::open(account_store_file)?;
        let mut config: Self = serde_json::from_reader(file)
            .map_err(|err| io::Error::new(io::ErrorKind::Other, format!("{:?}", err)))?;
        config.app_dir = app_dir.clone();
        config.account_store_file = app_dir.join(Self::ACCOUNT_STORE_FILENAME);
        Ok(config)
    }

    pub fn new(app_dir: PathBuf) -> Result<Self> {
        let account_store_file = app_dir.join(Self::ACCOUNT_STORE_FILENAME);
        Ok(Self {
            app_dir: app_dir.clone(),
            account_store_file,
            keypair: HashMap::default(),
            mnemonic: HashMap::default(),
        })
    }

    fn save(&self) -> Result<()> {
        let account_store_str = serde_json::to_string(self).unwrap();
        let mut f = File::create(&self.account_store_file)?;
        f.write_all(account_store_str.as_bytes())?;
        Ok(())
    }

    pub fn create_if_missing(app_dir: PathBuf) -> Result<()> {
        let account_store_file = app_dir.join(Self::ACCOUNT_STORE_FILENAME);
        if !account_store_file.exists() {
            let new_store = Self::new(app_dir)?;
            new_store.save()?;
        }
        Ok(())
    }

    pub fn store_keypair_account(&mut self, keypair_path: &PathBuf) -> Result<()> {
        let keypair = read_keypair_file(keypair_path)
            .expect(format!("Failed to read keypair file: {:?}", keypair_path).as_str());
        let pubkey = keypair.pubkey();
        if self.keypair.contains_key(&pubkey.to_string()) {
            bail!("Account {} was already imported", pubkey);
        }
        let target_path = self.app_dir.join(format!("keypairs/{}.json", pubkey));
        fs::copy(keypair_path, &target_path).or_else(|_| {
            bail!(
                "Failed to copy {:?} to {}",
                keypair_path,
                target_path.to_str().unwrap(),
            )
        })?;
        let mut generator = Generator::default();
        self.keypair.insert(
            pubkey.to_string(),
            KeypairAccount {
                label: generator.next().unwrap(),
                address: pubkey,
                filename: format!("{}.json", pubkey),
            },
        );
        self.save()?;
        Ok(())
    }

    pub fn store_mnemonic(
        &mut self,
        mnemonic_phrase: String,
        derivation_type: DerivationType,
    ) -> Result<()> {
        let derivation_path = match derivation_type {
            DerivationType::Bip44 => DerivationPath::new_bip44(Some(0), None),
            DerivationType::Bip44WithChange => DerivationPath::new_bip44(Some(0), Some(0)),
        };
        let seed = generate_seed_from_seed_phrase_and_passphrase(&mnemonic_phrase.to_string(), "");
        let keypair = keypair_from_seed_and_derivation_path(&seed, Some(derivation_path))
            .map_err(|err| anyhow!(err.to_string()))?;
        let pubkey = keypair.pubkey();
        if self.mnemonic.contains_key(&pubkey.to_string()) {
            bail!("Mnemonic with base account {} was already imported", pubkey);
        }

        let target_file = format!("{}.txt", pubkey);
        let target_path = self.app_dir.join(format!("mnemonics/{}", target_file));
        let mut f = File::create(&target_path)?;
        f.write_all(mnemonic_phrase.as_bytes())?;

        let mut generator = Generator::default();
        let mut initial_mnemonic_accounts = HashMap::new();
        initial_mnemonic_accounts.insert(
            pubkey.to_string(),
            MnemonicAccount {
                address: pubkey.to_string(),
                label: generator.next().unwrap(),
                derivation_index: 0,
                change: 0,
            },
        );

        self.mnemonic.insert(
            pubkey.to_string(),
            StoredMnemonic {
                label: generator.next().unwrap(),
                base_address: pubkey.to_string(),
                location: format!("{}.txt", pubkey),
                accounts: initial_mnemonic_accounts,
                derivation_type,
            },
        );
        self.save()?;
        Ok(())
    }

    pub fn add_child_account(
        &mut self,
        base_address: String,
        child_index: Option<u32>,
    ) -> Result<()> {
        let mnemonic = self.mnemonic.get_mut(&base_address).unwrap();
        // if let Some(mnemonic) = mnemonic {
        let child_index = child_index.unwrap_or_else(|| {
            let mut indices: Vec<u32> = mnemonic
                .accounts
                .iter()
                .map(|(_, account)| account.derivation_index)
                .collect();
            indices.sort();
            for i in 0..indices.len() {
                if indices[i] != i as u32 {
                    return i as u32;
                }
            }
            indices.len() as u32
        });

        let derivation_path = match mnemonic.derivation_type {
            DerivationType::Bip44 => DerivationPath::new_bip44(Some(child_index), None),
            DerivationType::Bip44WithChange => {
                DerivationPath::new_bip44(Some(child_index), Some(0))
            }
        };
        let mnemonic_path = self
            .app_dir
            .join(format!("mnemonics/{}", mnemonic.location));
        let mnemonic_phrase = fs::read_to_string(&mnemonic_path)?;
        let seed = generate_seed_from_seed_phrase_and_passphrase(&mnemonic_phrase, "");
        let keypair = keypair_from_seed_and_derivation_path(&seed, Some(derivation_path))
            .map_err(|err| anyhow!(err.to_string()))?;
        let pubkey = keypair.pubkey();
        if mnemonic.accounts.contains_key(&pubkey.to_string()) {
            bail!("Mnemonic with base account {} was already imported", pubkey);
        }

        let target_file = format!("{}.txt", pubkey);
        let target_path = self.app_dir.join(format!("mnemonics/{}", target_file));
        let mut f = File::create(&target_path)?;
        f.write_all(mnemonic_phrase.as_bytes())?;

        let mut generator = Generator::default();
        mnemonic.accounts.insert(
            pubkey.to_string(),
            MnemonicAccount {
                address: pubkey.to_string(),
                label: generator.next().unwrap(),
                derivation_index: child_index,
                change: 0,
            },
        );
        self.save()?;
        // } else {
        //     bail!("Mnemonic with base address {} not found", base_address)
        // }
        Ok(())
    }
}
