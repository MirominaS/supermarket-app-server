
export const isCustomerOfferAvailable = (offer) => {
  if (!offer?.image) return false;

  if (
    !Array.isArray(offer.items) ||
    (offer.type === "SINGLE" && offer.items.length !== 1) ||
    (offer.type === "COMBO" && offer.items.length < 2)
  ) {
    return false;
  }

  return offer.items.every((item) => {
    const product = item.product;

    if (!product || !product.isActive) {
      return false;
    }

    if (product.hasVariants) {
      return (
        item.variant &&
        item.variant.isActive &&
        item.variant.stock > 0 &&
        item.variant.product.toString() ===
          product._id.toString()
      );
    }

    return (
      !item.variant &&
      product.stock > 0
    );
  });
};
