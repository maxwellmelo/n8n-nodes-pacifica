# Authentication Fix - v0.1.1

## Summary

Corrected the authentication system from Ethereum/ethers.js to Solana-style Ed25519 + Base58 signing as required by Pacifica API.

## Problem Discovered

The initial implementation (v0.1.0) incorrectly used Ethereum-style signing with ethers.js. After studying the Pacifica API documentation at https://docs.pacifica.fi/api-documentation/api/signing/api-agent-keys, it was discovered that Pacifica uses:

- **Solana-style Ed25519 keypairs** (not Ethereum secp256k1)
- **Base58 encoding** for keys and signatures (not hex)
- **Specific message format** with alphabetically sorted keys

## Changes Made

### 1. `transport/pacificaClient.ts` - Complete Rewrite

**BEFORE (v0.1.0):**
```typescript
// Used ethers.js for Ethereum-style signing
import { ethers } from 'ethers';

private async signMessage(message: string): Promise<string> {
  const wallet = new ethers.Wallet(this.privateKey);
  return await wallet.signMessage(message);
}
```

**AFTER (v0.1.1):**
```typescript
// Uses Node.js crypto for Ed25519 signing with Base58
import * as crypto from 'crypto';

const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

function base58Encode(bytes: Uint8Array): string { ... }
function base58Decode(str: string): Uint8Array { ... }
function sortJsonKeys(obj: unknown): unknown { ... }

async function ed25519Sign(message: Uint8Array, privateKey: Uint8Array): Promise<Uint8Array> {
  // Creates Ed25519 key from seed and signs
  const keyObject = crypto.createPrivateKey({
    key: Buffer.concat([
      Buffer.from('302e020100300506032b657004220420', 'hex'), // Ed25519 ASN.1 prefix
      Buffer.from(seed),
    ]),
    format: 'der',
    type: 'pkcs8',
  });
  return crypto.sign(null, Buffer.from(message), keyObject);
}
```

**Advantages:**
- Correct cryptographic algorithm (Ed25519 vs secp256k1)
- No external dependencies (uses Node.js built-in crypto)
- Matches Pacifica API requirements exactly

### 2. `credentials/PacificaApi.credentials.ts`

**BEFORE (v0.1.0):**
```typescript
{
  displayName: 'Agent Private Key',
  name: 'agentPrivateKey',
  placeholder: '0x...',
  description: 'API Agent private key in hex format',
}
```

**AFTER (v0.1.1):**
```typescript
{
  displayName: 'Agent Private Key (Base58)',
  name: 'agentPrivateKey',
  placeholder: 'Base58 encoded private key...',
  description: 'API Agent private key in Base58 format (Solana-style). Generated at https://app.pacifica.fi/apikey.',
  hint: 'This is a Solana-style Ed25519 keypair. It can only sign trading requests and cannot withdraw funds.',
}
```

**Advantages:**
- Clear indication of expected key format
- Helpful hints for users
- Link to key generation page

### 3. `nodes/Pacifica/Pacifica.node.ts`

**BEFORE (v0.1.0):**
```typescript
// Validated hex format
if (!agentPrivateKey.startsWith('0x') || agentPrivateKey.length !== 66) {
  throw new NodeOperationError(this.getNode(), 'Invalid agent private key format');
}
```

**AFTER (v0.1.1):**
```typescript
// Validates Base58 format
if (!agentPrivateKey.match(/^[1-9A-HJ-NP-Za-km-z]{32,88}$/)) {
  throw new NodeOperationError(
    this.getNode(),
    'Invalid agent private key format. Must be a Base58 encoded Solana-style key.'
  );
}
```

**Advantages:**
- Validates correct Base58 character set
- Accepts valid Solana keypair lengths (32-88 chars)
- Better error messages

### 4. `package.json`

**BEFORE (v0.1.0):**
```json
"dependencies": {
  "ethers": "^6.0.0"
}
```

**AFTER (v0.1.1):**
```json
"dependencies": {}
```

**Advantages:**
- Removed unnecessary 1.5MB+ dependency
- Faster install times
- No external cryptographic dependencies
- Uses Node.js built-in crypto module

## Message Signing Format

Pacifica requires this specific format for signed messages:

```typescript
{
  type: 'operation_type',        // e.g., 'create_limit_order'
  timestamp: 1703123456789,      // Unix timestamp in milliseconds
  expiry_window: 5000,           // 5 seconds
  data: { /* payload */ }        // Operation-specific data
}
```

All keys must be sorted alphabetically before JSON serialization.

## Published Versions

- **npm:** https://www.npmjs.com/package/n8n-nodes-pacifica (v0.1.1)
- **GitHub:** https://github.com/maxwellmelo/n8n-nodes-pacifica

## Testing

To test the authentication:
1. Generate API Agent keys at https://app.pacifica.fi/apikey
2. Configure credentials in n8n with your Base58 private key
3. Try a simple operation like "Get Account Info" or "Get Positions"
