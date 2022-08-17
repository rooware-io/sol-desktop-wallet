import { useQuery } from "@tanstack/react-query";

interface PriceInfo {
  usd: number;
  usd_24h_change: number;
}

function usePriceInfos(mints: string[] | undefined) {
  return useQuery(
    ["price-in-usd", mints],
    async () => {
      if (!mints) return;

      const result = (await (
        await fetch(
          `https://api.coingecko.com/api/v3/simple/token_price/solana?include_24hr_change=true&vs_currencies=usd&contract_addresses=${mints.join(
            ","
          )}`
        )
      ).json()) as { [mint: string]: { usd: number } };

      // Hardcode stable coins because somehow coingecko doesn't return price for those
      result["EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"] = { usd: 1 };
      result["Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB"] = { usd: 1 };

      return result;
    },
    { refetchInterval: false }
  );
}

export default usePriceInfos;
