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
  useState,
} from "react";
import { useConnection } from "./ConnectionProvider";

interface Wallet {
  label: string;
  publicKey: PublicKey;
  /** Handles setting up the transaction and assumes a single signer, the wallet */
  sendInstructions: (instructions: TransactionInstruction[]) => Promise<string>;
  sendTransaction: () => Promise<string>;
  signTransaction(transaction: Transaction): Transaction;
  signVersionedTransaction(
    versionedTransaction: VersionedTransaction
  ): VersionedTransaction;
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

  signTransaction(transaction: Transaction) {
    transaction.sign(this.keypair);
    return transaction;
  }

  signVersionedTransaction(versionedTransaction: VersionedTransaction) {
    versionedTransaction.sign([this.keypair]);
    return versionedTransaction;
  }
}

const WalletContext = createContext<{
  wallet: Wallet | undefined;
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

  useEffect(() => {
    async function setup() {
      const privateKey = new Uint8Array(
        JSON.parse(
          await readTextFile("keypair.json", { dir: BaseDirectory.App })
        )
      );
      const keypair = Keypair.fromSecretKey(privateKey);
      setWallet(new FileSystemWallet(connection, keypair));
    },
    [connection]
  );

  return (
    <WalletContext.Provider
      value={{
        wallet,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};

export default WalletProvider;
