import {
  Avatar,
  Box,
  Button,
  IconButton,
  List,
  ListItem,
  ListItemSecondaryAction,
  ListItemText,
  Paper,
  Typography,
} from "@mui/material";
import TransferDialog from "../components/TransferDialog";
import { shortenAddress } from "../tools/address";
import { NATIVE_MINT, u64 } from "@solana/spl-token";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import { writeText } from "@tauri-apps/api/clipboard";
import { useState } from "react";
import { useWallet } from "../context/WalletProvider";
import { PublicKey } from "@solana/web3.js";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import { amountToUiAmount } from "../tools/token";
import { useWalletAccounts } from "../context/WalletAccountsProvider";

export default function Home() {
  const [openTransferDialog, setOpenTransferDialog] = useState(false);
  const [
    selectedTokenAccountWithTokenInfo,
    setSelectedTokenAccountWithTokenInfo,
  ] = useState<{
    tokenAccount: { address: PublicKey; mint: PublicKey; amount: u64 };
    tokenInfo?: {
      name: string;
      symbol: string;
      decimals: number;
      isSolana?: boolean;
    };
  }>();
  const { wallet } = useWallet();
  const {
    userBalance,
    tokenAccounts,
    filteredTokenAccounts,
    emptyTokenAccounts,
    tokenMap,
  } = useWalletAccounts();

  return (
    <>
      <Box p={2}>
        <Paper elevation={2} sx={{ width: "600px" }}>
          <Box p={2}>
            <IconButton
              size={"small"}
              onClick={() => writeText(wallet?.publicKey.toBase58() ?? "")}
            >
              {wallet?.publicKey.toBase58()}
              <ContentCopyIcon />
            </IconButton>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
              m={1}
            >
              <Avatar src="https://spl-token-icons.static-assets.ship.capital/icons/101/So11111111111111111111111111111111111111112.png" />
              <Typography color="primary" variant="h5">
                {`${
                  userBalance !== undefined
                    ? //@ts-ignore
                      amountToUiAmount(new u64(userBalance), 9)
                    : "N.A."
                } (SOL)`}
              </Typography>
              {wallet && (
                <Button
                  variant="contained"
                  onClick={(e) => {
                    setSelectedTokenAccountWithTokenInfo({
                      tokenAccount: {
                        address: wallet.publicKey,
                        mint: NATIVE_MINT,
                        //@ts-ignore
                        amount: new u64(userBalance),
                      },
                      tokenInfo: {
                        name: "Solana",
                        symbol: "SOL",
                        decimals: 9,
                        isSolana: true,
                      },
                    });
                    setOpenTransferDialog(true);
                  }}
                >
                  Send
                </Button>
              )}
            </Box>
            <Typography>
              {tokenAccounts?.length ?? "N.A."} token accounts
            </Typography>
          </Box>
        </Paper>
      </Box>
      <List>
        {filteredTokenAccounts?.map((tokenAccount) => {
          const mintBase58 = tokenAccount.mint.toBase58();
          const tokenInfo = tokenMap?.get(mintBase58);
          const decimals = tokenInfo?.decimals;
          const symbol = tokenMap?.get(mintBase58)?.symbol ?? "raw";

          const uiAmount = amountToUiAmount(tokenAccount.amount, decimals);

          return (
            <ListItem divider key={mintBase58}>
              <Box m={1}>
                <Avatar src={tokenInfo?.logoURI} />
              </Box>
              <ListItemText
                primary={
                  tokenMap?.get(mintBase58)?.name || shortenAddress(mintBase58)
                }
                secondary={`${uiAmount} ${symbol}`}
                secondaryTypographyProps={{
                  variant: "body1",
                  color: "primary",
                }}
              />
              <ListItemSecondaryAction>
                <Box display="inline-block" m={1}>
                  {tokenAccount.usdValue >= 0.01 && (
                    <Typography>${tokenAccount.usdValue.toFixed(2)}</Typography>
                  )}
                </Box>
                <Button
                  variant="contained"
                  onClick={() => {
                    setSelectedTokenAccountWithTokenInfo({
                      tokenAccount,
                      tokenInfo,
                    });
                    setOpenTransferDialog(true);
                  }}
                >
                  Send
                </Button>
                <IconButton>
                  <MoreVertIcon />
                </IconButton>
              </ListItemSecondaryAction>
            </ListItem>
          );
        })}
        {emptyTokenAccounts?.length && (
          <Button variant="outlined">
            {emptyTokenAccounts?.length} empty token accounts
          </Button>
        )}
      </List>
      {openTransferDialog && selectedTokenAccountWithTokenInfo && (
        <TransferDialog
          open={openTransferDialog}
          onClose={() => setOpenTransferDialog(false)}
          tokenAccountWithTokenInfo={selectedTokenAccountWithTokenInfo}
        />
      )}
    </>
  );
}
