# Get Symbol Price - v0.1.2

## Summary

Added new operation "Get Symbol Price" to retrieve price information for a specific trading symbol.

## New Feature

### Operation: Get Symbol Price

**Resource:** Market Data
**Operation:** Get Symbol Price

**Parameters:**
- `Symbol` (string): The trading pair symbol (e.g., BTC, ETH, SOL)

**Returns:**
```json
{
  "symbol": "BTC",
  "mark": "87068",
  "mid": "87068.5",
  "oracle": "87092.949826",
  "funding": "0.0000125",
  "next_funding": "0.0000125",
  "open_interest": "239.32629",
  "volume_24h": "349949618.39948",
  "yesterday_price": "87534",
  "timestamp": 1767046313038
}
```

## Field Descriptions

| Field | Description |
|-------|-------------|
| `symbol` | Trading pair symbol |
| `mark` | Current mark price |
| `mid` | Mid price (average of bid/ask) |
| `oracle` | External oracle price |
| `funding` | Current funding rate |
| `next_funding` | Next predicted funding rate |
| `open_interest` | Total open interest in base asset |
| `volume_24h` | 24-hour trading volume |
| `yesterday_price` | Price 24 hours ago |
| `timestamp` | Timestamp in milliseconds |

## Use Cases

1. **Price Monitoring**: Get current price for a specific asset
2. **Funding Rate Analysis**: Check funding rate before opening positions
3. **Volume Analysis**: Monitor trading activity
4. **Price Alerts**: Trigger workflows based on price changes

## Example n8n Workflow

1. Add Pacifica node
2. Select Resource: "Market Data"
3. Select Operation: "Get Symbol Price"
4. Enter Symbol: "ETH"
5. Execute to get ETH price data

## Published

- **npm:** `n8n-nodes-pacifica@0.1.2`
- **GitHub:** https://github.com/maxwellmelo/n8n-nodes-pacifica
