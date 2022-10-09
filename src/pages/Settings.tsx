import {
  Box,
  FormControl,
  MenuItem,
  Select,
  SelectChangeEvent,
} from "@mui/material";
import { RPC_ENDPOINTS, useConnection } from "../context/ConnectionProvider";

export default function Settings() {
  const { connection, setRpcUrl } = useConnection();
  const onChange = (event: SelectChangeEvent) => {
    setRpcUrl(event.target.value);
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
