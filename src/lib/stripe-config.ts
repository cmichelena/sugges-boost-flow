// Stripe product and price configuration
export const STRIPE_TIERS = {
  starter: {
    name: "Starter",
    price_id_monthly: "price_starter_monthly", // TODO: Replace with actual Stripe price ID
    price_id_annual: "price_starter_annual", // TODO: Replace with actual Stripe price ID
    price_monthly: 39,
    price_annual: 390,
  },
  pro: {
    name: "Pro",
    price_id_monthly: "price_1SZPlzJ8FRlNgGgdQgCpGr2R",
    price_id_annual: "price_1SZPmEJ8FRlNgGgd4iN4SWg1",
    price_monthly: 199,
    price_annual: 1990,
  },
  business: {
    name: "Business",
    price_id_monthly: "price_1SZPmPJ8FRlNgGgdt6pQGgnv",
    price_id_annual: "price_1SZPmfJ8FRlNgGgdRaLTw0gb",
    price_monthly: 799,
    price_annual: 7990,
  },
} as const;

export type StripeTier = keyof typeof STRIPE_TIERS;

export const getStripePriceId = (tier: StripeTier, isAnnual: boolean): string => {
  return isAnnual 
    ? STRIPE_TIERS[tier].price_id_annual 
    : STRIPE_TIERS[tier].price_id_monthly;
};
