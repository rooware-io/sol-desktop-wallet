import { PublicKey } from "@solana/web3.js";
import { invoke } from "@tauri-apps/api";
import { open } from "@tauri-apps/api/dialog";

async function importKeypair() {
  const keypairPath = (await open({
    filters: [
      {
        name: "JSON",
        extensions: ["json"],
      },
    ],
  })) as string;
  await invoke<void>("import_keypair", { keypairPath });
}

interface CreateMnemonicResponse {
  phrase: string;
}

async function generateMnemonic(): Promise<CreateMnemonicResponse> {
  const mnemonicDefaultId = await invoke<CreateMnemonicResponse>(
    "generate_mnemonic",
    { derivationType: "Bip44WithChange" }
  );
  return mnemonicDefaultId;
}

async function saveMnemonic(phrase: string): Promise<void> {
  await invoke<void>("save_mnemonic", {
    phrase,
    derivationType: "Bip44WithChange",
  });
}

async function addChildAccount(
  baseAddress: string,
  index?: number
): Promise<void> {
  await invoke<void>("add_child_account", {
    baseAddress,
    index,
  });
}

export interface KeypairAccount {
  label: string;
  address: string;
}

export interface StoredMnemonic {
  label: string;
  base_address: string;
  accounts: Map<string, MnemonicAccount>;
}

export interface MnemonicAccount {
  label: string;
  address: string;
  mnemonic_label: string;
}

export interface AccountStore {
  keypair: Record<string, KeypairAccount>;
  mnemonic: Record<string, StoredMnemonic>;
}

async function loadAccounts(): Promise<AccountStore> {
  const accounts = await invoke<AccountStore>("get_all_accounts");
  return accounts;
}

export {
  importKeypair,
  generateMnemonic,
  saveMnemonic,
  addChildAccount,
  loadAccounts,
};
