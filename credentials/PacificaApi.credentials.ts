import {
  ICredentialType,
  INodeProperties,
} from 'n8n-workflow';

export class PacificaApi implements ICredentialType {
  name = 'pacificaApi';
  displayName = 'Pacifica API';
  documentationUrl = 'https://docs.pacifica.fi/api-documentation/api';

  properties: INodeProperties[] = [
    {
      displayName: 'Network',
      name: 'network',
      type: 'options',
      options: [
        { name: 'Mainnet', value: 'mainnet' },
        { name: 'Testnet', value: 'testnet' },
      ],
      default: 'mainnet',
      description: 'Pacifica network to connect to',
    },
    {
      displayName: 'Account Address',
      name: 'accountAddress',
      type: 'string',
      default: '',
      required: true,
      placeholder: '0x...',
      description: 'Your main wallet public address (the account that will be trading)',
    },
    {
      displayName: 'Agent Wallet Address',
      name: 'agentWalletAddress',
      type: 'string',
      default: '',
      required: true,
      placeholder: '0x...',
      description: 'API Agent wallet public address. Generate at https://app.pacifica.fi/apikey',
    },
    {
      displayName: 'Agent Private Key (Base58)',
      name: 'agentPrivateKey',
      type: 'string',
      typeOptions: {
        password: true,
      },
      default: '',
      required: true,
      placeholder: 'Base58 encoded private key...',
      description: 'API Agent private key in Base58 format (Solana-style). Generated at https://app.pacifica.fi/apikey. Encrypted at rest using AES-256.',
      hint: 'This is a Solana-style Ed25519 keypair. It can only sign trading requests and cannot withdraw funds.',
    },
  ];
}
