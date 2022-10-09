import { Box, Button, Paper } from "@mui/material";
import { useCallback, useEffect, useState } from "react";
import { useWallet } from "../context/WalletProvider";
import { open } from "@tauri-apps/api/dialog";
import { invoke } from "@tauri-apps/api";
import { watch } from "tauri-plugin-fs-watch-api";
import { appDir, join } from "@tauri-apps/api/path";
import { useNavigate } from "react-router-dom";
import { BaseDirectory, readDir, readTextFile } from "@tauri-apps/api/fs";
import { Keypair } from "@solana/web3.js";
import { UserSettings, userSettingsStore } from "./Settings";

interface FileSystemAccount {
  address: string;
}

export default function SelectAccountPage() {
  const { setFileSystemWallet } = useWallet();
  const navigate = useNavigate();

  const [fsAccounts, setFsAccounts] = useState<FileSystemAccount[]>([]);

  useEffect(() => {
    loadFsAccounts();
  }, []);

  useEffect(() => {
    async function startWatching() {
      console.log(`watching ${`${await appDir()}/keypairs`}`);
      return watch(`${await appDir()}/keypairs`, {}, loadFsAccounts);
    }
    const stopWatchingPromise = startWatching();
    return () => {
      stopWatchingPromise.then((stopWatching) => {
        console.log("stopping watch");
        stopWatching();
      });
    };
  }, []);

  const loadFsAccounts = useCallback(async () => {
    const files = await readDir("keypairs", { dir: BaseDirectory.App });
    const keypairPaths = files.filter(
      (f) => f.name && f.name.split(".").pop() === "json"
    );
    const accounts = await Promise.all(
      keypairPaths.map(async (kpPath) => {
        const keypair = await readTextFile(
          await join("keypairs", kpPath.name!),
          {
            dir: BaseDirectory.App,
          }
        );
        return {
          address: Keypair.fromSecretKey(
            new Uint8Array(JSON.parse(keypair))
          ).publicKey.toBase58(),
        };
      })
    );
    setFsAccounts(accounts);
  }, []);

  const importKeypair = useCallback(async () => {
    const keypairPath = (await open({
      filters: [
        {
          name: "JSON",
          extensions: ["json"],
        },
      ],
    })) as string;
    await invoke("import_keypair", { keypairPath });
  }, []);

  const selectWallet = useCallback(
    async (accountAddress: string) => {
      setFileSystemWallet(accountAddress);
      await userSettingsStore.set(UserSettings.WALLET, accountAddress);
      navigate("/");
    },
    [navigate]
  );

  return (
    <>
      <Button variant="contained" onClick={importKeypair}>
        Import keypair
      </Button>
      {fsAccounts.map((account) => (
        <Box
          key={account.address}
          p={2}
          onClick={() => selectWallet(account.address)}
          style={{ cursor: "pointer" }}
        >
          <Paper elevation={2} sx={{ width: "600px" }}>
            <Box p={2}>{account.address}</Box>
          </Paper>
        </Box>
      ))}
    </>
  );

  return <></>;
}
