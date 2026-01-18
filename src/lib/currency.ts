/**
 * Currency conversion utility
 * Converts prices between currencies using approximate exchange rates
 * For production, use a real currency API like exchangerate-api.com or fixer.io
 */

const EXCHANGE_RATES: Record<string, number> = {
  USD: 1,
  EUR: 1.08,
  GBP: 1.27,
  JPY: 0.0067,
  INR: 0.012,
  CAD: 0.74,
  AUD: 0.66,
  CNY: 0.14,
  // Add more currencies as needed
};

/**
 * Rounds a number to 3 decimal places
 */
export function roundTo3Decimals(value: number): number {
  return Math.round(value * 1000) / 1000;
}

/**
 * Converts a price from one currency to USD (rounded to 3 decimal places)
 */
export function convertToUSD(price: number, fromCurrency: string): number {
  const currency = fromCurrency.toUpperCase();
  const rate = EXCHANGE_RATES[currency] || 1;
  return roundTo3Decimals(price * rate);
}

/**
 * Converts a price from USD to another currency (rounded to 3 decimal places)
 */
export function convertFromUSD(priceUSD: number, toCurrency: string): number {
  const currency = toCurrency.toUpperCase();
  const rate = EXCHANGE_RATES[currency] || 1;
  return roundTo3Decimals(priceUSD / rate);
}

/**
 * Converts a price from one currency to another (rounded to 3 decimal places)
 */
export function convertCurrency(price: number, fromCurrency: string, toCurrency: string): number {
  if (fromCurrency.toUpperCase() === toCurrency.toUpperCase()) {
    return roundTo3Decimals(price);
  }
  // Convert to USD first, then to target currency
  const priceUSD = convertToUSD(price, fromCurrency);
  return convertFromUSD(priceUSD, toCurrency);
}

/**
 * Gets the exchange rate for a currency to USD
 */
export function getExchangeRate(currency: string): number {
  return EXCHANGE_RATES[currency.toUpperCase()] || 1;
}

/**
 * Formats a price with currency symbol
 */
export function formatPrice(price: number, currency: string = 'USD'): string {
  const currencySymbols: Record<string, string> = {
    USD: '$',
    EUR: '€',
    GBP: '£',
    JPY: '¥',
    INR: '₹',
    CAD: 'C$',
    AUD: 'A$',
    CNY: '¥',
  };

  const symbol = currencySymbols[currency.toUpperCase()] || '$';
  // Round to 3 decimal places before formatting
  const roundedPrice = roundTo3Decimals(price);
  return `${symbol}${roundedPrice.toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 })}`;
}
