import express from "express";

import {
  createOffer,
  getOffers,
  getOfferById,
  updateOffer,
  deleteOffer,
} from "../controllers/offer.controller.js";

import { authenticate } from "../middleware/auth.middleware.js";
import { authorizeRoles } from "../middleware/role.middleware.js";

const router = express.Router();

// Create offer
router.post("/", authenticate, authorizeRoles("ADMIN", "MANAGER"), createOffer);

// Get all active offers
router.get("/", authenticate, authorizeRoles("ADMIN", "MANAGER"), getOffers);

// Get offer by ID
router.get("/:id", authenticate, authorizeRoles("ADMIN", "MANAGER"), getOfferById);

// Update offer
router.put("/:id", authenticate, authorizeRoles("ADMIN", "MANAGER"), updateOffer);

// Soft delete offer
router.delete("/:id", authenticate, authorizeRoles("ADMIN", "MANAGER"), deleteOffer);

export default router;
