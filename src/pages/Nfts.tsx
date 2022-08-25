import {
  Button,
  Card,
  CardActions,
  CardContent,
  CardMedia,
  Chip,
  CircularProgress,
  Grid,
  IconButton,
  Paper,
  Skeleton,
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
import TransferDialog from "../components/TransferDialog";
import { TokenAccount } from "../tools/token";
import { u64 } from "@solana/spl-token";

function NftCard({ nftInfo }: { nftInfo: NftInfo }) {
  const { tokenAccount, metadata, edition } = nftInfo;
  // TODO: Add proper handlign if the image cannot load
  const { data: offChainMetadata } = useOffchainMetadataLoader(
    metadata.data.uri
  );
  const [imageLoading, setImageLoading] = useState<boolean>(true);
  const [openTransferDialog, setOpenTransferDialog] = useState<boolean>(false);

  function imageLoaded() {
    setImageLoading(false);
  }

  function imageErred() {
    setImageLoading(false);
  }

  return (
    <Card sx={{ minWidth: 300 }}>
      <CardMedia
        sx={{ display: imageLoading ? "none" : "block" }}
        component="img"
        image={offChainMetadata?.image}
        onLoad={imageLoaded}
        onError={imageErred}
        alt="The NFT"
      />
      {imageLoading && (
        <CardMedia>
          <Skeleton variant="rectangular" height={300} />
        </CardMedia>
      )}
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
        <Button onClick={() => setOpenTransferDialog(true)}>Send</Button>
        <IconButton disabled>
          <MoreVertIcon />
        </IconButton>
      </CardActions>
      {openTransferDialog && (
        <TransferDialog
          open={openTransferDialog}
          onClose={() => setOpenTransferDialog(false)}
          tokenAccountWithTokenInfo={{
            tokenAccount,
            tokenInfo: {
              name: metadata.data.name,
              symbol: metadata.data.name,
              decimals: 0,
              isNft: true,
            },
          }}
        />
      )}
    </Card>
  );
}

type NftInfo = {
  tokenAccount: TokenAccount;
  metadata: Metadata;
  edition: EditionData;
};

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
  const nftInfos = useMemo(() => {
    if (!filteredTokenAccounts || !mintToEditionMap) return;

    const mintToTokenAccountMap = filteredTokenAccounts.reduce(
      (acc, tokenAccount) => {
        //@ts-ignore
        if (tokenAccount.amount.eq(new u64(1))) {
          acc.set(tokenAccount.mint.toBase58(), tokenAccount);
        }
        return acc;
      },
      new Map<string, TokenAccount>()
    );

    const nftInfos = metadatas?.reduce((acc, metadata) => {
      const edition = mintToEditionMap.get(metadata.mint.toBase58());
      if (edition) {
        const tokenAccount = mintToTokenAccountMap.get(
          metadata.mint.toBase58()
        );
        if (tokenAccount) {
          // Get back the token account now
          acc.push({ tokenAccount, metadata, edition });
        }
      }
      return acc;
    }, new Array<NftInfo>());

    return nftInfos;
  }, [filteredTokenAccounts, metadatas, mintToEditionMap]);

  return (
    <Grid container spacing={2}>
      {nftInfos === undefined && (
        <Grid item xs={6} p={3}>
          <CircularProgress />
        </Grid>
      )}
      {nftInfos?.map((nftInfo) => {
        return (
          <Grid item xs={3} key={nftInfo.metadata.mint.toBase58()}>
            <NftCard nftInfo={nftInfo} />
          </Grid>
        );
      })}
      {nftInfos?.length === 0 && (
        <Grid item>
          <Card>
            <CardContent>
              <Typography variant="h5">
                Oh no, it looks like you don't have any NFT...
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      )}
    </Grid>
  );
}
