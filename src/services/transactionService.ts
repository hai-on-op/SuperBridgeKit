import { GoldRushClient, Chain, Transaction } from "@covalenthq/client-sdk";

const MAX_RETRIES = 3;
const RETRY_DELAY = 2000; // 2 seconds

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function retryOperation<T>(
  operation: () => Promise<T>,
  retries: number = MAX_RETRIES,
  delay: number = RETRY_DELAY,
  attempt: number = 1
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (attempt === retries) {
      console.error(`Failed after ${retries} attempts:`, error);
      throw error;
    }
    console.log(`Attempt ${attempt} failed, retrying in ${delay/1000} seconds...`);
    await sleep(delay);
    return retryOperation(operation, retries, delay * 1.5, attempt + 1);
  }
}

export const createCovalentFetcher =
  (apiKey: string, chainId: Chain) => async (walletAddress: string) => {
    console.log(`Starting to fetch transactions for wallet: ${walletAddress}`);
    console.log(`Chain ID: ${chainId}`);

    const client = new GoldRushClient(apiKey);
    let allTransactions: Transaction[] = [];
    let pageNumber = 0;
    let hasNextPage = true;
    const MAX_PAGES = 100;

    console.log("Fetching transactions...");

    while (hasNextPage && pageNumber < MAX_PAGES) {
      try {
        console.log(`Fetching page ${pageNumber}...`);
        
        const resp = await retryOperation(async () => {
          const response = await client.TransactionService.getTransactionsForAddressV3(
            chainId,
            walletAddress,
            pageNumber
          );

          if (response.error) {
            console.error(response)
            throw new Error(`API Error: ${response.error_message}`);
          }

          return response;
        });

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

        // Add delay between pages to avoid rate limiting
        if (hasNextPage) {
          await sleep(500); // 500ms delay between pages
        }

      } catch (error) {
        console.error(`Failed to fetch page ${pageNumber} after all retries:`, error);
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
