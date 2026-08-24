export const productCacheKeys = {
  all: "products:all",

  byId: (productId) => `product:${productId}`,

  variants: (productId) => `product:${productId}:variants`,

  variant: (productId, variantId) =>
    `product:${productId}:variant:${variantId}`,
};