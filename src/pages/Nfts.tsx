import {
  Button,
  Card,
  CardActions,
  CardContent,
  CardMedia,
  Chip,
  Grid,
  IconButton,
  Typography,
} from "@mui/material";
import { useWalletAccounts } from "../context/WalletAccountsProvider";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import useOffchainMetadataLoader from "../hooks/useOffchainMetadataLoader";
import { useEffect, useMemo, useState } from "react";
import {
  getTokenAccountInfoMetadatas,
  getMetadataEditions,
  EditionData,
} from "../tools/nft/nft";
import { connection } from "../config";
import {
  Edition,
  Key,
  Metadata,
} from "@metaplex-foundation/mpl-token-metadata";

function NftCard({
  metadata,
  edition,
}: {
  metadata: Metadata;
  edition?: EditionData;
}) {
  const { data: offChainMetadata } = useOffchainMetadataLoader(
    metadata.data.uri
  );

  return (
    <Card>
      <CardMedia
        component="img"
        image={offChainMetadata?.image}
        alt="The NFT"
      />
      <CardContent>
        <Typography>{metadata.data.name}</Typography>
        {(edition?.key === Key.MasterEditionV1 ||
          edition?.key === Key.MasterEditionV2) && (
          <Chip label="Master edition" />
        )}
        {edition instanceof Edition && (
          <Chip label={`Edition ${edition.edition}`} />
        )}
      </CardContent>
      <CardActions>
        <Button>Send</Button>
        <IconButton disabled>
          <MoreVertIcon />
        </IconButton>
      </CardActions>
    </Card>
  );
}

export default function Nfts() {
  const [metadatas, setMetadatas] = useState<Metadata[]>();
  const [mintToEditionMap, setMintToEditionMap] =
    useState<Map<string, EditionData>>();
  const { filteredTokenAccounts } = useWalletAccounts();

  useEffect(() => {
    async function update() {
      if (!filteredTokenAccounts) return;
      const newMetadatas = await getTokenAccountInfoMetadatas(
        connection,
        filteredTokenAccounts
      );
      newMetadatas?.sort((a, b) =>
        a.mint.toBase58().localeCompare(b.mint.toBase58())
      );
      setMetadatas(newMetadatas);
    }
    update();
  }, [filteredTokenAccounts]);

  useEffect(() => {
    async function update() {
      if (!metadatas) return;
      setMintToEditionMap(await getMetadataEditions(connection, metadatas));
    }
    update();
  }, [metadatas]);

  // We end up showing only master and edition, but not fungible tokens with metadata
  const metadataWithEditions = useMemo(() => metadatas?.reduce((acc, metadata) => {
    const edition = mintToEditionMap?.get(metadata.mint.toBase58());
    if (edition) {
      acc.push({metadata, edition});
    }
    return acc;
  }, new Array<{metadata: Metadata, edition: EditionData}>), [metadatas, mintToEditionMap])

  return (
    <Grid container spacing={2}>
      {metadataWithEditions?.map(({metadata, edition}) => {
        return (
          <Grid item xs={3} key={metadata.mint.toBase58()}>
            <NftCard
              metadata={metadata}
              edition={edition}
            />
          </Grid>
        );
      })}
    </Grid>
  );
}
