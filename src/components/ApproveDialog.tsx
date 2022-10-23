import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Link,
  List,
  ListItem,
  Typography,
} from "@mui/material";
import { Transaction, VersionedTransaction } from "@solana/web3.js";
import { useWallet } from "../context/WalletProvider";

export function ApproveDialog({
  open,
  onClose,
  signRequest: { transaction, onApprove },
}: {
  open: boolean;
  onClose: () => void;
  signRequest: {
    transaction: Transaction;
    onApprove: (signedTransaction: VersionedTransaction) => void;
  };
}) {
  const { wallet } = useWallet();

  if (!wallet) return <>Invalid</>;

  return (
    <Dialog open={open}>
      <DialogTitle>Sign request</DialogTitle>
      <DialogContent>
        {transaction.instructions.map((instruction, index) => (
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
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Reject</Button>
        <Button
          onClick={async () => {
            const signedTransaction = await wallet.signTransaction(transaction);
            onApprove(signedTransaction);
          }}
          variant="contained"
        >
          Approve
        </Button>
      </DialogActions>
    </Dialog>
  );
}
