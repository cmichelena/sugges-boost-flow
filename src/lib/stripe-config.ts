// Stripe product and price configuration
export const STRIPE_TIERS = {
  pro: {
    name: "Pro",
    product_id_monthly: "prod_TWShnbkSp6u7NV",
    product_id_annual: "prod_TWShGPBneGYnuI",
    price_id_monthly: "price_1SZPlzJ8FRlNgGgdQgCpGr2R",
    price_id_annual: "price_1SZPmEJ8FRlNgGgd4iN4SWg1",
    price_monthly: 69,
    price_annual: 650,
  },
  business: {
    name: "Business",
    product_id_monthly: "prod_TWShJ0ntRLzNBq",
    product_id_annual: "prod_TWSiZ1iW1RWwfj",
    price_id_monthly: "price_1SZPmPJ8FRlNgGgdt6pQGgnv",
    price_id_annual: "price_1SZPmfJ8FRlNgGgdRaLTw0gb",
    price_monthly: 199,
    price_annual: 1990,
  },
} as const;

export type StripeTier = keyof typeof STRIPE_TIERS;

export const getStripePriceId = (tier: StripeTier, isAnnual: boolean): string => {
  return isAnnual 
    ? STRIPE_TIERS[tier].price_id_annual 
    : STRIPE_TIERS[tier].price_id_monthly;
};
