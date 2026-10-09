
import Offer from "../models/offer.model.js";
import { isCustomerOfferAvailable } from "./customer-offer.helper.js";

export const enrichCustomerProductsWithOffers = async (products) => {
  const today = new Date();

  const offers = await Offer.find({
    isActive: true,
    startDate: { $lte: today },
    endDate: { $gte: today },
  })
    .populate({
      path: "image",
      match: {
        folder: "offer-images",
        type: "image",
        visibility: "public",
      },
    })
    .populate({
      path: "items.product",
      match: { isActive: true },
      populate: { path: "image" },
    })
    .populate({
      path: "items.variant",
      match: { isActive: true, stock: { $gt: 0 } },
    });

  const offersByProduct = new Map();
  const offersByVariant = new Map();

  for (const offer of offers) {
    if (!isCustomerOfferAvailable(offer)) continue;

    const regularTotal = offer.items.reduce((sum, item) => {
      const regularPrice = item.product.hasVariants
        ? item.variant.price
        : item.product.price;

      return sum + regularPrice;
    }, 0);

    const offerTotal = offer.items.reduce(
      (sum, item) => sum + item.price,
      0
    );

    const comboItems = offer.items.map((item) => ({
      product: item.product,
      variant: item.variant,
      price: item.price,
      regularPrice: item.product.hasVariants
        ? item.variant.price
        : item.product.price,
    }));

    for (const item of offer.items) {
      const isVariantProduct = item.product.hasVariants;

      const offerInfo = {
        _id: offer._id,
        name: offer.name,
        description: offer.description,
        type: offer.type,
        image: offer.image,
        startDate: offer.startDate,
        endDate: offer.endDate,
        itemOfferPrice: item.price,
      };

      if (offer.type === "COMBO") {
        offerInfo.items = comboItems;
        offerInfo.totalOfferPrice = offerTotal;
        offerInfo.totalRegularPrice = regularTotal;
        offerInfo.savings = regularTotal - offerTotal;
      }

      const targetMap = isVariantProduct
        ? offersByVariant
        : offersByProduct;

      const targetId = isVariantProduct
        ? item.variant._id.toString()
        : item.product._id.toString();

      if (!targetMap.has(targetId)) {
        targetMap.set(targetId, {
          singleOffers: [],
          comboOffers: [],
        });
      }

      const matched = targetMap.get(targetId);

      if (offer.type === "SINGLE") {
        matched.singleOffers.push(offerInfo);
      } else {
        matched.comboOffers.push(offerInfo);
      }
    }
  }

  return products.map((product) => {
    const data =
      typeof product.toObject === "function"
        ? product.toObject()
        : product;

    const variants = (data.variants ?? []).map((variant) => ({
      ...variant,
      offers: offersByVariant.get(variant._id.toString()) ?? {
        singleOffers: [],
        comboOffers: [],
      },
    }));

    return {
      ...data,
      variants,
      offers: offersByProduct.get(data._id.toString()) ?? {
        singleOffers: [],
        comboOffers: [],
      },
    };
  });
};
