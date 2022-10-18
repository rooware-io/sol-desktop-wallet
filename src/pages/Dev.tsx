import {
  Button,
  CircularProgress,
  Link,
  List,
  ListItem,
  TextareaAutosize,
  Typography,
} from "@mui/material";
import { useEffect, useState } from "react";
import {
  AddressLookupTableAccount,
  sendAndConfirmRawTransaction,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import { useConnection } from "../context/ConnectionProvider";
import { useWallet } from "../context/WalletProvider";
import base58 from "bs58";

export default function Dev() {
  const [rawTransaction, setRawTransaction] = useState<string>("");
  const [rawTransactionError, setRawTransactionError] = useState<string>();
  const [sendTransactionError, setSendTransactionError] = useState<string>();
  const [txData, setTxData] = useState<{
    versionedTransaction: VersionedTransaction;
    transactionMessage: TransactionMessage;
  }>();
  const [signature, setSignature] = useState<string>();
  const [sending, setSending] = useState(false);
  const { connection } = useConnection();
  const { wallet } = useWallet();

  useEffect(() => {
    async function update() {
      setRawTransactionError(undefined);
      setSendTransactionError(undefined);
      setTxData(undefined);
      if (rawTransaction === "") return;

      try {
        setRawTransactionError(undefined);
        setSendTransactionError(undefined);
        const versionedTransaction = VersionedTransaction.deserialize(
          Buffer.from(rawTransaction, "base64")
        );
        const addressLookupTableAccountInfos =
          await connection.getMultipleAccountsInfo(
            versionedTransaction.message.addressTableLookups.map(
              ({ accountKey }) => accountKey
            )
          );
        const addressLookupTableAccounts = addressLookupTableAccountInfos.map(
          (accountInfo, index) => {
            const key =
              versionedTransaction.message.addressTableLookups[index]
                .accountKey;
            if (!accountInfo)
              throw new Error(
                `Missing address lookup table account ${key.toBase58()}`
              );
            return new AddressLookupTableAccount({
              key,
              state: AddressLookupTableAccount.deserialize(accountInfo.data),
            });
          }
        );
        const transactionMessage = TransactionMessage.decompile(
          versionedTransaction.message,
          { addressLookupTableAccounts }
        );
        setTxData({ versionedTransaction, transactionMessage });
      } catch (e) {
        console.error(e);
        setRawTransactionError(`${e}`);
      }
    }

    update();
  }, [rawTransaction]);

  return (
    <>
      <div>
        <Button onClick={() => setRawTransaction("")}>Clear</Button>
        <TextareaAutosize
          aria-label="empty textarea"
          placeholder="base64 serialized transaction"
          value={rawTransaction}
          onChange={(e) => setRawTransaction(e.target.value)}
          minRows={5}
          style={{ width: 600 }}
        />
        {rawTransactionError && <span>{rawTransactionError}</span>}
      </div>
      <div>
        {/* <Button>Simulate</Button> */}
        <Button
          disabled={
            !txData ||
            !wallet?.publicKey.equals(txData.transactionMessage.payerKey) ||
            sending
          }
          onClick={async () => {
            if (!wallet || !txData) return;
            setSending(true);
            setSendTransactionError(undefined);
            const { lastValidBlockHeight, blockhash } =
              await connection.getLatestBlockhash();
            let versionedTransaction = txData.versionedTransaction;
            versionedTransaction.message.recentBlockhash = blockhash;

            try {
              versionedTransaction = wallet.signTransaction(
                txData.versionedTransaction
              );
              const signature = await sendAndConfirmRawTransaction(
                connection,
                Buffer.from(versionedTransaction.serialize()),
                {
                  signature: base58.encode(versionedTransaction.signatures[0]),
                  lastValidBlockHeight,
                  blockhash,
                }
              );
              setSignature(signature);
              console.log(`Sent and confirmed tx: ${signature}`);
            } catch (e: any) {
              console.error(e);
              setSendTransactionError(`${e}`);
            }
            setSending(false);
          }}
        >
          {sending ? <CircularProgress size="2em" /> : "Sign and Send"}
        </Button>
        {signature && (
          <Link
            target="_blank"
            href={`https://explorer.solana.com/tx/${signature}`}
          >
            Tx {signature}
          </Link>
        )}
        {sendTransactionError && <div>{sendTransactionError}</div>}
      </div>
      <div>
        {txData?.transactionMessage.instructions.map((instruction, index) => (
          <>
            <Typography>Instruction #{index}</Typography>
            <Typography>
              Program ID:{" "}
              <Link
                target="_blank"
                href={`https://explorer.solana.com/account/${instruction.programId.toBase58()}`}
              >
                {instruction.programId.toBase58()}
              </Link>
            </Typography>
            <List>
              {instruction.keys.map(
                ({ pubkey, isSigner, isWritable }, index) => {
                  const pubkeyBase58 = pubkey.toBase58();
                  return (
                    <ListItem key={index}>
                      <Link
                        target="_blank"
                        href={`https://explorer.solana.com/account/${pubkeyBase58}`}
                      >
                        {pubkeyBase58}
                      </Link>{" "}
                      {isSigner ? "s" : "-"}
                      {isWritable ? "w" : "-"}
                    </ListItem>
                  );
                }
              )}
            </List>
            <Typography>
              data (base64): {instruction.data.toString("base64")}
            </Typography>
          </>
        ))}
      </div>
    </>
  );
}
