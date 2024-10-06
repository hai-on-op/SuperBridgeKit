# Super Bridge Kit

This tool analyzes bridged token amounts for wstETH, rETH, and apxETH across different bridges on the Optimism network.

## Setup

1. Clone the repository:
   ```
   git clone https://github.com/hai-on-op/rewards-bridge-kit
   cd rewards-bridge-kit
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create a `config.json` file based on `config.example.json`:
   ```
   cp config.example.json config.json
   ```

4. Edit `config.json` and fill in your specific values:
   - `API_KEY`: Your Covalent API key
   - `CHAIN_ID`: The chain ID (default is "optimism-mainnet")
   - `STANDARD_BRIDGE_ADDRESS`: The standard bridge contract address
   - `LZ_EXECUTOR_ADDRESS`: The LayerZero executor address
   - `CROSS_DOMAIN_MESSENGER_ADDRESS`: The cross-domain messenger address
   - `APX_ETH_ADDRESS`: The apxETH token address
   - `RETH_CONTRACT_ADDRESS`: The rETH token address
   - `WSTETH_CONTRACT_ADDRESS`: The wstETH token address
   - `FROM_BLOCK`: The starting block number for transaction filtering (default is 0)
   - `TO_BLOCK`: The ending block number for transaction filtering (use null for latest)

5. Create a `setup_files` directory in the project root:
   ```
   mkdir setup_files
   ```

6. Place your CSV files in the `setup_files` directory using the following naming convention:
   - `mint-reward_token-KITE_collateral-APXETH.csv`
   - `mint-reward_token-KITE_collateral-RETH.csv.csv`
   - `mint-reward_token-KITE_collateral-WSTETH.csv.csv`
   - `mint-reward_token-OP_collateral-APXETH.csv`
   - `mint-reward_token-OP_collateral-RETH.csv.csv`
   - `mint-reward_token-OP_collateral-WSTETH.csv.csv`

   Each CSV file should contain wallet addresses in the first column.

## Running the Script

To run the script, use the following command:
