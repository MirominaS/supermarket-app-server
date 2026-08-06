import Offer from "../models/offer.model.js";
import Product from "../models/product.model.js";
import ProductVariant from "../models/product-variant.model.js";
import User from "../models/user.model.js";
import { createNotification } from "./notification.service.js";

const validateOfferDates = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    throw new Error("Invalid start date or end date.");
  }

  if (start >= end) {
    throw new Error("Start date must be before end date.");
  }

  return {
    start,
    end,
  };
};

const validateOfferItems = async (type, items) => {
  if (!Array.isArray(items)) {
    throw new Error("Offer items must be an array.");
  }

  if (type === "SINGLE" && items.length !== 1) {
    throw new Error("Single offer must contain exactly one variant.");
  }

  if (type === "COMBO" && items.length < 2) {
    throw new Error("Combo offer must contain at least two variants.");
  }

  // Prevent duplicate variants
  const variantIds = items.map((item) => item.variant.toString());

  const uniqueVariantIds = new Set(variantIds);

  if (variantIds.length !== uniqueVariantIds.size) {
    throw new Error("The same variant cannot be added more than once.");
  }

  for (const item of items) {
    if (!item.product) {
      throw new Error("Product is required.");
    }

    if (!item.variant) {
      throw new Error("Variant is required.");
    }

    if (item.price === undefined || item.price === null) {
      throw new Error("Offer price is required.");
    }

    if (typeof item.price !== "number" || item.price < 0) {
      throw new Error("Offer price must be greater than or equal to 0.");
    }

    const product = await Product.findById(item.product);

    if (!product || !product.isActive) {
      throw new Error("Product not found.");
    }

    const variant = await ProductVariant.findOne({
      _id: item.variant,
      product: product._id,
      isActive: true,
    });

    if (!variant) {
      throw new Error(
        `Variant does not belong to product "${product.name}".`,
      );
    }

    if (item.price > variant.price) {
      throw new Error(
        `Offer price cannot exceed normal price of ${variant.name}.`,
      );
    }
  }
};

export const createOfferService = async ({
  name,
  type,
  startDate,
  endDate,
  items,
}) => {
  if (!name) {
    throw new Error("Offer name is required.");
  }

  if (!["SINGLE", "COMBO"].includes(type)) {
    throw new Error("Offer type must be SINGLE or COMBO.");
  }

  const { start, end } = validateOfferDates(startDate, endDate);

  await validateOfferItems(type, items);

  const offer = await Offer.create({
    name,
    type,
    startDate: start,
    endDate: end,
    items,
    isActive: true,
  });

  const customers = await User.find({
    role: "CUSTOMER",
    isActive: true,
  }).select("_id");

  await Promise.all(
    customers.map((customer) =>
      createNotification({
        recipient: customer._id,
        title: "New Offer Available",
        message: `${offer.name} is now available. Check it out before it expires!`,
        type: "OFFER",
        data: {
          offerId: offer._id,
        },
      }),
    ),
  );

  return await Offer.findById(offer._id)
    .populate({
      path: "items.product",
      populate: {
        path: "image",
      },
    })
    .populate("items.variant");
};

export const getOffersService = async () => {
  return await Offer.find({
    isActive: true,
  })
    .populate({
      path: "items.product",
      populate: {
        path: "image",
      },
    })
    .populate("items.variant")
    .sort({
      createdAt: -1,
    });
};

export const getOfferByIdService = async (offerId) => {
  const offer = await Offer.findOne({
    _id: offerId,
    isActive: true,
  })
    .populate({
      path: "items.product",
      populate: {
        path: "image",
      },
    })
    .populate("items.variant");

  if (!offer) {
    throw new Error("Offer not found.");
  }

  return offer;
};

export const updateOfferService = async (offerId, updateData) => {
  const offer = await Offer.findOne({
    _id: offerId,
    isActive: true,
  });

  if (!offer) {
    throw new Error("Offer not found.");
  }

  const name = updateData.name ?? offer.name;

  const type = updateData.type ?? offer.type;

  const startDate = updateData.startDate ?? offer.startDate;

  const endDate = updateData.endDate ?? offer.endDate;

  const items = updateData.items ?? offer.items;

  if (!name) {
    throw new Error("Offer name is required.");
  }

  if (!["SINGLE", "COMBO"].includes(type)) {
    throw new Error("Offer type must be SINGLE or COMBO.");
  }

  const { start, end } = validateOfferDates(startDate, endDate);

  await validateOfferItems(type, items);

  offer.name = name;
  offer.type = type;
  offer.startDate = start;
  offer.endDate = end;
  offer.items = items;

  await offer.save();

  const customers = await User.find({
    role: "CUSTOMER",
    isActive: true,
  }).select("_id");

  await Promise.all(
    customers.map((customer) =>
      createNotification({
        recipient: customer._id,
        title: "Offer Updated",
        message: `${offer.name} has been updated.`,
        type: "OFFER",
        data: {
          offerId: offer._id,
        },
      }),
    ),
  );

  return await Offer.findById(offer._id)
    .populate({
      path: "items.product",
      populate: {
        path: "image",
      },
    })
    .populate("items.variant");
};

export const deleteOfferService = async (offerId) => {
  const offer = await Offer.findOne({
    _id: offerId,
    isActive: true,
  });

  if (!offer) {
    throw new Error("Offer not found.");
  }

  offer.isActive = false;

  await offer.save();

  return offer;
};