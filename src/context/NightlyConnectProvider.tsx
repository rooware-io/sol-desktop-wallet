import { ClientSolana, SignTransactionsRequest } from "@nightlylabs/connect";
import { Transaction } from "@solana/web3.js";
import {
  createContext,
  FC,
  PropsWithChildren,
  useContext,
  useEffect,
  useState,
} from "react";
import { ApproveDialog } from "../components/ApproveDialog";
import { NightlyConnectDialog } from "../components/NigthlyConnectDialog";
import { useWallet } from "./WalletProvider";

const NightlyConnectContext = createContext<{
  client: ClientSolana | undefined;
  setSessionId: (sessionId: string) => void;
  setOpenConnectDialog: (open: boolean) => void;
  connected: boolean;
} | null>(null);

export function useNightlyConnect() {
  const context = useContext(NightlyConnectContext);
  if (!context) {
    throw new Error("NighlyConnect must be used with its provider");
  }
  return context;
}

const NightlyConnectProvider: FC<PropsWithChildren<{}>> = ({ children }) => {
  const [client, setClient] = useState<ClientSolana>();
  const [openConnectDialog, setOpenConnectDialog] = useState(false);
  const [connected, setConnected] = useState(false);
  const [signRequest, setSignRequest] = useState<{
    transaction: Transaction;
    onApprove: (signedTransaction: Transaction) => void;
    onReject: () => void;
  }>();
  const [sessionId, setSessionId] = useState<string>();

  const { wallet } = useWallet();

  useEffect(() => {
    async function setup() {
      if (!sessionId || !wallet) {
        setClient(undefined);
        return;
      }

      let { client, data } = await ClientSolana.build({
        sessionId,
      });
      console.log(data);

      try {
        await client.connect({
          publicKey: wallet.publicKey,
          sessionId,
        });
        setConnected(true);
      } catch (e) {
        console.error(e);
        setConnected(false);
        return;
      }

      client.on("newRequest", async (request) => {
        const signRequest = request as SignTransactionsRequest;

        // Sign request
        const txToSign = Transaction.from(
          Buffer.from(signRequest.transactions[0], "hex")
        );

        setSignRequest({
          transaction: txToSign,
          onApprove: async (signedTransaction: Transaction) => {
            await client.resolveSignTransaction({
              requestId: signRequest.id,
              signedTransactions: [signedTransaction],
            });
            setSignRequest(undefined);
          },
          onReject: async () => {
            await client.rejectRequest({ requestId: signRequest.id });
            setSignRequest(undefined);
          },
        });
      });
    }
    setup();
  }, [sessionId]);

  return (
    <NightlyConnectContext.Provider
      value={{
        client,
        setSessionId,
        setOpenConnectDialog,
        connected,
      }}
    >
      {children}
      {signRequest && (
        <ApproveDialog
          open={signRequest !== undefined}
          onClose={signRequest.onReject}
          signRequest={signRequest}
        />
      )}
      {openConnectDialog && (
        <NightlyConnectDialog
          open={openConnectDialog}
          onClose={() => setOpenConnectDialog(false)}
          setSessionId={setSessionId}
          connected={connected}
        />
      )}
    </NightlyConnectContext.Provider>
  );
};

export default NightlyConnectProvider;
