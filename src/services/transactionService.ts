import { GoldRushClient, Chain, Transaction } from "@covalenthq/client-sdk";

export const createCovalentFetcher =
  (apiKey: string, chainId: Chain) => async (walletAddress: string) => {
    console.log(`Starting to fetch transactions for wallet: ${walletAddress}`);
    console.log(`Chain ID: ${chainId}`);

    const client = new GoldRushClient(apiKey);
    let allTransactions: Transaction[] = [];
    let pageNumber = 0;
    let hasNextPage = true;
    const MAX_PAGES = 100; // Adjust this value as needed

    console.log("Fetching transactions...");

    while (hasNextPage && pageNumber < MAX_PAGES) {
      try {
        console.log(`Fetching page ${pageNumber}...`);
        const resp =
          await client.TransactionService.getTransactionsForAddressV3(
            chainId,
            walletAddress,
            pageNumber
          );

        if (resp.data?.items) {
          const newTransactions = resp.data.items;
          allTransactions = allTransactions.concat(newTransactions);
          console.log(
            `Fetched ${newTransactions.length} transactions from page ${pageNumber}`
          );
          console.log(`Total transactions fetched: ${allTransactions.length}`);
        } else {
          console.log(`No transactions found on page ${pageNumber}`);
        }

        hasNextPage = resp.data?.links?.next !== null;
        pageNumber++;

        if (resp.error) {
          console.error(
            `Error fetching page ${pageNumber}:`,
            resp.error_message
          );
          break;
        }
      } catch (error) {
        console.error(`Error fetching page ${pageNumber}:`, error);
        break;
      }
    }

    if (pageNumber >= MAX_PAGES) {
      console.warn(
        `Reached maximum number of pages (${MAX_PAGES}). Some transactions might be missing.`
      );
    }

    console.log(
      `Finished fetching transactions. Total fetched: ${allTransactions.length}`
    );
    return allTransactions;
  };

export const filterTransactionsByBlockRange = (
  transactions: Transaction[],
  fromBlock: number = 0,
  toBlock: number | null = null
): Transaction[] => {
  return transactions.filter((tx) => {
    const blockHeight = tx.block_height;
    if (blockHeight === undefined || blockHeight === null) return false;
    if (blockHeight < fromBlock) return false;
    if (toBlock !== null && blockHeight > toBlock) return false;
    return true;
  });
};
