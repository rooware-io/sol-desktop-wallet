import { PublicKey } from "@solana/web3.js";
import { useQuery } from "@tanstack/react-query";
import { connection } from "../config";

function useUserBalance(user: PublicKey | undefined) {
  return useQuery(
    ["user-balance", user?.toBase58()],
    async () => {
      if (!user) return;
      const balance = await connection.getBalance(user);
      return balance;
    },
    { refetchInterval: 5_000 }
  );
}

export default useUserBalance;
