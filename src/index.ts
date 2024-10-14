import { ethers } from "ethers";
import * as fs from "fs";
import * as path from "path";
import { parse } from "csv-parse/sync";
import { stringify } from "csv-stringify/sync";

import {
  createCovalentFetcher,
  filterTransactionsByBlockRange,
} from "./services/transactionService";
import {
  processStandardBridgeEvents,
  categorizeStandardBridgeEvents,
} from "./services/standardBridge";
import { processApxETHEvents } from "./services/apxEthBridge";
import { processHopRETHEvents } from "./services/hopREthBridge";
import { processLidoWstETHEvents } from "./services/lidoL2Bridge"; // Add this import
import { calculateTotalBridgedAmounts } from "./services/bridgeCalculations";

import { StandardBridgeEvent } from "./types";
import { BridgedAmounts } from "./types";

import {
  API_KEY,
  CHAIN_ID,
  STANDARD_BRIDGE_ADDRESS,
  LZ_EXECUTOR_ADDRESS,
  CROSS_DOMAIN_MESSENGER_ADDRESS,
  APX_ETH_ADDRESS,
  RETH_CONTRACT_ADDRESS,
  WSTETH_CONTRACT_ADDRESS,
  FROM_BLOCK,
  TO_BLOCK,
} from "./constants";

const getBridgedAmounts = async (walletAddress: string) => {
  const fetcher = createCovalentFetcher(API_KEY, CHAIN_ID);
  const transactions = await fetcher(walletAddress);

  const filteredTransactions = filterTransactionsByBlockRange(
    transactions,
    FROM_BLOCK,
    TO_BLOCK
  );

  // Process Standard Bridge events
  const standardBridgeEvents = await processStandardBridgeEvents(
    filteredTransactions
  )([STANDARD_BRIDGE_ADDRESS]);
  const categorizedStandardBridgeEvents = categorizeStandardBridgeEvents(
    standardBridgeEvents as StandardBridgeEvent[]
  );

  // Process apxETH events
  const apxETHEvents = await processApxETHEvents(filteredTransactions)(
    walletAddress,
    APX_ETH_ADDRESS,
    LZ_EXECUTOR_ADDRESS
  );

  // Process Hop rETH events
  const hopRETHEvents = await processHopRETHEvents(filteredTransactions)(
    walletAddress,
    CROSS_DOMAIN_MESSENGER_ADDRESS,
    RETH_CONTRACT_ADDRESS
  );

  // Add Lido wstETH events processing
  const lidoWstETHEvents = await processLidoWstETHEvents(filteredTransactions)(
    walletAddress,
    CROSS_DOMAIN_MESSENGER_ADDRESS
  );

  console.log(
    categorizedStandardBridgeEvents,
    "categorizedStandardBridgeEvents"
  );

  const bridgeTransactions = [
    ...Object.entries(categorizedStandardBridgeEvents).flatMap(
      ([token, events]) => {
        const getTokenNameOrAddress = (token: string) => {
          switch (token.toLowerCase()) {
            case RETH_CONTRACT_ADDRESS.toLowerCase():
              return "RETH";
            case APX_ETH_ADDRESS.toLowerCase():
              return "APXETH";
            case WSTETH_CONTRACT_ADDRESS.toLowerCase():
              return "WSTETH";
            default:
              return token;
          }
        };

        return events.map((event) => ({
          bridgeName: "Standard Bridge",
          token:
            token === "eth"
              ? "ETH"
              : getTokenNameOrAddress(event.localToken || token),
          amount: event.amount,
          // @ts-ignore
          blockHeight: event.blockHeight,
        }));
      }
    ),
    ...apxETHEvents.map((event) => ({
      bridgeName: "apxETH Bridge",
      token: "apxETH",
      amount: event.amount,
      blockHeight: event.blockHeight,
    })),
    ...hopRETHEvents.map((event) => ({
      bridgeName: "Hop Bridge",
      token: "rETH",
      amount: event.amount,
      blockHeight: event.blockHeight,
    })),
    ...lidoWstETHEvents.map((event) => ({
      bridgeName: "Lido Bridge",
      token: "wstETH",
      amount: event.amount,
      blockHeight: event.blockHeight,
    })),
  ];

  return {
    bridgeTransactions,
    totalAmounts: calculateTotalBridgedAmounts(
      walletAddress,
      categorizedStandardBridgeEvents,
      apxETHEvents,
      hopRETHEvents,
      lidoWstETHEvents,
      WSTETH_CONTRACT_ADDRESS,
      RETH_CONTRACT_ADDRESS,
      APX_ETH_ADDRESS
    ),
  };
};

const getBridgedAmountsForAddresses = async (walletAddresses: string[]) => {
  const results = [];
  for (const address of walletAddresses) {
    try {
      console.log(`Processing address: ${address}`);
      const { bridgeTransactions } = await getBridgedAmounts(address);

      console.log(bridgeTransactions, "bridgeTransactions");
      results.push({ address, bridgeTransactions });
      console.log(`Finished processing address: ${address}`);
      await new Promise((resolve) => setTimeout(resolve, 1000));
    } catch (error) {
      console.error(`Error processing address ${address}:`, error);
      results.push({ address, error: "Failed to process" });
    }
  }
  return results;
};

const readAddressesFromCSV = () => {
  const setupFilesPath = path.join(__dirname, "..", "setup_files");
  const files = fs.readdirSync(setupFilesPath);

  const addresses = {
    APXETH: new Set<string>(),
    RETH: new Set<string>(),
    WSTETH: new Set<string>(),
  };

  files.forEach((file) => {
    if (file.endsWith(".csv")) {
      const filePath = path.join(setupFilesPath, file);
      const fileContent = fs.readFileSync(filePath, "utf-8");
      const records = parse(fileContent, {
        columns: false,
        skip_empty_lines: true,
      });

      // Extract the coin name, removing the "collateral-" prefix
      const coin = file.split("-").pop()?.replace(".csv", "").toUpperCase();
      console.log(`Processing file: ${file}, Extracted coin: ${coin}`);

      if (coin && coin in addresses) {
        records.forEach((record: string[]) => {
          const address = record[0].toLowerCase();
          addresses[coin as keyof typeof addresses].add(address);
        });
      } else {
        console.warn(`Unrecognized coin in file name: ${file}`);
      }
    }
  });

  return {
    APXETH: Array.from(addresses.APXETH),
    RETH: Array.from(addresses.RETH),
    WSTETH: Array.from(addresses.WSTETH),
  };
};

const generateCSVFiles = (
  bridgedAmountsForAddresses: {
    address: string;
    totalAmounts: BridgedAmounts;
  }[]
) => {
  const outputPath = path.join(__dirname, "..", "output");
  if (!fs.existsSync(outputPath)) {
    fs.mkdirSync(outputPath);
  }

  const tokenData: Record<string, any[]> = {
    wstETH: [],
    rETH: [],
    apxETH: [],
  };

  bridgedAmountsForAddresses.forEach(({ address, totalAmounts }) => {
    if (totalAmounts && totalAmounts.tokens) {
      const { wstETH, rETH, apxETH } = totalAmounts.tokens;

      tokenData.wstETH.push({
        userAddress: address,
        standardBridgeAmount: wstETH.standardBridge.formatted,
        lidoBridgeAmount: wstETH.lidoBridge?.formatted || "0",
        totalBridged: wstETH.total.formatted,
      });

      tokenData.rETH.push({
        userAddress: address,
        standardBridgeAmount: rETH.standardBridge.formatted,
        hopBridgeAmount: rETH.hopBridge?.formatted || "0",
        totalBridged: rETH.total.formatted,
      });

      tokenData.apxETH.push({
        userAddress: address,
        standardBridgeAmount: apxETH.standardBridge.formatted,
        apxETHBridgeAmount: apxETH.apxBridge?.formatted || "0",
        totalBridged: apxETH.total.formatted,
      });
    }
  });

  Object.entries(tokenData).forEach(([token, data]) => {
    const csvContent = stringify(data, { header: true });
    fs.writeFileSync(
      path.join(outputPath, `${token}_bridged_amounts.csv`),
      csvContent
    );
    console.log(`CSV file for ${token} has been created.`);
  });
};

const generateJSONFile = (
  bridgedAmountsForAddresses: {
    address: string;
    bridgeTransactions: any[];
  }[]
) => {
  const outputPath = path.join(__dirname, "..", "output");
  if (!fs.existsSync(outputPath)) {
    fs.mkdirSync(outputPath);
  }

  const jsonContent = JSON.stringify(bridgedAmountsForAddresses, null, 2);
  fs.writeFileSync(
    path.join(outputPath, "bridged_amounts_detailed.json"),
    jsonContent
  );
  console.log("Detailed JSON file has been created.");
};

const main = async () => {
  const addresses = readAddressesFromCSV();
  console.log("Unique addresses for each coin:");
  console.log(JSON.stringify(addresses, null, 2));

  // Combine all addresses for processing
  // Combine all addresses for processing
  const allAddresses = [
    ...new Set([...addresses.APXETH, ...addresses.RETH, ...addresses.WSTETH]),
    "0x97525526C3Fcc9DA8a5109A7fbd49034fA13BED7",
  ];

  console.log(`Total unique addresses: ${allAddresses.length}`);
  console.log(
    `Filtering transactions from block ${FROM_BLOCK} to ${TO_BLOCK || "latest"}`
  );
  console.log("Starting to process addresses...");
  const bridgedAmountsForAddresses = await getBridgedAmountsForAddresses(
    allAddresses
  );

  // Generate CSV files
  generateCSVFiles(
    // @ts-ignore
    bridgedAmountsForAddresses.map(({ address, totalAmounts }) => ({
      address,
      bridgedAmounts: totalAmounts,
    }))
  );

  // Generate JSON file
  // @ts-ignore
  generateJSONFile(bridgedAmountsForAddresses);
};

main().catch((error) => {
  console.error("An error occurred in the main function:", error);
});
