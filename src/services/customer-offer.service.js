import mongoose from "mongoose";
import Offer from "../models/offer.model.js";

export const getCustomerOffersService = async () => {
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
      match: {
        isActive: true,
      },
      populate: {
        path: "image",
      },
    })
    .populate({
      path: "items.variant",
      match: {
        isActive: true,
        stock: { $gt: 0 },
      },
    })
    .sort({
      createdAt: -1,
    });

  return offers;
};

export const getCustomerOfferByIdService = async (offerId) => {
  if (!mongoose.Types.ObjectId.isValid(offerId)) {
    throw new Error("Invalid offer ID.");
  }

  const today = new Date();

  const offer = await Offer.findOne({
    _id: offerId,
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
      match: {
        isActive: true,
      },
      populate: {
        path: "image",
      },
    })
    .populate({
      path: "items.variant",
      match: {
        isActive: true,
        stock: { $gt: 0 },
      },
    });

  if (!offer) {
    throw new Error("Offer not found.");
  }

  return offer;
};