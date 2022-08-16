import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
} from "@mui/material";
import { useEffect, useState } from "react";

const sessionIdRegex = new RegExp(/nightlyconnect\:([\w\-]+)\?/g);

export function NightlyConnectDialog({
  open,
  onClose,
  connected,
  setSessionId,
}: {
  open: boolean;
  onClose: () => void;
  connected: boolean;
  setSessionId: (sessionId: string | undefined) => void;
}) {
  const [qrCodeString, setQrCodeString] = useState<string>("");
  useEffect(() => {
    if (!qrCodeString) return;
    // Remove the unecessary bits, example:
    // nightlyconnect:blabla-blabla-blabal?network=SOLANA
    // Once this becomes a link we could just click it
    const execArray = sessionIdRegex.exec(qrCodeString);
    const sessionId = execArray ? execArray[1] : undefined;
    setSessionId(sessionId);
  }, [qrCodeString]);

  return (
    <Dialog open={open}>
      <DialogTitle>Sign request</DialogTitle>
      <DialogContent>
        <TextField
          fullWidth
          variant="outlined"
          margin="normal"
          value={qrCodeString}
          onChange={(e) => setQrCodeString(e.target.value)}
          label="Copy QR code"
        />
        {connected && <Alert>Connected</Alert>}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
