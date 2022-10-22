import { useQuery } from "@tanstack/react-query";
import { MetadataJSONStructure } from "../lib/nft/off-chain-metadata";

const useOffchainMetadataLoader = (uri: string) => {
  return useQuery<MetadataJSONStructure>(
    ["metadata-nft", uri],
    async () => await (await fetch(uri)).json(),
    {
      enabled: !!uri,
      refetchInterval: false,
    }
  );
};

export default useOffchainMetadataLoader;
