import { Connection } from "@solana/web3.js";

export const connection = new Connection(
  "https://ssc-dao.genesysgo.net",
  // "https://api.devnet.solana.com",
  "confirmed"
);
