import { useEffect, useMemo, useState } from "react";
import "./App.css";
import {
  AppBar,
  Avatar,
  Box,
  Button,
  IconButton,
  List,
  ListItem,
  ListItemSecondaryAction,
  ListItemText,
  Paper,
  Stack,
  styled,
  Toolbar,
  Typography,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import {
  getUserTokenAccountsWithContext,
  amountToUiAmount,
  TokenAccount,
} from "./tools/token";
import { useQuery } from "@tanstack/react-query";
import { shortenAddress } from "./tools/address";
import { NATIVE_MINT, u64 } from "@solana/spl-token";
import AppDrawer, { DRAWER_WIDTH } from "./components/AppDrawer";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import TransferDialog from "./components/TransferDialog";
import { getTokenMap } from "./tools/token-map";
import { TokenInfo } from "@solana/spl-token-registry";
import { connection } from "./config";
import useUserBalance from "./hooks/useUserBalance";
import { PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import usePriceInfos from "./hooks/usePriceInfos";
import * as math from "mathjs";
import { writeText } from "@tauri-apps/api/clipboard";
import { useNightlyConnect } from "./context/NightlyConnectProvider";
import AddIcon from "@mui/icons-material/Add";
import CheckIcon from "@mui/icons-material/Check";
import { useWallet } from "./context/WalletProvider";

const Main = styled("main", { shouldForwardProp: (prop) => prop !== "open" })<{
  open?: boolean;
}>(({ theme, open }) => ({
  flexGrow: 1,
  padding: theme.spacing(3),
  transition: theme.transitions.create("margin", {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  marginLeft: `-${DRAWER_WIDTH}px`,
  ...(open && {
    transition: theme.transitions.create("margin", {
      easing: theme.transitions.easing.easeOut,
      duration: theme.transitions.duration.enteringScreen,
    }),
    marginLeft: 0,
  }),
}));

type TokenAccountWithValue = TokenAccount & {
  usdPrice: number;
  usdValue: number;
};

function App() {
  const [open, setOpen] = useState(false);
  const [openTransferDialog, setOpenTransferDialog] = useState(false);
  const [tokenMap, setTokenMap] = useState<Map<string, TokenInfo>>();
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

  const { setOpenConnectDialog, connected } = useNightlyConnect();
  const { wallet } = useWallet();
  const { data: userBalance } = useUserBalance(wallet?.publicKey);
  const { data: userTokenAccountsWithContext } = useQuery(
    ["token-accounts"],
    async () => {
      if (!wallet) return;
      return getUserTokenAccountsWithContext(connection, wallet.publicKey);
    },
    { refetchInterval: 5_000 }
  );
  const tokenAccounts = useMemo(() => {
    const newTokenAccounts =
      userTokenAccountsWithContext?.tokenAccounts.slice();
    newTokenAccounts?.sort((a, b) =>
      a.mint.toBase58().localeCompare(b.mint.toBase58())
    );
    return newTokenAccounts;
  }, [userTokenAccountsWithContext]);

  const { data: priceInfos } = usePriceInfos(
    tokenAccounts?.map(({ mint }) => mint.toBase58())
  );
  // Provide stable ordering for all based on token account value then mint string
  const [filteredTokenAccounts, emptyTokenAccounts] = useMemo(() => {
    const [nonEmptyTokenAccounts, emptyTokenAccounts] = tokenAccounts?.reduce<
      [TokenAccount[], TokenAccount[]]
    >(
      (acc, tokenAccount) => {
        //@ts-ignore
        if (tokenAccount.amount?.eq(new u64(0))) {
          acc[1].push(tokenAccount);
        } else {
          acc[0].push(tokenAccount);
        }
        return acc;
      },
      [[], []]
    ) ?? [undefined, undefined];

    // Attach price and value
    const nonEmptyTokenAccountsWithValue = nonEmptyTokenAccounts?.map(
      (nonEmptyTokenAccount) => {
        const mintBase58 = nonEmptyTokenAccount.mint.toBase58();
        const usdPrice = priceInfos ? priceInfos[mintBase58]?.usd : 0;
        const decimals = tokenMap?.get(mintBase58)?.decimals;
        const usdValue = math
          .bignumber(amountToUiAmount(nonEmptyTokenAccount.amount, decimals))
          .mul(usdPrice ?? 0)
          .toNumber();
        return {
          usdPrice,
          usdValue,
          ...nonEmptyTokenAccount,
        };
      }
    );

    nonEmptyTokenAccountsWithValue?.sort((a, b) => {
      return b.usdValue - a.usdValue;
    });

    return [nonEmptyTokenAccountsWithValue, emptyTokenAccounts];
  }, [tokenAccounts, tokenMap, priceInfos]);

  useEffect(() => {
    async function update() {
      setTokenMap(await getTokenMap());
    }
    update();
  }, []);

  const handleDrawerOpen = () => {
    setOpen(true);
  };

  const handleDrawerClose = () => {
    setOpen(false);
  };

  return (
    <Box sx={{ display: "flex" }}>
      <AppBar>
        <Toolbar>
          <IconButton onClick={handleDrawerOpen}>
            <MenuIcon />
          </IconButton>
          <Box m={1} sx={{ flexGrow: 1 }}>
            <Typography variant="h5">Desktop Wallet</Typography>
          </Box>
          <Stack direction="row" alignItems="center">
            <Avatar src="https://connect.nightly.app/img/logo.png" />
            {connected && <CheckIcon />}
            <IconButton onClick={() => setOpenConnectDialog(true)}>
              <AddIcon />
            </IconButton>
          </Stack>
        </Toolbar>
      </AppBar>
      <AppDrawer handleDrawerClose={handleDrawerClose} open={open} />
      <Box>
        <Main open={open}>
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
                  {userTokenAccountsWithContext?.tokenAccounts.length ?? "N.A."}{" "}
                  token accounts
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
                      tokenMap?.get(mintBase58)?.name ||
                      shortenAddress(mintBase58)
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
                        <Typography>
                          ${tokenAccount.usdValue.toFixed(2)}
                        </Typography>
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
        </Main>
      </Box>
    </Box>
  );
}

export default App;
