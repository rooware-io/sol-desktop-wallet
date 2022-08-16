import {
  AccountInfo as TokenAccountInfo,
  AccountLayout,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  Token,
  TOKEN_PROGRAM_ID,
  u64,
} from "@solana/spl-token";
import {
  Connection,
  PublicKey,
  SystemProgram,
  TransactionInstruction,
} from "@solana/web3.js";
import * as math from "mathjs";

interface UserTokenAccountsWithContext {
  slot: number;
  tokenAccounts: TokenAccount[];
}

export async function getUserTokenAccountsWithContext(
  connection: Connection,
  owner: PublicKey
): Promise<UserTokenAccountsWithContext> {
  const tokenAccountsByOwnerResponse = await connection.getTokenAccountsByOwner(
    owner,
    {
      programId: TOKEN_PROGRAM_ID,
    }
  );

  const tokenAccounts: TokenAccount[] = [];
  for (const { pubkey, account } of tokenAccountsByOwnerResponse.value) {
    const tokenAccount = unpackAccount(account.data, pubkey);
    if (tokenAccount) tokenAccounts.push(tokenAccount);
  }

  return {
    slot: tokenAccountsByOwnerResponse.context.slot,
    tokenAccounts,
  };
}

export type TokenAccount = TokenAccountInfo & { address: PublicKey };

export function unpackAccount(
  data: Buffer | null,
  address: PublicKey
): TokenAccount | undefined {
  if (data == undefined || data.length == 0) {
    return undefined;
  }

  const accountInfo = AccountLayout.decode(data);
  accountInfo.address = address;
  accountInfo.mint = new PublicKey(accountInfo.mint);
  accountInfo.owner = new PublicKey(accountInfo.owner);
  accountInfo.amount = u64.fromBuffer(accountInfo.amount);

  if (accountInfo.delegateOption === 0) {
    accountInfo.delegate = null;
    accountInfo.delegatedAmount = new u64(0);
  } else {
    accountInfo.delegate = new PublicKey(accountInfo.delegate);
    accountInfo.delegatedAmount = u64.fromBuffer(accountInfo.delegatedAmount);
  }

  accountInfo.isInitialized = accountInfo.state !== 0;
  accountInfo.isFrozen = accountInfo.state === 2;

  if (accountInfo.isNativeOption === 1) {
    accountInfo.rentExemptReserve = u64.fromBuffer(accountInfo.isNative);
    accountInfo.isNative = true;
  } else {
    accountInfo.rentExemptReserve = null;
    accountInfo.isNative = false;
  }

  if (accountInfo.closeAuthorityOption === 0) {
    accountInfo.closeAuthority = null;
  } else {
    accountInfo.closeAuthority = new PublicKey(accountInfo.closeAuthority);
  }

  return accountInfo;
}

export function amountToUiAmount(
  amount: u64,
  decimals: number | undefined
): string {
  if (!decimals) return amount.toString();

  const precision = math.pow(10, decimals);
  return math.bignumber(amount.toString()).div(precision.toString()).toString();
}

export function uiAmountToAmount(
  uiAmount: string,
  decimals: number | undefined
): u64 {
  //@ts-ignore
  if (!decimals) return new u64(uiAmount.toString());

  const precision = math.pow(10, decimals);
  const amountString = math
    .bignumber(uiAmount.toString())
    .mul(precision.toString())
    .floor()
    .toString();

  //@ts-ignore
  return new u64(amountString);
}

// Source: https://github.com/solana-labs/solana-program-library/blob/dc5684445f0b42ba36a0157f06c561d967a7cb34/associated-token-account/program/src/instruction.rs#L16-L25
export function createIdempotentAssociatedTokenAccountInstruction({
  payer,
  ata,
  owner,
  mint,
}: {
  payer: PublicKey;
  ata: PublicKey;
  owner: PublicKey;
  mint: PublicKey;
}): TransactionInstruction {
  const keys = [
    { pubkey: payer, isSigner: true, isWritable: true },
    { pubkey: ata, isSigner: false, isWritable: true },
    { pubkey: owner, isSigner: false, isWritable: false },
    { pubkey: mint, isSigner: false, isWritable: false },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
  ];

  return new TransactionInstruction({
    keys,
    programId: ASSOCIATED_TOKEN_PROGRAM_ID,
    data: Buffer.from([1]),
  });
}

export async function getAssociatedTokenAccountAddress({
  owner,
  mint,
}: {
  owner: PublicKey;
  mint: PublicKey;
}) {
  return Token.getAssociatedTokenAddress(
    ASSOCIATED_TOKEN_PROGRAM_ID,
    TOKEN_PROGRAM_ID,
    mint,
    owner
  );
}
