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
import { calculateTotalBridgedAmounts } from "./services/bridgeCalculations";

import { StandardBridgeEvent } from "./types";
import { BridgedAmounts } from "./types"; // Add this import

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

  // Filter transactions by block range
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

  console.log(
    categorizedStandardBridgeEvents,
    "categorizedStandardBridgeEvents"
  );

  // Calculate total bridged amounts
  return calculateTotalBridgedAmounts(
    walletAddress,
    categorizedStandardBridgeEvents,
    apxETHEvents,
    hopRETHEvents,
    WSTETH_CONTRACT_ADDRESS,
    RETH_CONTRACT_ADDRESS,
    APX_ETH_ADDRESS
  );
};

const getBridgedAmountsForAddresses = async (walletAddresses: string[]) => {
  const results = [];
  for (const address of walletAddresses) {
    try {
      console.log(`Processing address: ${address}`);
      const bridgedAmounts = await getBridgedAmounts(address);
      results.push({ address, bridgedAmounts });
      console.log(`Finished processing address: ${address}`);
      // Add a delay between requests to further reduce the chance of hitting rate limits
      await new Promise((resolve) => setTimeout(resolve, 1000)); // 1 second delay
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
    bridgedAmounts: BridgedAmounts;
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

  bridgedAmountsForAddresses.forEach(({ address, bridgedAmounts }) => {
    if (bridgedAmounts && bridgedAmounts.tokens) {
      const { wstETH, rETH, apxETH } = bridgedAmounts.tokens;

      tokenData.wstETH.push({
        userAddress: address,
        standardBridgeAmount: wstETH.standardBridge.formatted,
        totalBridged: wstETH.total.formatted,
      });

      tokenData.rETH.push({
        userAddress: address,
        standardBridgeAmount: rETH.standardBridge.formatted,
        //@ts-ignore
        hopBridgeAmount: rETH.hopBridge.formatted,
        totalBridged: rETH.total.formatted,
      });

      tokenData.apxETH.push({
        userAddress: address,
        standardBridgeAmount: apxETH.standardBridge.formatted,
        //@ts-ignore
        apxETHBridgeAmount: apxETH.apxBridge.formatted,
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

const main = async () => {
  const addresses = readAddressesFromCSV();
  console.log("Unique addresses for each coin:");
  console.log(JSON.stringify(addresses, null, 2));

  // Combine all addresses for processing
  const allAddresses = [
    //...new Set([...addresses.APXETH, ...addresses.RETH, ...addresses.WSTETH]),
    "0xCAFd432b7EcAfff352D92fcB81c60380d437E99D"
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
    bridgedAmountsForAddresses as {
      address: string;
      bridgedAmounts: BridgedAmounts;
    }[]
  );

  // Log the results
  //console.log("Total Bridged Amounts for Multiple Addresses:");
  //console.log(JSON.stringify(bridgedAmountsForAddresses, null, 2));
};

main().catch((error) => {
  console.error("An error occurred in the main function:", error);
});
