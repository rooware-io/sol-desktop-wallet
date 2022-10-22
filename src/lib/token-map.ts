import { ENV, TokenInfo, TokenListProvider } from "@solana/spl-token-registry";

export async function getTokenMap() {
  const tokenListContainer = await new TokenListProvider().resolve();
  const tokenList = tokenListContainer
    .filterByChainId(ENV.MainnetBeta)
    .getList();

  return tokenList.reduce<Map<string, TokenInfo>>((map, item) => {
    map.set(item.address, item);
    return map;
  }, new Map());
}
