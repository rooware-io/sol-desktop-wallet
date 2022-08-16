import {
  Keypair,
  PublicKey,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import { readTextFile, BaseDirectory } from "@tauri-apps/api/fs";
import {
  createContext,
  FC,
  PropsWithChildren,
  useContext,
  useEffect,
  useState,
} from "react";
import { connection } from "../config";

interface Wallet {
  label: string;
  publicKey: PublicKey;
  /** Handles setting up the transaction and assumes a single signer, the wallet */
  sendInstructions: (instructions: TransactionInstruction[]) => Promise<string>;
  sendTransaction: () => Promise<string>;
  signTransaction(transaction: Transaction): Transaction;
}

class FileSystemWallet implements Wallet {
  label = "keypair";

  constructor(private keypair: Keypair) {}

  get publicKey() {
    return this.keypair.publicKey;
  }

  async sendInstructions(instructions: TransactionInstruction[]) {
    const { blockhash, lastValidBlockHeight } =
      await connection.getLatestBlockhash();

    const tx = new Transaction({
      feePayer: this.keypair.publicKey,
      blockhash,
      lastValidBlockHeight,
    });
    tx.instructions = instructions;
    const signature = await connection.sendTransaction(tx, [this.keypair], {
      skipPreflight: false,
    });
    console.log(`Sent ${signature}`);

    await connection.confirmTransaction({
      blockhash,
      lastValidBlockHeight,
      signature,
    });

    return signature;
  }

  async sendTransaction(): Promise<string> {
    throw new Error("Not implemented");
  }

  signTransaction(transaction: Transaction): Transaction {
    transaction.sign(this.keypair);
    return transaction;
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

  useEffect(() => {
    async function setup() {
      const privateKey = new Uint8Array(
        JSON.parse(
          await readTextFile("keypair.json", { dir: BaseDirectory.App })
        )
      );
      const keypair = Keypair.fromSecretKey(privateKey);
      setWallet(new FileSystemWallet(keypair));
    }
    setup();
  }, []);

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
