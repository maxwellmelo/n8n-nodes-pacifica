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
      displayName: 'Agent Private Key',
      name: 'agentPrivateKey',
      type: 'string',
      typeOptions: {
        password: true,
      },
      default: '',
      required: true,
      placeholder: '0x...',
      description: 'API Agent private key (64 hex characters with 0x prefix). Used to sign requests. Encrypted at rest using AES-256.',
      hint: 'This key is used only for signing trading requests and cannot withdraw funds.',
    },
  ];
}
