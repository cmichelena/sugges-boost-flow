// Multi-currency pricing configuration
// EUR is the base currency, with equivalent regional pricing

export type Currency = "EUR" | "GBP" | "USD";

export interface CurrencyConfig {
  code: Currency;
  symbol: string;
  name: string;
}

export const CURRENCIES: Record<Currency, CurrencyConfig> = {
  EUR: { code: "EUR", symbol: "€", name: "Euro" },
  GBP: { code: "GBP", symbol: "£", name: "British Pound" },
  USD: { code: "USD", symbol: "$", name: "US Dollar" },
};

// EU member state codes
export const EU_COUNTRIES = [
  "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR",
  "DE", "GR", "HU", "IE", "IT", "LV", "LT", "LU", "MT", "NL",
  "PL", "PT", "RO", "SK", "SI", "ES", "SE"
];

// UK country code
export const UK_COUNTRIES = ["GB", "UK"];

export interface TierPricing {
  EUR: number;
  GBP: number;
  USD: number;
}

export interface PricingTier {
  name: string;
  tier: string;
  priceMonthly: TierPricing;
  priceAnnual: TierPricing;
  popular?: boolean;
  isEnterprise?: boolean;
  features: string[];
  maxMembers: number | null;
  maxSuggestions: number | null;
}

// Equivalent regional pricing (not live FX conversion)
export const PRICING_TIERS: PricingTier[] = [
  {
    name: "Free",
    tier: "free",
    priceMonthly: { EUR: 0, GBP: 0, USD: 0 },
    priceAnnual: { EUR: 0, GBP: 0, USD: 0 },
    features: [
      "25 suggestions per month",
      "Up to 3 team members",
      "Basic insights",
      "Suggistit branding",
    ],
    maxMembers: 3,
    maxSuggestions: 25,
  },
  {
    name: "Starter",
    tier: "starter",
    priceMonthly: { EUR: 39, GBP: 34, USD: 45 },
    priceAnnual: { EUR: 390, GBP: 340, USD: 450 },
    features: [
      "250 suggestions per month",
      "Up to 10 team members",
      "AI-powered improvements",
      "Basic analytics",
      "Email support",
    ],
    maxMembers: 10,
    maxSuggestions: 250,
  },
  {
    name: "Pro",
    tier: "pro",
    priceMonthly: { EUR: 199, GBP: 175, USD: 225 },
    priceAnnual: { EUR: 1990, GBP: 1750, USD: 2250 },
    popular: true,
    features: [
      "1,500 suggestions per month",
      "Up to 25 team members",
      "Advanced analytics",
      "Priority support",
      "Light custom branding",
    ],
    maxMembers: 25,
    maxSuggestions: 1500,
  },
  {
    name: "Business",
    tier: "business",
    priceMonthly: { EUR: 799, GBP: 699, USD: 899 },
    priceAnnual: { EUR: 7990, GBP: 6990, USD: 8990 },
    features: [
      "5,000+ suggestions per month",
      "Up to 100 team members",
      "Full analytics suite",
      "Custom branding",
      "SLA-backed priority support",
      "Admin and governance controls",
    ],
    maxMembers: 100,
    maxSuggestions: 5000,
  },
  {
    name: "Enterprise",
    tier: "enterprise",
    priceMonthly: { EUR: 0, GBP: 0, USD: 0 },
    priceAnnual: { EUR: 0, GBP: 0, USD: 0 },
    isEnterprise: true,
    features: [
      "Unlimited suggestions",
      "Unlimited team members",
      "SSO / enterprise security",
      "Data governance and compliance",
      "Dedicated account management",
    ],
    maxMembers: null,
    maxSuggestions: null,
  },
];

// Get currency based on country code
export const getCurrencyForCountry = (countryCode: string | null): Currency => {
  if (!countryCode) return "EUR"; // Default to EUR
  
  const code = countryCode.toUpperCase();
  
  if (UK_COUNTRIES.includes(code)) {
    return "GBP";
  }
  
  if (EU_COUNTRIES.includes(code)) {
    return "EUR";
  }
  
  // Non-EU/UK defaults to USD
  return "USD";
};

// Format price with currency symbol
export const formatPrice = (
  amount: number,
  currency: Currency,
  showDecimals = false
): string => {
  const { symbol } = CURRENCIES[currency];
  
  if (showDecimals) {
    return `${symbol}${amount.toFixed(2)}`;
  }
  
  return `${symbol}${amount}`;
};

// Calculate annual savings percentage
export const getAnnualSavings = (tier: PricingTier): number | null => {
  if (tier.isEnterprise || tier.priceMonthly.EUR === 0) return null;
  
  const monthlyCost = tier.priceMonthly.EUR * 12;
  const annualCost = tier.priceAnnual.EUR;
  const savings = monthlyCost - annualCost;
  const percentage = Math.round((savings / monthlyCost) * 100);
  
  return percentage > 0 ? percentage : null;
};

// Stripe currency codes for checkout
export const getStripeCurrency = (currency: Currency): string => {
  return currency.toLowerCase();
};
