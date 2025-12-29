import {
  IExecuteFunctions,
  INodeExecutionData,
  INodeType,
  INodeTypeDescription,
  NodeOperationError,
} from 'n8n-workflow';
import { PacificaClient } from './transport/pacificaClient';
import {
  PacificaResponse,
  MarketInfo,
  PriceInfo,
  Position,
  AccountInfo,
} from './types';

export class Pacifica implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'Pacifica',
    name: 'pacifica',
    icon: 'file:pacifica.svg',
    group: ['transform'],
    version: 1,
    subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
    description: 'Trade perpetuals and query data on Pacifica DEX',
    defaults: {
      name: 'Pacifica',
    },
    inputs: ['main'],
    outputs: ['main'],
    credentials: [
      {
        name: 'pacificaApi',
        required: true,
      },
    ],
    properties: [
      // ========== RESOURCE SELECTOR ==========
      {
        displayName: 'Resource',
        name: 'resource',
        type: 'options',
        noDataExpression: true,
        options: [
          { name: 'Market Data', value: 'marketData' },
          { name: 'Account', value: 'account' },
          { name: 'Order', value: 'order' },
          { name: 'Position', value: 'position' },
          { name: 'Subaccount', value: 'subaccount' },
        ],
        default: 'marketData',
      },

      // ========== MARKET DATA OPERATIONS ==========
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: { show: { resource: ['marketData'] } },
        options: [
          { name: 'Get Market Info', value: 'getMarketInfo', action: 'Get market info for all trading pairs' },
          { name: 'Get Prices', value: 'getPrices', action: 'Get price info for all symbols' },
          { name: 'Get Orderbook', value: 'getOrderbook', action: 'Get orderbook for a symbol' },
          { name: 'Get Candles', value: 'getCandles', action: 'Get historical candle data' },
          { name: 'Get Recent Trades', value: 'getRecentTrades', action: 'Get recent trades for a symbol' },
          { name: 'Get Historical Funding', value: 'getHistoricalFunding', action: 'Get historical funding rates' },
        ],
        default: 'getMarketInfo',
      },

      // Market Data Parameters
      {
        displayName: 'Symbol',
        name: 'symbol',
        type: 'string',
        default: 'BTC',
        placeholder: 'BTC, ETH, SOL...',
        displayOptions: {
          show: {
            resource: ['marketData'],
            operation: ['getOrderbook', 'getCandles', 'getRecentTrades', 'getHistoricalFunding'],
          },
        },
        description: 'Trading pair symbol',
      },
      {
        displayName: 'Interval',
        name: 'interval',
        type: 'options',
        options: [
          { name: '1 Minute', value: '1m' },
          { name: '3 Minutes', value: '3m' },
          { name: '5 Minutes', value: '5m' },
          { name: '15 Minutes', value: '15m' },
          { name: '30 Minutes', value: '30m' },
          { name: '1 Hour', value: '1h' },
          { name: '2 Hours', value: '2h' },
          { name: '4 Hours', value: '4h' },
          { name: '8 Hours', value: '8h' },
          { name: '12 Hours', value: '12h' },
          { name: '1 Day', value: '1d' },
        ],
        default: '1h',
        displayOptions: {
          show: {
            resource: ['marketData'],
            operation: ['getCandles'],
          },
        },
        description: 'Candle interval',
      },
      {
        displayName: 'Start Time (ms)',
        name: 'startTime',
        type: 'number',
        default: 0,
        displayOptions: {
          show: {
            resource: ['marketData'],
            operation: ['getCandles'],
          },
        },
        description: 'Start timestamp in milliseconds',
      },
      {
        displayName: 'End Time (ms)',
        name: 'endTime',
        type: 'number',
        default: 0,
        displayOptions: {
          show: {
            resource: ['marketData'],
            operation: ['getCandles'],
          },
        },
        description: 'End timestamp in milliseconds (0 = now)',
      },
      {
        displayName: 'Aggregation Level',
        name: 'aggLevel',
        type: 'number',
        default: 1,
        displayOptions: {
          show: {
            resource: ['marketData'],
            operation: ['getOrderbook'],
          },
        },
        description: 'Price aggregation level for orderbook',
      },
      {
        displayName: 'Limit',
        name: 'fundingLimit',
        type: 'number',
        default: 100,
        typeOptions: { minValue: 1, maxValue: 4000 },
        displayOptions: {
          show: {
            resource: ['marketData'],
            operation: ['getHistoricalFunding'],
          },
        },
        description: 'Max number of funding records to return',
      },

      // ========== ACCOUNT OPERATIONS ==========
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: { show: { resource: ['account'] } },
        options: [
          { name: 'Get Account Info', value: 'getAccountInfo', action: 'Get account info' },
          { name: 'Get Trade History', value: 'getTradeHistory', action: 'Get trade history' },
        ],
        default: 'getAccountInfo',
      },

      // Trade History Parameters
      {
        displayName: 'Symbol (Optional)',
        name: 'tradeSymbol',
        type: 'string',
        default: '',
        placeholder: 'BTC (leave empty for all)',
        displayOptions: {
          show: {
            resource: ['account'],
            operation: ['getTradeHistory'],
          },
        },
        description: 'Filter by symbol (optional)',
      },
      {
        displayName: 'Start Time (ms)',
        name: 'tradeStartTime',
        type: 'number',
        default: 0,
        displayOptions: {
          show: {
            resource: ['account'],
            operation: ['getTradeHistory'],
          },
        },
      },
      {
        displayName: 'End Time (ms)',
        name: 'tradeEndTime',
        type: 'number',
        default: 0,
        displayOptions: {
          show: {
            resource: ['account'],
            operation: ['getTradeHistory'],
          },
        },
      },
      {
        displayName: 'Limit',
        name: 'tradeLimit',
        type: 'number',
        default: 100,
        typeOptions: { minValue: 1, maxValue: 1000 },
        displayOptions: {
          show: {
            resource: ['account'],
            operation: ['getTradeHistory'],
          },
        },
      },

      // ========== ORDER OPERATIONS ==========
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: { show: { resource: ['order'] } },
        options: [
          { name: 'Create Market Order', value: 'createMarketOrder', action: 'Create market order' },
          { name: 'Create Limit Order', value: 'createLimitOrder', action: 'Create limit order' },
          { name: 'Cancel Order', value: 'cancelOrder', action: 'Cancel order' },
          { name: 'Cancel All Orders', value: 'cancelAllOrders', action: 'Cancel all orders' },
          { name: 'Get Open Orders', value: 'getOpenOrders', action: 'Get open orders' },
        ],
        default: 'getOpenOrders',
      },

      // Order Parameters
      {
        displayName: 'Symbol',
        name: 'orderSymbol',
        type: 'string',
        default: 'BTC',
        placeholder: 'BTC, ETH, SOL...',
        displayOptions: {
          show: {
            resource: ['order'],
            operation: ['createMarketOrder', 'createLimitOrder', 'cancelOrder'],
          },
        },
        description: 'Trading pair symbol',
      },
      {
        displayName: 'Side',
        name: 'side',
        type: 'options',
        options: [
          { name: 'Buy / Long', value: 'bid' },
          { name: 'Sell / Short', value: 'ask' },
        ],
        default: 'bid',
        displayOptions: {
          show: {
            resource: ['order'],
            operation: ['createMarketOrder', 'createLimitOrder'],
          },
        },
      },
      {
        displayName: 'Amount',
        name: 'amount',
        type: 'string',
        default: '0.001',
        displayOptions: {
          show: {
            resource: ['order'],
            operation: ['createMarketOrder', 'createLimitOrder'],
          },
        },
        description: 'Order amount in base asset units',
      },
      {
        displayName: 'Price',
        name: 'price',
        type: 'string',
        default: '0',
        displayOptions: {
          show: {
            resource: ['order'],
            operation: ['createLimitOrder'],
          },
        },
        description: 'Limit price for the order',
      },
      {
        displayName: 'Slippage %',
        name: 'slippagePercent',
        type: 'string',
        default: '0.5',
        displayOptions: {
          show: {
            resource: ['order'],
            operation: ['createMarketOrder'],
          },
        },
        description: 'Maximum slippage tolerance (e.g., 0.5 = 0.5%)',
      },
      {
        displayName: 'Time In Force',
        name: 'tif',
        type: 'options',
        options: [
          { name: 'Good Til Canceled (GTC)', value: 'GTC' },
          { name: 'Immediate Or Cancel (IOC)', value: 'IOC' },
          { name: 'Post Only (ALO)', value: 'ALO' },
          { name: 'Time on Book (TOB)', value: 'TOB' },
        ],
        default: 'GTC',
        displayOptions: {
          show: {
            resource: ['order'],
            operation: ['createLimitOrder'],
          },
        },
      },
      {
        displayName: 'Reduce Only',
        name: 'reduceOnly',
        type: 'boolean',
        default: false,
        displayOptions: {
          show: {
            resource: ['order'],
            operation: ['createMarketOrder', 'createLimitOrder'],
          },
        },
        description: 'Whether order can only reduce an existing position',
      },
      {
        displayName: 'Client Order ID',
        name: 'clientOrderId',
        type: 'string',
        default: '',
        displayOptions: {
          show: {
            resource: ['order'],
            operation: ['createMarketOrder', 'createLimitOrder', 'cancelOrder'],
          },
        },
        description: 'Optional client-defined order identifier (UUID)',
      },
      {
        displayName: 'Order ID',
        name: 'orderId',
        type: 'number',
        default: 0,
        displayOptions: {
          show: {
            resource: ['order'],
            operation: ['cancelOrder'],
          },
        },
        description: 'Exchange order ID to cancel (use either this or Client Order ID)',
      },
      {
        displayName: 'Symbols to Cancel',
        name: 'cancelSymbols',
        type: 'string',
        default: '',
        placeholder: 'BTC,ETH,SOL (leave empty for all)',
        displayOptions: {
          show: {
            resource: ['order'],
            operation: ['cancelAllOrders'],
          },
        },
        description: 'Comma-separated list of symbols to cancel orders for (empty = all)',
      },

      // ========== POSITION OPERATIONS ==========
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: { show: { resource: ['position'] } },
        options: [
          { name: 'Get Positions', value: 'getPositions', action: 'Get open positions' },
          { name: 'Update Leverage', value: 'updateLeverage', action: 'Update leverage' },
          { name: 'Update Margin Mode', value: 'updateMarginMode', action: 'Update margin mode' },
          { name: 'Close Position', value: 'closePosition', action: 'Close position with market order' },
        ],
        default: 'getPositions',
      },

      // Position Parameters
      {
        displayName: 'Symbol',
        name: 'positionSymbol',
        type: 'string',
        default: 'BTC',
        displayOptions: {
          show: {
            resource: ['position'],
            operation: ['updateLeverage', 'updateMarginMode', 'closePosition'],
          },
        },
      },
      {
        displayName: 'Leverage',
        name: 'leverage',
        type: 'number',
        default: 10,
        typeOptions: { minValue: 1, maxValue: 100 },
        displayOptions: {
          show: {
            resource: ['position'],
            operation: ['updateLeverage'],
          },
        },
      },
      {
        displayName: 'Margin Mode',
        name: 'marginMode',
        type: 'options',
        options: [
          { name: 'Cross', value: 'cross' },
          { name: 'Isolated', value: 'isolated' },
        ],
        default: 'cross',
        displayOptions: {
          show: {
            resource: ['position'],
            operation: ['updateLeverage', 'updateMarginMode'],
          },
        },
      },
      {
        displayName: 'Slippage %',
        name: 'closeSlippage',
        type: 'string',
        default: '0.5',
        displayOptions: {
          show: {
            resource: ['position'],
            operation: ['closePosition'],
          },
        },
        description: 'Maximum slippage for close position market order',
      },

      // ========== SUBACCOUNT OPERATIONS ==========
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: { show: { resource: ['subaccount'] } },
        options: [
          { name: 'Create Subaccount', value: 'createSubaccount', action: 'Create subaccount' },
          { name: 'List Subaccounts', value: 'listSubaccounts', action: 'List subaccounts' },
          { name: 'Transfer Funds', value: 'transferFunds', action: 'Transfer funds between subaccounts' },
        ],
        default: 'listSubaccounts',
      },

      // Subaccount Parameters
      {
        displayName: 'Subaccount Name',
        name: 'subaccountName',
        type: 'string',
        default: '',
        displayOptions: {
          show: {
            resource: ['subaccount'],
            operation: ['createSubaccount'],
          },
        },
      },
      {
        displayName: 'From Account',
        name: 'fromAccount',
        type: 'string',
        default: '',
        displayOptions: {
          show: {
            resource: ['subaccount'],
            operation: ['transferFunds'],
          },
        },
        description: 'Source account address',
      },
      {
        displayName: 'To Account',
        name: 'toAccount',
        type: 'string',
        default: '',
        displayOptions: {
          show: {
            resource: ['subaccount'],
            operation: ['transferFunds'],
          },
        },
        description: 'Destination account address',
      },
      {
        displayName: 'Transfer Amount',
        name: 'transferAmount',
        type: 'string',
        default: '0',
        displayOptions: {
          show: {
            resource: ['subaccount'],
            operation: ['transferFunds'],
          },
        },
        description: 'Amount to transfer (USD)',
      },
    ],
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();
    const returnData: INodeExecutionData[] = [];

    // Get credentials
    const credentials = await this.getCredentials('pacificaApi');
    const network = credentials.network as string;
    const accountAddress = credentials.accountAddress as string;
    const agentWalletAddress = credentials.agentWalletAddress as string;
    const agentPrivateKey = credentials.agentPrivateKey as string;

    // Validate private key format (Base58 Solana-style)
    // Base58 alphabet: 123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz
    if (!agentPrivateKey.match(/^[1-9A-HJ-NP-Za-km-z]{32,88}$/)) {
      throw new NodeOperationError(
        this.getNode(),
        'Invalid agent private key format. Must be a Base58 encoded Solana-style key.'
      );
    }

    // Initialize client
    const client = new PacificaClient(
      agentPrivateKey,
      accountAddress,
      agentWalletAddress,
      network === 'mainnet'
    );

    for (let i = 0; i < items.length; i++) {
      try {
        const resource = this.getNodeParameter('resource', i) as string;
        const operation = this.getNodeParameter('operation', i) as string;

        let result: unknown;

        // ========== MARKET DATA OPERATIONS ==========
        if (resource === 'marketData') {
          if (operation === 'getMarketInfo') {
            const response = await client.getMarketInfo() as PacificaResponse<MarketInfo[]>;
            result = response.data;
          }

          if (operation === 'getPrices') {
            const response = await client.getPrices() as PacificaResponse<PriceInfo[]>;
            result = response.data;
          }

          if (operation === 'getOrderbook') {
            const symbol = this.getNodeParameter('symbol', i) as string;
            const aggLevel = this.getNodeParameter('aggLevel', i) as number;
            const response = await client.getOrderbook(symbol.toUpperCase(), aggLevel);
            result = response.data;
          }

          if (operation === 'getCandles') {
            const symbol = this.getNodeParameter('symbol', i) as string;
            const interval = this.getNodeParameter('interval', i) as string;
            const startTime = this.getNodeParameter('startTime', i) as number;
            const endTime = this.getNodeParameter('endTime', i) as number;
            const response = await client.getCandles(
              symbol.toUpperCase(),
              interval,
              startTime,
              endTime || undefined
            );
            result = response.data;
          }

          if (operation === 'getRecentTrades') {
            const symbol = this.getNodeParameter('symbol', i) as string;
            const response = await client.getRecentTrades(symbol.toUpperCase());
            result = response.data;
          }

          if (operation === 'getHistoricalFunding') {
            const symbol = this.getNodeParameter('symbol', i) as string;
            const limit = this.getNodeParameter('fundingLimit', i) as number;
            const response = await client.getHistoricalFunding(symbol.toUpperCase(), limit);
            result = response.data;
          }
        }

        // ========== ACCOUNT OPERATIONS ==========
        if (resource === 'account') {
          if (operation === 'getAccountInfo') {
            const response = await client.getAccountInfo() as PacificaResponse<AccountInfo>;
            result = response.data;
          }

          if (operation === 'getTradeHistory') {
            const symbol = this.getNodeParameter('tradeSymbol', i) as string;
            const startTime = this.getNodeParameter('tradeStartTime', i) as number;
            const endTime = this.getNodeParameter('tradeEndTime', i) as number;
            const limit = this.getNodeParameter('tradeLimit', i) as number;
            const response = await client.getTradeHistory(
              symbol || undefined,
              startTime || undefined,
              endTime || undefined,
              limit
            );
            result = response.data;
          }
        }

        // ========== ORDER OPERATIONS ==========
        if (resource === 'order') {
          if (operation === 'getOpenOrders') {
            const response = await client.getOpenOrders();
            result = response.data;
          }

          if (operation === 'createMarketOrder') {
            const symbol = this.getNodeParameter('orderSymbol', i) as string;
            const side = this.getNodeParameter('side', i) as 'bid' | 'ask';
            const amount = this.getNodeParameter('amount', i) as string;
            const slippage = this.getNodeParameter('slippagePercent', i) as string;
            const reduceOnly = this.getNodeParameter('reduceOnly', i) as boolean;
            const clientOrderId = this.getNodeParameter('clientOrderId', i) as string;

            result = await client.createMarketOrder(
              symbol.toUpperCase(),
              side,
              amount,
              slippage,
              reduceOnly,
              clientOrderId || undefined
            );
          }

          if (operation === 'createLimitOrder') {
            const symbol = this.getNodeParameter('orderSymbol', i) as string;
            const side = this.getNodeParameter('side', i) as 'bid' | 'ask';
            const price = this.getNodeParameter('price', i) as string;
            const amount = this.getNodeParameter('amount', i) as string;
            const tif = this.getNodeParameter('tif', i) as 'GTC' | 'IOC' | 'ALO' | 'TOB';
            const reduceOnly = this.getNodeParameter('reduceOnly', i) as boolean;
            const clientOrderId = this.getNodeParameter('clientOrderId', i) as string;

            result = await client.createLimitOrder(
              symbol.toUpperCase(),
              side,
              price,
              amount,
              tif,
              reduceOnly,
              clientOrderId || undefined
            );
          }

          if (operation === 'cancelOrder') {
            const symbol = this.getNodeParameter('orderSymbol', i) as string;
            const orderId = this.getNodeParameter('orderId', i) as number;
            const clientOrderId = this.getNodeParameter('clientOrderId', i) as string;

            result = await client.cancelOrder(
              symbol.toUpperCase(),
              orderId || undefined,
              clientOrderId || undefined
            );
          }

          if (operation === 'cancelAllOrders') {
            const cancelSymbolsStr = this.getNodeParameter('cancelSymbols', i) as string;
            const symbols = cancelSymbolsStr
              ? cancelSymbolsStr.split(',').map(s => s.trim().toUpperCase())
              : undefined;

            result = await client.cancelAllOrders(symbols);
          }
        }

        // ========== POSITION OPERATIONS ==========
        if (resource === 'position') {
          if (operation === 'getPositions') {
            const response = await client.getPositions() as PacificaResponse<Position[]>;
            // Filter to only show positions with non-zero amounts
            result = response.data.filter(
              (pos: Position) => parseFloat(pos.amount) !== 0
            );
          }

          if (operation === 'updateLeverage') {
            const symbol = this.getNodeParameter('positionSymbol', i) as string;
            const leverage = this.getNodeParameter('leverage', i) as number;
            const marginMode = this.getNodeParameter('marginMode', i) as 'cross' | 'isolated';

            result = await client.updateLeverage(symbol.toUpperCase(), leverage, marginMode);
          }

          if (operation === 'updateMarginMode') {
            const symbol = this.getNodeParameter('positionSymbol', i) as string;
            const marginMode = this.getNodeParameter('marginMode', i) as 'cross' | 'isolated';

            result = await client.updateMarginMode(symbol.toUpperCase(), marginMode);
          }

          if (operation === 'closePosition') {
            const symbol = this.getNodeParameter('positionSymbol', i) as string;
            const slippage = this.getNodeParameter('closeSlippage', i) as string;

            // Get current position
            const positionsResponse = await client.getPositions() as PacificaResponse<Position[]>;
            const position = positionsResponse.data.find(
              (pos: Position) => pos.symbol.toUpperCase() === symbol.toUpperCase()
            );

            if (!position || parseFloat(position.amount) === 0) {
              throw new NodeOperationError(this.getNode(), `No open position found for ${symbol}`);
            }

            const positionSize = parseFloat(position.amount);
            const isLong = positionSize > 0;
            const amount = Math.abs(positionSize).toString();

            // To close: if long, sell (ask); if short, buy (bid)
            result = await client.createMarketOrder(
              symbol.toUpperCase(),
              isLong ? 'ask' : 'bid',
              amount,
              slippage,
              true // Always reduce only for close
            );
          }
        }

        // ========== SUBACCOUNT OPERATIONS ==========
        if (resource === 'subaccount') {
          if (operation === 'listSubaccounts') {
            const response = await client.listSubaccounts();
            result = response.data;
          }

          if (operation === 'createSubaccount') {
            const name = this.getNodeParameter('subaccountName', i) as string;
            result = await client.createSubaccount(name);
          }

          if (operation === 'transferFunds') {
            const fromAccount = this.getNodeParameter('fromAccount', i) as string;
            const toAccount = this.getNodeParameter('toAccount', i) as string;
            const amount = this.getNodeParameter('transferAmount', i) as string;

            result = await client.transferFunds(fromAccount, toAccount, amount);
          }
        }

        returnData.push({
          json: result as INodeExecutionData['json'],
          pairedItem: { item: i },
        });
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (this.continueOnFail()) {
          returnData.push({
            json: { error: errorMessage },
            pairedItem: { item: i },
          });
          continue;
        }
        throw new NodeOperationError(this.getNode(), errorMessage, { itemIndex: i });
      }
    }

    return [returnData];
  }
}
