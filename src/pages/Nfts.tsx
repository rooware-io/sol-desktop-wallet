import {
  Button,
  Card,
  CardActions,
  CardContent,
  CardMedia,
  Grid,
  IconButton,
  Typography,
} from "@mui/material";
import { useWalletAccounts } from "../context/WalletAccountsProvider";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import useOffchainMetadataLoader from "../hooks/useOffchainMetadataLoader";
import { useEffect, useState } from "react";
import { getTokenAccountInfoMetadatas } from "../tools/nft/nft";
import { connection } from "../config";
import { Metadata } from "@metaplex-foundation/mpl-token-metadata";

function NftCard({ metadata }: { metadata: Metadata }) {
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

  return (
    <Grid container spacing={2}>
      {metadatas?.map((metadata) => {
        return (
          <Grid item xs={3} key={metadata.mint.toBase58()}>
            <NftCard metadata={metadata} />
          </Grid>
        );
      })}
    </Grid>
  );
}
