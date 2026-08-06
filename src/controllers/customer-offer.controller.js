import {
  getCustomerOffersService,
  getCustomerOfferByIdService,
} from "../services/customer-offer.service.js";

// Get all active offers
export const getCustomerOffers = async (req, res) => {
  try {
    const offers = await getCustomerOffersService();

    return res.status(200).json({
      success: true,
      count: offers.length,
      offers,
    });
  } catch (error) {
    console.error("Get customer offers error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch offers.",
    });
  }
};

// Get offer by ID
export const getCustomerOfferById = async (req, res) => {
  try {
    const offer = await getCustomerOfferByIdService(req.params.id);

    return res.status(200).json({
      success: true,
      offer,
    });
  } catch (error) {
    console.error("Get customer offer error:", error);

    return res.status(404).json({
      success: false,
      message: error.message,
    });
  }
};