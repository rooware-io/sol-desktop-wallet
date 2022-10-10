import {
  Box,
  FormControl,
  MenuItem,
  Select,
  SelectChangeEvent,
} from "@mui/material";
import { Store } from "tauri-plugin-store-api";
import { RPC_ENDPOINTS, useConnection } from "../context/ConnectionProvider";

export const userSettingsStore = new Store(".user-settings.dat");

export enum UserSettings {
  RPC_ENDPOINT = "rpc-endpoint",
  WALLET = "wallet",
}

export default function SettingsPage() {
  const { connection, setRpcEndpooint } = useConnection();
  const onChange = async (event: SelectChangeEvent) => {
    const newEndpoint = event.target.value;
    await userSettingsStore.set(UserSettings.RPC_ENDPOINT, newEndpoint);
    setRpcEndpooint(newEndpoint);
  };
  return (
    <>
      <Box p={2} width={"100%"}>
        <Box
          style={{
            width: "100%",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span>RPC endpoint:</span>
          <FormControl sx={{ m: 1, minWidth: 120 }} size="small">
            <Select
              labelId="rpc-select"
              id="rpc-select"
              value={connection.rpcEndpoint}
              variant="standard"
              onChange={onChange}
              style={{ color: "white" }}
            >
              {RPC_ENDPOINTS.map((endpoint) => (
                <MenuItem key={endpoint} value={endpoint}>
                  {endpoint}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      </Box>
    </>
  );
}
