import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import NightlyConnectProvider from "./context/NightlyConnectProvider";
import WalletProvider from "./context/WalletProvider";
import "./index.css";

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <WalletProvider>
        <NightlyConnectProvider>
          <App />
        </NightlyConnectProvider>
      </WalletProvider>
    </QueryClientProvider>
  </React.StrictMode>
);
