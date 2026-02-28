# DAO Treasury Multisig - Web Frontend

A production-ready web application for managing a Solana DAO treasury with multisig proposal voting and execution.

## Architecture

### Frontend Stack
- **React 18.2.0** - UI framework
- **Vite 5.4.21** - Build tool and dev server
- **TypeScript 5.3.3** - Type safety
- **Solana Web3.js 1.87.0** - Blockchain interaction
- **@coral-xyz/anchor 0.29.0** - Smart contract framework client

### Blockchain Integration
- **Network**: Solana devnet (configurable to testnet/mainnet)
- **Cluster**: devnet via `clusterApiUrl()`
- **Commitment**: "confirmed" for transaction finality
- **Wallet**: Phantom wallet browser extension integration

### Components

#### Dashboard (`components/Dashboard.tsx`)
- Wallet connection status and address display
- Real-time SOL balance from blockchain
- Proposal list fetched from on-chain program
- Proposal voting interface (approve/reject)
- Execution capability for approved proposals
- Error handling and loading states

#### ProposalForm (`components/ProposalForm.tsx`)
- Create new treasury proposals
- Input validation:
  - Description (non-empty string)
  - Recipient (valid Solana address)
  - Amount (positive SOL value)
- Form submission with wallet signature
- Success/error feedback

### Services

#### WalletService (`services/wallet.ts`)
- Phantom wallet detection and connection
- Wallet state management
- Transaction signing (single and batch)
- Message signing
- Connect/disconnect lifecycle

#### AnchorService (`services/anchor.ts`)
- Anchor program initialization
- RPC methods:
  - `createProposal()` - Submit new treasury proposal
  - `getProposals()` - Fetch all proposals from blockchain
  - `voteOnProposal()` - Vote on pending proposals
  - `executeProposal()` - Execute approved proposals
- Error handling and fallback states

#### SolanService (`services/solana.ts`)
- Low-level Solana RPC interaction
- Balance queries
- Airdrop requests (devnet)
- Account information retrieval

## Getting Started

### Prerequisites
- Node.js v18+ and npm v9+
- Phantom wallet browser extension
- Solana devnet SOL (use devnet faucet)

### Installation

```bash
cd web
npm install
```

### Development Server

```bash
npm run dev
```

Server starts on `http://localhost:5174` (or next available port if 5174 is in use)

### Build for Production

```bash
npm run build
```

Output: `dist/` directory

### Preview Production Build

```bash
npm run preview
```

## Smart Contract Deployment

The web frontend requires a deployed Solana program. Follow these steps:

### 1. Deploy the Anchor Program

```bash
# From project root
cd programs/multisig_dao

# Build the program
cargo build-sbf --manifest-path Cargo.toml

# Deploy to devnet
anchor deploy --provider.cluster devnet
```

### 2. Update Program ID

After deployment, update the `PROGRAM_ID` in `web/src/services/anchor.ts`:

```typescript
const PROGRAM_ID = new PublicKey('YOUR_ACTUAL_PROGRAM_ID')
```

## Usage Flow

### 1. Connect Wallet
- Click "Connect Phantom Wallet"
- Approve connection in wallet popup
- Dashboard loads with your balance and proposals

### 2. View Proposals
- Dashboard displays all treasury proposals
- Shows status: pending, approved, rejected, or executed
- Click proposal to view details

### 3. Create Proposal
- Click "+ Create New Proposal"
- Fill in:
  - **Description**: What the proposal is for
  - **Recipient**: Solana address receiving funds
  - **Amount**: SOL amount to transfer
- Sign transaction with Phantom
- Proposal appears in list once confirmed

### 4. Vote on Proposals
- Select pending proposal
- Click "Approve" or "Reject"
- Sign transaction with Phantom
- Vote recorded on-chain

### 5. Execute Proposal
- Select approved proposal
- Click "Execute"
- Funds transferred to recipient
- Proposal status updated to executed

## Configuration

### Network Settings
Edit `web/src/services/solana.ts`:
```typescript
// Switch networks
clusterApiUrl('devnet')    // Development
clusterApiUrl('testnet')   // Testing
clusterApiUrl('mainnet-beta') // Production
```

### RPC Endpoint
Customize in `SolanService.constructor()`:
```typescript
this.connection = new Connection(
  'YOUR_CUSTOM_RPC_URL',
  'confirmed'
)
```

## Error Handling

The application gracefully handles:
- Wallet not connected
- Network failures
- Invalid addresses
- Insufficient balance
- Program deployment issues (shows helpful error messages)

## Development Notes

### Mock Data
The application was designed to use **real blockchain data only**. No mock data is used in production builds.

### Phantom Wallet Integration
- Window object must have `window.solana` (injected by Phantom)
- All transactions require wallet signatures
- Messages are signed but not verified in this version

### IDL Management
The Anchor program IDL is embedded in `anchor.ts`. After smart contract changes:
1. Regenerate IDL from program: `anchor build`
2. Update the `IDL` constant in `anchor.ts`

## Troubleshooting

### "Phantom wallet not found"
- Install Phantom wallet extension
- Ensure it's enabled in browser extensions

### Transaction failures
- Check you have devnet SOL (use faucet: https://faucet.solana.com)
- Verify program is deployed: check `anchor.json` for program ID
- Verify program_id in code matches

### Proposals not loading
- Program not deployed yet
- Wrong PROGRAM_ID in code
- Check browser console for RPC errors

### Build errors
- Clear cache: `rm -rf node_modules && npm install`
- Ensure Node.js v18+

## File Structure

```
web/
├── src/
│   ├── components/
│   │   ├── Dashboard.tsx       # Main UI with proposals
│   │   └── ProposalForm.tsx    # Create proposal form
│   ├── services/
│   │   ├── anchor.ts           # Smart contract interaction
│   │   ├── wallet.ts           # Phantom wallet integration
│   │   └── solana.ts           # RPC calls
│   ├── App.tsx                 # Main router component
│   ├── App.css                 # Application styling
│   ├── index.css               # Global styles
│   └── main.tsx                # Entry point
├── vite.config.ts              # Vite configuration
├── tsconfig.json               # TypeScript configuration
└── package.json                # Dependencies
```

## Next Steps

1. **Deploy Smart Contract**: Complete Anchor program deployment
2. **Update Program ID**: Set correct program ID in code
3. **Test Flow**: Create proposals and vote on devnet
4. **Monitor Balance**: Ensure treasury has sufficient SOL
5. **Scale to Production**: Switch to mainnet after testing

## Security Considerations

- **Never** expose private keys in code or environment variables
- All transactions require user wallet signature
- Program ID should be verified before use
- Validate all recipient addresses in frontend and smart contract
- Use devnet for testing before mainnet deployment

## Resources

- [Solana Documentation](https://docs.solana.com)
- [Anchor Framework](https://www.anchor-lang.com)
- [Web3.js Documentation](https://solana-labs.github.io/solana-web3.js)
- [Phantom Wallet Docs](https://docs.phantom.app)

## License

MIT - See LICENSE file in project root

## Support

For issues or questions:
1. Check browser console for detailed error messages
2. Verify smart contract deployment
3. Check Solana devnet status: https://status.solana.com
4. Review program logs: `solana logs YOUR_PROGRAM_ID --url devnet`
