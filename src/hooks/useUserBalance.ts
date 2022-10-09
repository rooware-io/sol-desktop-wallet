import { PublicKey } from "@solana/web3.js";
import { useQuery } from "@tanstack/react-query";
import { useConnection } from "../context/ConnectionProvider";

function useUserBalance(user: PublicKey | undefined) {
  const { connection } = useConnection();
  return useQuery(
    ["user-balance", user?.toBase58()],
    async () => {
      const balance = await connection.getBalance(user!);
      return balance;
    },
    { refetchInterval: 5_000, enabled: !!user }
  );
}

export default useUserBalance;
