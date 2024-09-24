# OptiBridgeKit

OptiBridgeKit is a TypeScript library for getting specific data from Optimism bridges. It provides a modular and extensible framework for interacting with various bridges on the Optimism network.

## Installation

```bash
npm install optibridgekit
```

## Usage

```typescript
import { BridgeManager, BridgeInfo } from "optibridgekit";

const bridgeInfos: BridgeInfo[] = [
  { address: "0x4200000000000000000000000000000000000010", type: "standard" },
  // Add more bridges as needed
];

const bridgeManager = new BridgeManager(bridgeInfos);

async function main() {
  const walletAddress = "0x...";
  const tokens = ["0x...", "0x..."];

  const balances = await bridgeManager.getBridgedBalances(
    walletAddress,
    tokens
  );
  console.log(balances);
}

main().catch(console.error);
```

## Development

To set up the project for development:

1. Clone the repository
2. Install dependencies: `npm install`
3. Build the project: `npm run build`
4. Run tests: `npm test`

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License.
