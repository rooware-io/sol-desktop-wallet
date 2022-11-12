import {
  Connection,
  PublicKey,
  PublicKeyInitData,
  Transaction,
  TransactionInstruction,
  VersionedTransaction,
} from "@solana/web3.js";
import {
  createContext,
  FC,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { signTransaction } from "../lib/api";
import { UserSettings, userSettingsStore } from "../pages/Settings";
import { useConnection } from "./ConnectionProvider";

class Wallet {
  publicKey: PublicKey;
  mnemonicBaseAddress: string | undefined;

  constructor(
    readonly connection: Connection,
    address: PublicKeyInitData,
    readonly type: walletType,
    mnemonicBaseAddress?: string
  ) {
    this.publicKey = new PublicKey(address);
    if (type === "MnemonicDerived" && !mnemonicBaseAddress)
      throw "Mnemonic base address needs to be provided for a mnemonic-based account";
    else this.mnemonicBaseAddress = mnemonicBaseAddress;
  }

  async sendInstructions(
    instructions: TransactionInstruction[]
  ): Promise<string> {
    const { blockhash, lastValidBlockHeight } =
      await this.connection.getLatestBlockhash();

    const tx = new Transaction({
      feePayer: this.publicKey,
      blockhash,
      lastValidBlockHeight,
    });
    tx.instructions = instructions;
    const signedTransaction = await this.signTransaction(tx);

    const signature = await this.connection.sendTransaction(signedTransaction);
    console.log(`Sent ${signature}`);

    await this.connection.confirmTransaction({
      blockhash,
      lastValidBlockHeight,
      signature,
    });

    return signature;
  }

  async sendTransaction(
    transaction: Transaction | VersionedTransaction
  ): Promise<string> {
    const { blockhash, lastValidBlockHeight } =
      await this.connection.getLatestBlockhash();

    const signedTransaction = await this.signTransaction(transaction);

    const signature = await this.connection.sendTransaction(signedTransaction);
    console.log(`Sent ${signature}`);

    await this.connection.confirmTransaction({
      blockhash,
      lastValidBlockHeight,
      signature,
    });

    return signature;
  }

  async signTransaction<T extends Transaction | VersionedTransaction>(
    transaction: T
  ): Promise<VersionedTransaction> {
    const transactionSerialized = await signTransaction(
      transaction,
      this.publicKey.toBase58(),
      this.type,
      this.mnemonicBaseAddress
    );
    const transactionBuffer = Buffer.from(transactionSerialized, "base64");
    return VersionedTransaction.deserialize(transactionBuffer);
  }
}

export type walletType = "ImportedKeypair" | "MnemonicDerived";

export interface SavedWallet {
  address: string;
  type: walletType;
  mnemonicBaseAddress: string;
}

const WalletContext = createContext<{
  wallet: Wallet | undefined;
  setWallet: (
    address: string,
    type: walletType,
    mnemonicBaseAddress?: string
  ) => void;
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
    async (address: string, type: walletType, mnemonicBaseAddress?: string) => {
      setWalletInternal(
        new Wallet(connection, address, type, mnemonicBaseAddress)
      );
      await userSettingsStore.set(UserSettings.WALLET, {
        address,
        type,
        mnemonicBaseAddress,
      } as SavedWallet);
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
            new Wallet(
              connection,
              savedWallet.address,
              savedWallet.type,
              savedWallet.mnemonicBaseAddress
            )
          );
        } catch {
          console.log(
            `Error while loading saved wallet ${savedWallet}. Clearing '${UserSettings.WALLET}' cache entry.`
          );
          await userSettingsStore.delete(UserSettings.WALLET);
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
