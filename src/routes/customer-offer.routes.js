import express from "express";

import {
  getCustomerOffers,
  getCustomerOfferById,
} from "../controllers/customer-offer.controller.js";

const router = express.Router();

// Public routes
router.get("/", getCustomerOffers);

router.get("/:id", getCustomerOfferById);

export default router;