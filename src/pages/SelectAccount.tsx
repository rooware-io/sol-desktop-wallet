import { Box, Button, Paper } from "@mui/material";
import { useCallback, useEffect, useState } from "react";
import { useWallet } from "../context/WalletProvider";
import { watch } from "tauri-plugin-fs-watch-api";
import { appDir } from "@tauri-apps/api/path";
import { useNavigate } from "react-router-dom";
import { UserSettings, userSettingsStore } from "./Settings";
import {
  AccountStore,
  addChildAccount,
  generateMnemonic,
  importKeypair,
  loadAccounts,
  saveMnemonic,
} from "../lib/api";
import { shortenAddress } from "../lib/address";
import { Add } from "@mui/icons-material";

export default function SelectAccountPage() {
  const { setFileSystemWallet } = useWallet();
  const navigate = useNavigate();

  const [accountStore, setAccountStore] = useState<AccountStore>({
    keypair: {},
    mnemonic: {},
  });

  useEffect(() => {
    loadAllAccounts();
  }, []);

  useEffect(() => {
    async function startWatching() {
      console.log(
        `watching ${await appDir()}/keypairs and ${await appDir()}/mnemonics`
      );
      return watch(
        [`${await appDir()}/keypairs`, `${await appDir()}/mnemonics`],
        {},
        loadAllAccounts
      );
    }
    const stopWatchingPromise = startWatching();
    return () => {
      stopWatchingPromise.then((stopWatching) => {
        console.log("stopping watch");
        stopWatching();
      });
    };
  }, []);

  const loadAllAccounts = useCallback(async () => {
    const accountStore = await loadAccounts();
    setAccountStore(accountStore);
  }, []);

  const selectWallet = useCallback(
    async (accountAddress: string) => {
      setFileSystemWallet(accountAddress);
      await userSettingsStore.set(UserSettings.WALLET, accountAddress);
      navigate("/");
    },
    [navigate]
  );

  const onCreateMnemonic = useCallback(async () => {
    try {
      const mnemonic = await generateMnemonic();
      window.alert(`save following phrase: ${mnemonic.phrase}`);
      await saveMnemonic(mnemonic.phrase);
    } catch (e) {
      console.log(e);
    }
  }, []);

  const onImportKeypair = useCallback(async () => {
    try {
      await importKeypair();
    } catch (e) {
      console.log(e);
    }
  }, []);

  const onAddChildAccount = useCallback(
    (baseAddress: string) => async () => {
      try {
        await addChildAccount(baseAddress);
      } catch (e) {
        console.log(e);
      }
    },
    []
  );

  return (
    <>
      <div style={{ margin: "20px 0 10px 0" }}>Imported keypairs</div>
      <Paper elevation={2} sx={{ width: "600px" }}>
        <Box p={2}>
          <Button
            variant="contained"
            onClick={onImportKeypair}
            style={{ marginBottom: "10px" }}
          >
            Import keypair
          </Button>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "8px",
            }}
          >
            {Object.entries(accountStore.keypair).length === 0
              ? "None"
              : Object.entries(accountStore.keypair).map(
                  ([accountAddress, account]) => (
                    <Button
                      key={accountAddress}
                      variant="contained"
                      fullWidth
                      onClick={() => selectWallet(accountAddress)}
                      style={{
                        backgroundColor: "gray",
                        color: "white",
                        padding: "8px",
                        cursor: "pointer",
                      }}
                    >
                      {account.label} ({shortenAddress(accountAddress)})
                    </Button>
                  )
                )}
          </div>
        </Box>
      </Paper>
      <div style={{ margin: "50px 0 10px 0" }}>Mnemonics</div>
      <Paper elevation={2}>
        <Box p={2}>
          <Button
            variant="contained"
            onClick={onCreateMnemonic}
            style={{ marginBottom: "10px" }}
          >
            Create mnemonic
          </Button>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "8px",
            }}
          >
            {Object.entries(accountStore.mnemonic).length === 0
              ? "None"
              : Object.entries(accountStore.mnemonic).map(
                  ([mnemonicBaseAddress, mnemonic]) => (
                    <div key={mnemonicBaseAddress}>
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "row",
                          gap: "8px",
                          justifyContent: "center",
                          alignItems: "center",
                        }}
                      >
                        <div>{mnemonic.label}</div>
                        <Button
                          variant="text"
                          onClick={onAddChildAccount(mnemonic.base_address)}
                        >
                          <Add />
                        </Button>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "8px",
                        }}
                      >
                        {Object.entries(mnemonic.accounts).map(
                          ([accountAddress, account]) => (
                            <Button
                              key={accountAddress}
                              variant="contained"
                              fullWidth
                              onClick={() => selectWallet(accountAddress)}
                              style={{
                                backgroundColor: "gray",
                                color: "white",
                                padding: "8px",
                                cursor: "pointer",
                              }}
                            >
                              {account.label} ({shortenAddress(accountAddress)})
                            </Button>
                          )
                        )}
                      </div>
                    </div>
                  )
                )}
          </div>
        </Box>
      </Paper>
    </>
  );
}
