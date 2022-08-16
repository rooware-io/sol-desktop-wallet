import {
  Alert,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Link,
  TextField,
  Typography,
} from "@mui/material";
import { Token, TOKEN_PROGRAM_ID, u64 } from "@solana/spl-token";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { useMemo, useState } from "react";
import { useWallet } from "../context/WalletProvider";
import { shortenAddress } from "../tools/address";
import {
  amountToUiAmount,
  createIdempotentAssociatedTokenAccountInstruction,
  getAssociatedTokenAccountAddress,
  uiAmountToAmount,
} from "../tools/token";

/**
 * Create idempotent and transfer checked
 */
async function createTokenTransferInstructions(
  user: PublicKey,
  recipient: PublicKey,
  tokenAccount: { mint: PublicKey; address: PublicKey },
  amount: u64,
  decimals: number
) {
  const recipientAta = await getAssociatedTokenAccountAddress({
    owner: recipient,
    mint: tokenAccount.mint,
  });

  const createIdempotentIx = createIdempotentAssociatedTokenAccountInstruction({
    payer: user,
    ata: recipientAta,
    owner: recipient,
    mint: tokenAccount.mint,
  });
  const transferCheckedIx = Token.createTransferCheckedInstruction(
    TOKEN_PROGRAM_ID,
    tokenAccount.address,
    tokenAccount.mint,
    recipientAta,
    user,
    [],
    amount,
    decimals
  );

  return [createIdempotentIx, transferCheckedIx];
}

export default function TransferDialog({
  open,
  onClose,
  tokenAccountWithTokenInfo: { tokenAccount, tokenInfo },
}: {
  open: boolean;
  onClose: () => void;
  tokenAccountWithTokenInfo: {
    tokenAccount: { address: PublicKey; mint: PublicKey; amount: u64 };
    tokenInfo?: {
      name: string;
      symbol: string;
      decimals: number;
      isSolana?: boolean;
    };
  };
}) {
  const [sending, setSending] = useState(false);
  const [previousTransfers, setPreviousTransfers] = useState<
    { signature: string; uiAmount: string; uiRecipient: string }[]
  >([]);
  const [uiRecipient, setUiRecipient] = useState<string>("");
  const [uiAmount, setUiAmount] = useState<string>("");

  // Careful here won't update when invalid
  const amount = useMemo(() => {
    try {
      return uiAmountToAmount(uiAmount, tokenInfo?.decimals);
    } catch {
      return;
    }
  }, [uiAmount, tokenInfo?.decimals]);

  const { wallet } = useWallet();

  // Eventually all tokens will have token info, by querying their mint
  if (!tokenInfo || !wallet) return <>Invalid</>;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      aria-labelledby="modal-modal-title"
      aria-describedby="modal-modal-description"
    >
      <DialogTitle>
        <Typography>Send {tokenInfo.symbol}</Typography>
      </DialogTitle>
      <DialogContent>
        <TextField
          fullWidth
          variant="outlined"
          margin="normal"
          value={uiRecipient}
          onChange={(e) => setUiRecipient(e.target.value)}
          label="Recipient"
        ></TextField>
        <TextField
          fullWidth
          variant="outlined"
          margin="normal"
          type="number"
          value={uiAmount}
          onChange={(e) => setUiAmount(e.target.value)}
          helperText={`You have ${amountToUiAmount(
            tokenAccount.amount,
            tokenInfo.decimals
          )} (${tokenInfo.symbol})`}
          label="Amount"
        ></TextField>
        {previousTransfers?.map((previousTransfer, index) => (
          <Alert severity="success" key={index}>
            Successfully sent {previousTransfer.uiAmount} to{" "}
            {shortenAddress(previousTransfer.uiRecipient)}{" "}
            <Link
              target="_blank"
              href={`https://explorer.solana.com/tx/${previousTransfer.signature}`}
            >
              Link
            </Link>
          </Alert>
        ))}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          onClick={async () => {
            if (!amount) return;
            const recipient = new PublicKey(uiRecipient);

            const ixs = tokenInfo.isSolana
              ? [
                  SystemProgram.transfer({
                    fromPubkey: wallet.publicKey,
                    toPubkey: recipient,
                    //@ts-ignore
                    lamports: amount.toNumber(),
                  }),
                ]
              : await createTokenTransferInstructions(
                  wallet.publicKey,
                  recipient,
                  tokenAccount,
                  amount,
                  tokenInfo.decimals
                );

            setSending(true);
            const signature = await wallet.sendInstructions(ixs);
            setSending(false);

            setPreviousTransfers([
              ...previousTransfers,
              { signature, uiAmount, uiRecipient },
            ]);
            setUiAmount("");
            console.log(`Sent and confirmed tx: ${signature}`);
          }}
          disabled={sending}
        >
          {sending ? <CircularProgress size="2em" /> : "Send"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
