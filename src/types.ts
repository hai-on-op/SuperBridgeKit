import { Transaction } from "@covalenthq/client-sdk";
import { BigNumber } from "ethers";

export type TransactionFetcher = (
  walletAddress: string
) => Promise<Transaction[]>;

export type StandardBridgeEvent = {
  name: string;
  from: string;
  to: string;
  amount: string;
  extraData: string;
  localToken?: string;
  remoteToken?: string;
};

export type CategorizedStandardBridgeEvents = {
  eth: StandardBridgeEvent[];
  [key: string]: StandardBridgeEvent[]; // For ERC20 tokens
};

export type TotalBridgedAmount = {
  eth: BigNumber;
  [key: string]: BigNumber; // For ERC20 tokens
};

export type ApxETHTransferEvent = {
  from: string;
  to: string;
  amount: string;
};

export type HopRETHTransferEvent = {
  from: string;
  to: string;
  amount: string;
};

export interface FormattedAmount {
  raw: string;
  formatted: string;
}

export interface TokenAmounts {
  standardBridge: FormattedAmount;
  hopBridge?: FormattedAmount;
  apxBridge?: FormattedAmount;
  total: FormattedAmount;
}

export interface BridgedAmounts {
  userAddress: string;
  tokens: {
    wstETH: TokenAmounts;
    rETH: TokenAmounts;
    apxETH: TokenAmounts;
  };
  totalCombined: FormattedAmount;
}
