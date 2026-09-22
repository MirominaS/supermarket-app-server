import {
  createOfferService,
  getOffersService,
  getOfferByIdService,
  updateOfferService,
  deleteOfferService,
} from "../services/offer.service.js";

export const createOffer = async (req, res) => {
  try {
    const {
       name,
      description,
      image,
      type,
      startDate,
      endDate,
      items,
    } = req.body;

    if (!name || !description || !image || !type || !startDate || !endDate || !items) {
      return res.status(400).json({
        success: false,
        message:
          "Name, description, image, type, start date, end date and items are required.",
      });
    }

    const offer = await createOfferService({
      name,
      description,
      image,
      type,
      startDate,
      endDate,
      items,
    });

    return res.status(201).json({
      success: true,
      message: "Offer created successfully.",
      offer,
    });
  } catch (error) {
    console.error("Create offer error:", error);

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const getOffers = async (req, res) => {
  try {
    const offers = await getOffersService();

    return res.status(200).json({
      success: true,
      count: offers.length,
      offers,
    });
  } catch (error) {
    console.error("Get offers error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch offers.",
    });
  }
};

export const getOfferById = async (req, res) => {
  try {
    const offer = await getOfferByIdService(
      req.params.id
    );

    return res.status(200).json({
      success: true,
      offer,
    });
  } catch (error) {
    console.error("Get offer error:", error);

    return res.status(404).json({
      success: false,
      message: error.message,
    });
  }
};

export const updateOffer = async (req, res) => {
  try {
    const offer = await updateOfferService(
      req.params.id,
      req.body
    );

    return res.status(200).json({
      success: true,
      message: "Offer updated successfully.",
      offer,
    });
  } catch (error) {
    console.error("Update offer error:", error);

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const deleteOffer = async (req, res) => {
  try {
    await deleteOfferService(req.params.id);

    return res.status(200).json({
      success: true,
      message: "Offer deleted successfully.",
    });
  } catch (error) {
    console.error("Delete offer error:", error);

    return res.status(404).json({
      success: false,
      message: error.message,
    });
  }
};
