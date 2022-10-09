import {
  createContext,
  FC,
  PropsWithChildren,
  useContext,
  useEffect,
  useState,
} from "react";
import { Connection } from "@solana/web3.js";

export const RPC_ENDPOINTS = [
  "https://ssc-dao.genesysgo.net",
  "https://api.devnet.solana.com",
];

const ConnectionContext = createContext<{
  connection: Connection;
  setRpcUrl: (url: string) => void;
} | null>(null);

export function useConnection() {
  const context = useContext(ConnectionContext);
  if (!context) {
    throw new Error("ConnectionContext must be used with its provider");
  }
  return context;
}

const ConnectionProvider: FC<PropsWithChildren<{}>> = ({ children }) => {
  const [rpcUrl, setRpcUrl] = useState<string>(RPC_ENDPOINTS[0]);
  const [connection, setConnection] = useState<Connection>(
    new Connection(rpcUrl, "confirmed")
  );

  useEffect(() => {
    setConnection(new Connection(rpcUrl, "confirmed"));
  }, [rpcUrl]);

  return (
    <ConnectionContext.Provider
      value={{
        connection,
        setRpcUrl,
      }}
    >
      {children}
    </ConnectionContext.Provider>
  );
};

export default ConnectionProvider;
