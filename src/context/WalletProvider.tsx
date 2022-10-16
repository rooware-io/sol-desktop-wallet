import {
  Connection,
  Keypair,
  PublicKey,
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

interface Wallet {
  label: string;
  publicKey: PublicKey;
  /** Handles setting up the transaction and assumes a single signer, the wallet */
  sendInstructions: (instructions: TransactionInstruction[]) => Promise<string>;
  sendTransaction: () => Promise<string>;
  signTransaction<T extends Transaction | VersionedTransaction>(
    transaction: T
  ): T;
}

class FileSystemWallet implements Wallet {
  label = "keypair";

  constructor(readonly connection: Connection, private keypair: Keypair) {}

  get publicKey() {
    return this.keypair.publicKey;
  }

  async sendInstructions(instructions: TransactionInstruction[]) {
    const { blockhash, lastValidBlockHeight } =
      await this.connection.getLatestBlockhash();

    const tx = new Transaction({
      feePayer: this.keypair.publicKey,
      blockhash,
      lastValidBlockHeight,
    });
    tx.instructions = instructions;
    const signature = await this.connection.sendTransaction(
      tx,
      [this.keypair],
      {
        skipPreflight: false,
      }
    );
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
    if ("message" in transaction) {
      transaction.sign([this.keypair]);
    } else {
      transaction.sign(this.keypair);
    }
    return transaction;
  }
}

const WalletContext = createContext<{
  wallet: Wallet | undefined;
  setFileSystemWallet: (keypairFilename: string) => void;
} | null>(null);

export function useWallet() {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error("WalletContext must be used with its provider");
  }
  return context;
}

const WalletProvider: FC<PropsWithChildren<{}>> = ({ children }) => {
  const [wallet, setWallet] = useState<Wallet>();
  const { connection } = useConnection();

  const setFileSystemWallet = useCallback(
    async (fileName: string) => {
      const keypair = Keypair.fromSecretKey(
        new Uint8Array(
          JSON.parse(
            await readTextFile(`keypairs/${fileName}.json`, {
              dir: BaseDirectory.App,
            })
          )
        )
      );
      setWallet(new FileSystemWallet(connection, keypair));
    },
    [connection]
  );

  useEffect(() => {
    (async function () {
      const savedWallet = await userSettingsStore.get<string>(
        UserSettings.WALLET
      );
      if (savedWallet) {
        try {
          const keypair = Keypair.fromSecretKey(
            new Uint8Array(
              JSON.parse(
                await readTextFile(`keypairs/${savedWallet}.json`, {
                  dir: BaseDirectory.App,
                })
              )
            )
          );
          /* stored wallet might needs to specify what type it is to know what class to instantiate */
          setWallet(new FileSystemWallet(connection, keypair));
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
        setFileSystemWallet,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};

export default WalletProvider;
