import { Connection, PublicKey } from "@solana/web3.js";
import {
  PROGRAM_ID as METAPLEX_PROGRAM_ID,
  Metadata,
  MasterEditionV1,
  Key,
  MasterEditionV2,
  Edition,
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
  let metadataAddresses = mints.map((pk) => {
    return findMetadataPda(pk);
  });

  const accountInfoMap = await chunkedGetMultipleAccountInfos(
    connection,
    metadataAddresses
  );

  const metadatas: Metadata[] = [...accountInfoMap.entries()].reduce(
    (acc, [_, ai]) => {
      if (ai) {
        try {
          acc.push(Metadata.deserialize(ai.data)[0]);
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

export type EditionData = MasterEditionV1 | MasterEditionV2 | Edition;

/** Get the editions from metadatas and deserialize it */
export async function getMetadataEditions(
  connection: Connection,
  metadatas: Metadata[]
) {
  const [editionAddresses, editionAddressToMintMap] = metadatas.reduce(
    (acc, metadata) => {
      const pda = findEditionPda(metadata.mint);
      acc[0].push(pda);
      acc[1].set(pda.toBase58(), metadata.mint.toBase58());

      return acc;
    },
    [new Array<PublicKey>(), new Map<string, string>()]
  );

  const accountInfoMap = await chunkedGetMultipleAccountInfos(
    connection,
    editionAddresses
  );

  const editions = [...accountInfoMap.entries()].reduce((acc, [pk, ai]) => {
    if (ai) {
      try {
        const mint = editionAddressToMintMap.get(pk)!;

        const key = ai.data[0];
        // Pain starts here
        if (key === Key.MasterEditionV1) {
          acc.set(mint, MasterEditionV1.deserialize(ai.data)[0]);
        } else if (key === Key.MasterEditionV2) {
          acc.set(mint, MasterEditionV2.deserialize(ai.data)[0]);
        } else if (key === Key.EditionV1) {
          acc.set(mint, Edition.deserialize(ai.data)[0]);
        }
        // Otherwise too bad mate
      } catch (e) {
        // Ignore broken stuff
      }
    }
    return acc;
  }, new Map<string, EditionData>());

  return editions;
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
