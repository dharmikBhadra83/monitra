# Cron Job Setup for Price Monitoring

The price monitoring cron job runs daily at **12:00 AM Indian Standard Time (IST)** to update product prices.

**Important:** The price update runs in-process only. It is **not exposed via API** — no HTTP endpoint exists for it.

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Initialize the Cron Job (EC2 / PM2)

Call the init endpoint once after the app starts:

```bash
curl http://localhost:3000/api/monitor/init-cron
```

Add this to your PM2 ecosystem or startup script so it runs after `npm start`.

## How It Works

1. The cron job runs daily at 12:00 AM IST
2. It fetches all products from the database
3. For each product, it:
   - Extracts the current price from the product URL using HyperAgent
   - Compares it with the stored price
   - Creates a new `PriceLog` entry if the price has changed significantly (>0.01%)
   - Updates the product's `latestPrice` and `priceUSD` fields

4. Price changes are displayed in the Monitor tab, showing:
   - Product Name
   - Old Price
   - New Price
   - Difference Percentage

## Monitoring

View price changes in the **Monitor** tab in the dashboard. The table shows all products with price changes, sorted by price (low to high or high to low).
