import {
  Connection,
  Keypair,
  PublicKey,
  PublicKeyInitData,
  Transaction,
  TransactionInstruction,
  VersionedTransaction,
} from "@solana/web3.js";
import { readTextFile, BaseDirectory } from "@tauri-apps/api/fs";
import {
  createContext,
  FC,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { UserSettings, userSettingsStore } from "../pages/Settings";
import { useConnection } from "./ConnectionProvider";

class Wallet {
  publicKey: PublicKey;

  constructor(
    readonly connection: Connection,
    address: PublicKeyInitData,
    readonly type: walletType
  ) {
    this.publicKey = new PublicKey(address);
  }

  async sendInstructions(instructions: TransactionInstruction[]) {
    const { blockhash, lastValidBlockHeight } =
      await this.connection.getLatestBlockhash();

    const tx = new Transaction({
      feePayer: this.publicKey,
      blockhash,
      lastValidBlockHeight,
    });
    tx.instructions = instructions;
    const signature = "TODO";
    console.log(`Sent ${signature}`);

    await this.connection.confirmTransaction({
      blockhash,
      lastValidBlockHeight,
      signature,
    });

    return signature;
  }

  async sendTransaction(): Promise<string> {
    throw new Error("Not implemented");
  }

  signTransaction<T extends Transaction | VersionedTransaction>(
    transaction: T
  ) {
    // if ("message" in transaction) {
    //   transaction.sign([this.keypair]);
    // } else {
    //   transaction.sign(this.keypair);
    // }
    return transaction;
  }
}

export type walletType = "importedKeypair" | "mnemonicDerived";

export interface SavedWallet {
  address: string;
  type: walletType;
}

const WalletContext = createContext<{
  wallet: Wallet | undefined;
  setWallet: (address: string, type: walletType) => void;
} | null>(null);

export function useWallet() {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error("WalletContext must be used with its provider");
  }
  return context;
}

const WalletProvider: FC<PropsWithChildren<{}>> = ({ children }) => {
  const [wallet, setWalletInternal] = useState<Wallet>();
  const { connection } = useConnection();

  const setWallet = useCallback(
    async (address: string, type: walletType) => {
      setWalletInternal(new Wallet(connection, address, type));
    },
    [connection]
  );

  useEffect(() => {
    (async function () {
      const savedWallet = await userSettingsStore.get<SavedWallet>(
        UserSettings.WALLET
      );
      if (savedWallet) {
        try {
          setWalletInternal(
            new Wallet(connection, savedWallet.address, savedWallet.type)
          );
        } catch {
          console.log(
            `Error while loading saved wallet ${savedWallet}. Clearing '${UserSettings.WALLET}' cache entry.`
          );
          userSettingsStore.delete(UserSettings.WALLET);
        }
      }
    })();
  }, []);

  return (
    <WalletContext.Provider
      value={{
        wallet,
        setWallet,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};

export default WalletProvider;
