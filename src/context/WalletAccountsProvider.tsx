/**
 * Make available accounts related to the wallet: system program balance, token accounts...
 */
import { TokenInfo } from "@solana/spl-token-registry";
import { useQuery } from "@tanstack/react-query";
import {
  createContext,
  FC,
  PropsWithChildren,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import usePriceInfos from "../hooks/usePriceInfos";
import useUserBalance from "../hooks/useUserBalance";
import {
  amountToUiAmount,
  getUserTokenAccountsWithContext,
  TokenAccount,
} from "../tools/token";
import { getTokenMap } from "../tools/token-map";
import { useWallet } from "./WalletProvider";
import { u64 } from "@solana/spl-token";
import * as math from "mathjs";
import { useConnection } from "./ConnectionProvider";

const WalletAccountsContext = createContext<{
  userBalance: number | undefined;
  tokenAccounts: TokenAccount[] | undefined;
  filteredTokenAccounts:
    | (TokenAccount & { usdPrice: number; usdValue: number })[]
    | undefined;
  emptyTokenAccounts: TokenAccount[] | undefined;
  tokenMap: Map<string, TokenInfo> | undefined;
} | null>(null);

export function useWalletAccounts() {
  const context = useContext(WalletAccountsContext);
  if (!context) {
    throw new Error("WalletAccountsContext must be used with its provider");
  }
  return context;
}
const WalletAccountsProvider: FC<PropsWithChildren<{}>> = ({ children }) => {
  const { connection } = useConnection();
  const { wallet } = useWallet();
  const [tokenMap, setTokenMap] = useState<Map<string, TokenInfo>>();

  const { data: userBalance } = useUserBalance(wallet?.publicKey);
  const { data: userTokenAccountsWithContext } = useQuery(
    ["token-accounts", wallet?.publicKey.toBase58()],
    async () => {
      if (!wallet) return;
      return getUserTokenAccountsWithContext(connection, wallet.publicKey);
    },
    { refetchInterval: 5_000, enabled: !!wallet }
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

  return (
    <WalletAccountsContext.Provider
      value={{
        userBalance,
        tokenAccounts,
        filteredTokenAccounts,
        emptyTokenAccounts,
        tokenMap,
      }}
    >
      {children}
    </WalletAccountsContext.Provider>
  );
};

export default WalletAccountsProvider;
