// frontend/src/utils/currency.js

// Fallback list used only if Intl.supportedValuesOf('currency') is unsupported
// (e.g. older Safari / older mobile browsers). Covers major currencies across
// regions RoscaApp users are likely to be in.
const FALLBACK_CODES = [
  'USD', 'EUR', 'GBP', 'NGN', 'GHS', 'KES', 'ZAR', 'INR', 'BRL', 'JPY',
  'CAD', 'AUD', 'SGD', 'MYR', 'PHP', 'IDR', 'THB', 'CNY', 'AED', 'SAR'
];

function getCurrencyName(code) {
  try {
    return new Intl.DisplayNames(['en'], { type: 'currency' }).of(code);
  } catch {
    return code;
  }
}

// Array of { code, label } for every supported currency, or the fallback list.
export const ALL_CURRENCIES = (() => {
  try {
    return Intl.supportedValuesOf('currency').map(code => ({
      code,
      label: `${code} - ${getCurrencyName(code)}`
    }));
  } catch {
    return FALLBACK_CODES.map(code => ({
      code,
      label: `${code} - ${getCurrencyName(code)}`
    }));
  }
})();

// Just the currency codes, e.g. for places that only need a <select> of codes.
export const CURRENCY_CODES = ALL_CURRENCIES.map(c => c.code);

export function getCurrencyLabel(code) {
  const match = ALL_CURRENCIES.find(c => c.code === code);
  return match ? match.label : code;
}

export function formatCurrency(amount, currencyCode = 'USD') {
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: currencyCode }).format(amount);
  } catch {
    return `${currencyCode} ${Number(amount).toFixed(2)}`;
  }
}