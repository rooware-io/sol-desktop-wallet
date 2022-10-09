import {
  createContext,
  FC,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { Connection } from "@solana/web3.js";
import { UserSettings, userSettingsStore } from "../pages/Settings";

export const RPC_ENDPOINTS = [
  "https://ssc-dao.genesysgo.net",
  "https://api.devnet.solana.com",
];

const ConnectionContext = createContext<{
  connection: Connection;
  setRpcEndpooint: (url: string) => void;
} | null>(null);

export function useConnection() {
  const context = useContext(ConnectionContext);
  if (!context) {
    throw new Error("ConnectionContext must be used with its provider");
  }
  return context;
}

const ConnectionProvider: FC<PropsWithChildren<{}>> = ({ children }) => {
  const [connection, setConnection] = useState<Connection>(
    new Connection(RPC_ENDPOINTS[0], "confirmed")
  );

  useEffect(() => {
    (async function () {
      const savedRpcEnpoint = await userSettingsStore.get<string>(
        UserSettings.RPC_ENDPOINT
      );
      if (savedRpcEnpoint)
        setConnection(new Connection(savedRpcEnpoint, "confirmed"));
    })();
  }, []);

  const setRpcEndpooint = useCallback((url: string) => {
    setConnection(new Connection(url, "confirmed"));
  }, []);

  return (
    <ConnectionContext.Provider
      value={{
        connection,
        setRpcEndpooint,
      }}
    >
      {children}
    </ConnectionContext.Provider>
  );
};

export default ConnectionProvider;
