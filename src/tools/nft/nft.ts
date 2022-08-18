import { Connection, PublicKey } from "@solana/web3.js";
import {
  PROGRAM_ID as METAPLEX_PROGRAM_ID,
  Metadata,
  metadataBeet,
} from "@metaplex-foundation/mpl-token-metadata";
import { u64 } from "@solana/spl-token";
import { TokenAccount } from "../token";
import { chunkedGetMultipleAccountInfos } from "../connection-tools";

export async function getTokenAccountInfoMetadatas(
  connection: Connection,
  tokenAccounts: TokenAccount[]
): Promise<Metadata[]> {
  const nftLikeMints = tokenAccounts.reduce<PublicKey[]>((acc, tai) => {
    // Optimistic assumption that decimals === 0
    // Grab all metadata pdas to show fungible tokens metadata
    //@ts-ignore
    if (tai.amount.eq(new u64(1))) {
      acc.push(tai.mint);
    }
    return acc;
  }, []);

  return getMetadatas(connection, nftLikeMints);
}

export async function getMetadatas(connection: Connection, mints: PublicKey[]) {
  let metadataAddresses = await Promise.all(
    mints.map((pk) => {
      return findMetadataPda(pk);
    })
  );

  const accountInfoMap = await chunkedGetMultipleAccountInfos(
    connection,
    metadataAddresses
  );

  const metadatas: Metadata[] = [...accountInfoMap.entries()].reduce(
    (acc, [_, ai]) => {
      if (ai) {
        try {
          acc.push(metadataBeet.deserialize(ai.data)[0]);
        } catch (e) {
          // Ingore broken stuff
        }
      }
      return acc;
    },
    new Array<Metadata>()
  );

  return metadatas;
}

export function findMetadataPda(mint: PublicKey): PublicKey {
  const [metadata] = PublicKey.findProgramAddressSync(
    [Buffer.from("metadata"), METAPLEX_PROGRAM_ID.toBuffer(), mint.toBuffer()],
    METAPLEX_PROGRAM_ID
  );
  return metadata;
}

export function findEditionPda(mint: PublicKey): PublicKey {
  const [edition] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("metadata"),
      METAPLEX_PROGRAM_ID.toBuffer(),
      mint.toBuffer(),
      Buffer.from("edition"),
    ],
    METAPLEX_PROGRAM_ID
  );
  return edition;
}
