import mongoose from "mongoose";
import Offer from "../models/offer.model.js";
import Product from "../models/product.model.js";
import ProductVariant from "../models/product-variant.model.js";
import User from "../models/user.model.js";
import { createNotification } from "./notification.service.js";
import Media from "../models/media.model.js";

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
    throw new Error("Single offer must contain exactly one item.");
  }

  if (type === "COMBO" && items.length < 2) {
    throw new Error("Combo offer must contain at least two items.");
  }

  const itemKeys = [];

  // First validate the structure of every item.
  for (const item of items) {
    if (!item || typeof item !== "object") {
      throw new Error("Each offer item must be an object.");
    }

    if (
      !item.product ||
      !mongoose.Types.ObjectId.isValid(item.product)
    ) {
      throw new Error("A valid product ID is required.");
    }

    if (
      item.variant !== null &&
      !mongoose.Types.ObjectId.isValid(item.variant)
    ) {
      throw new Error("Invalid variant ID.");
    }

    if (
      typeof item.price !== "number" ||
      !Number.isFinite(item.price) ||
      item.price < 0
    ) {
      throw new Error(
        "Offer price must be a finite non-negative number."
      );
    }

    // A product and a variant use different identifiers.
    const key = item.variant
      ? `VARIANT:${item.variant.toString()}`
      : `PRODUCT:${item.product.toString()}`;

    itemKeys.push(key);
  }

  if (new Set(itemKeys).size !== itemKeys.length) {
    throw new Error(
      "The same product or variant cannot be added more than once."
    );
  }

  // Now validate each product and its correct price source.
  for (const item of items) {
    const product = await Product.findOne({
      _id: item.product,
      isActive: true,
    });

    if (!product) {
      throw new Error("Product not found or inactive.");
    }

    let regularPrice;

    if (product.hasVariants) {
      // Variant products must specify a variant.
      if (!item.variant) {
        throw new Error(
          `Select a variant for "${product.name}".`
        );
      }

      const variant = await ProductVariant.findOne({
        _id: item.variant,
        product: product._id,
        isActive: true,
      });

      if (!variant) {
        throw new Error(
          `Variant does not belong to "${product.name}" or is inactive.`
        );
      }

      regularPrice = variant.price;
    } else {
      // Standalone products must not specify a variant.
      if (item.variant) {
        throw new Error(
          `"${product.name}" does not support variants.`
        );
      }

      regularPrice = product.price;
    }

    if (item.price > regularPrice) {
      throw new Error(
        `Offer price cannot exceed the normal price of "${product.name}".`
      );
    }
  }
};


const validateOfferImage = async (imageId) => {
  if (!imageId) {
    throw new Error("Offer image is required.");
  }

  if (!mongoose.Types.ObjectId.isValid(imageId)) {
    throw new Error("Invalid offer image ID.");
  }

  const image = await Media.findOne({
    _id: imageId,
    folder: "offer-images",
    type: "image",
    visibility: "public",
  });

  if (!image) {
    throw new Error("Offer image not found or is not publicly accessible.");
  }

  return image;
};


const getOfferItemKey = (item) => {
  return item.variant
    ? `VARIANT:${item.variant.toString()}`
    : `PRODUCT:${item.product.toString()}`;
};

const checkDuplicateOffer = async ({
  name,
  type,
  startDate,
  endDate,
  items,
  excludeOfferId,
}) => {
  const itemKeys = items.map(getOfferItemKey);

  const filter = {
    name: name.trim(),
    type,
    isActive: true,
    startDate: { $lt: endDate },
    endDate: { $gt: startDate },
  };

  if (excludeOfferId) {
    filter._id = { $ne: excludeOfferId };
  }

  const existingOffers = await Offer.find(filter);

  for (const offer of existingOffers) {
    const existingKeys = offer.items.map(getOfferItemKey);

    const sameItems =
      existingKeys.length === itemKeys.length &&
      existingKeys.every((key) => itemKeys.includes(key));

    if (sameItems) {
      throw new Error(
        "An identical offer already exists for this period."
      );
    }
  }
};


export const createOfferService = async ({
  name,
  description,
  image,
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

  if (!description || !description.trim()) {
    throw new Error("Offer description is required.");
  }

  await validateOfferImage(image);

  // Prevent duplicate offer
  await checkDuplicateOffer({
    name,
    type,
    startDate: start,
    endDate: end,
    items,
  });

  const offer = await Offer.create({
    name: name.trim(),
    type,
    startDate: start,
    endDate: end,
    items,
    description: description.trim(),
    image,
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
        type: "PROMOTION",
        data: {
          offerId: offer._id,
        },
      }),
    ),
  );

  return await Offer.findById(offer._id)
    .populate("image")
    .populate({
      path: "items.product",
      populate: {
        path: "image",
      },
    })
    .populate("items.variant");
};

export const getOffersService = async () => {
  return await Offer.find()
    .populate("image")
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
  })
    .populate("image")
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
  const offer = await Offer.findById(offerId);

  if (!offer) {
    throw new Error("Offer not found.");
  }

  const name = updateData.name ?? offer.name;
  const description = updateData.description ?? offer.description;
  const image = updateData.image ?? offer.image;
  const type = updateData.type ?? offer.type;
  const startDate = updateData.startDate ?? offer.startDate;
  const endDate = updateData.endDate ?? offer.endDate;
  const items = updateData.items ?? offer.items;

  // Validate name
  if (!name || !name.trim()) {
    throw new Error("Offer name is required.");
  }

  if (!description || !description.trim()) {
    throw new Error("Offer description is required.");
  }

  await validateOfferImage(image);

  // Validate type
  if (!["SINGLE", "COMBO"].includes(type)) {
    throw new Error("Offer type must be SINGLE or COMBO.");
  }

  // Validate dates
  const { start, end } = validateOfferDates(startDate, endDate);

  await validateOfferItems(type, items);

  await checkDuplicateOffer({
    name,
    type,
    startDate: start,
    endDate: end,
    items,
    excludeOfferId: offer._id,
  });

  // Update offer
  offer.name = name.trim();
  offer.description = description.trim();
  offer.image = image;
  offer.type = type;
  offer.startDate = start;
  offer.endDate = end;
  offer.items = items;

  // Allow admin to update active status
  if (updateData.isActive !== undefined) {
    if (typeof updateData.isActive !== "boolean") {
      throw new Error("isActive must be true or false.");
    }

    offer.isActive = updateData.isActive;
  }

  await offer.save();

  // Only notify customers when offer is active
  if (offer.isActive) {
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
          type: "PROMOTION",
          data: {
            offerId: offer._id,
          },
        }),
      ),
    );
  }

  return await Offer.findById(offer._id)
    .populate("image")
    .populate({
      path: "items.product",
      populate: {
        path: "image",
      },
    })
    .populate("items.variant");
};

export const deleteOfferService = async (offerId) => {
  const offer = await Offer.findById(offerId);

  if (!offer) {
    throw new Error("Offer not found.");
  }

  await Offer.findByIdAndDelete(offerId);

  return {
    message: "Offer deleted permanently.",
  };
};
