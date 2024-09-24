// src/index.ts

import { ethers } from "ethers";

export type TokenAddress = string;
export type BridgeAddress = string;

export interface TokenBalance {
  token: TokenAddress;
  balance: ethers.BigNumber;
}

export interface BridgeInfo {
  address: BridgeAddress;
  type: "standard" | "custom";
}

export abstract class Bridge {
  constructor(public address: BridgeAddress) {}

  abstract getBridgedBalance(
    walletAddress: string,
    token: TokenAddress
  ): Promise<ethers.BigNumber>;
}

export class StandardBridge extends Bridge {
  constructor(address: BridgeAddress) {
    super(address);
  }

  async getBridgedBalance(
    walletAddress: string,
    token: TokenAddress
  ): Promise<ethers.BigNumber> {
    // Implementation for getting bridged balance from StandardBridge
    // This would interact with the L2StandardBridge contract
    throw new Error("Not implemented");
  }
}

export class CustomBridge extends Bridge {
  constructor(address: BridgeAddress) {
    super(address);
  }

  async getBridgedBalance(
    walletAddress: string,
    token: TokenAddress
  ): Promise<ethers.BigNumber> {
    // Implementation for getting bridged balance from a custom bridge
    throw new Error("Not implemented");
  }
}

export class BridgeFactory {
  static createBridge(bridgeInfo: BridgeInfo): Bridge {
    switch (bridgeInfo.type) {
      case "standard":
        return new StandardBridge(bridgeInfo.address);
      case "custom":
        return new CustomBridge(bridgeInfo.address);
      default:
        throw new Error("Unsupported bridge type");
    }
  }
}

export class BridgeManager {
  private bridges: Bridge[];

  constructor(bridgeInfos: BridgeInfo[]) {
    this.bridges = bridgeInfos.map(BridgeFactory.createBridge);
  }

  async getBridgedBalances(
    walletAddress: string,
    tokens: TokenAddress[]
  ): Promise<TokenBalance[]> {
    // Implement logic to get bridged balances across all bridges
    throw new Error("Not implemented");
  }

  addBridge(bridgeInfo: BridgeInfo): void {
    this.bridges.push(BridgeFactory.createBridge(bridgeInfo));
  }
}
