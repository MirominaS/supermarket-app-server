import mongoose from "mongoose";
import Offer from "../models/offer.model.js";
import { isCustomerOfferAvailable } from "../utils/customer-offer.helper.js";

const populateCustomerOffer = (query) =>
  query
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

export const getCustomerOffersService = async () => {
  const today = new Date();

  const offers = await populateCustomerOffer(
    Offer.find({
      isActive: true,
      startDate: { $lte: today },
      endDate: { $gte: today },
    }).sort({ createdAt: -1 })
  );

  return offers.filter(isCustomerOfferAvailable);
};

export const getCustomerOfferByIdService = async (offerId) => {
  if (!mongoose.Types.ObjectId.isValid(offerId)) {
    throw new Error("Invalid offer ID.");
  }

  const today = new Date();

  const offer = await populateCustomerOffer(
    Offer.findOne({
      _id: offerId,
      isActive: true,
      startDate: { $lte: today },
      endDate: { $gte: today },
    })
  );

  if (!offer || !isCustomerOfferAvailable(offer)) {
    throw new Error("Offer not found or no longer available.");
  }

  return offer;
};