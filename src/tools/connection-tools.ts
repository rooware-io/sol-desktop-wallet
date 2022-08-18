import { AccountInfo, Connection, PublicKey } from "@solana/web3.js";

export async function chunkedGetMultipleAccountInfos(
  connection: Connection,
  pks: PublicKey[],
  chunkSize: number = 100
) {
  const accountInfoMap = new Map<string, AccountInfo<Buffer> | null>();
  const accountInfos = (
    await Promise.all(
      chunks(pks, chunkSize).map((chunk) =>
        connection.getMultipleAccountsInfo(chunk)
      )
    )
  ).flat();

  accountInfos.forEach((item, index) => {
    const publicKey = pks[index];

    accountInfoMap.set(publicKey.toString(), item);
  });

  return accountInfoMap;
}

export function chunks<T>(array: T[], size: number): T[][] {
  return Array.apply<number, T[], T[][]>(
    0,
    new Array(Math.ceil(array.length / size))
  ).map((_, index) => array.slice(index * size, (index + 1) * size));
}
