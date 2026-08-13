import express from "express";

import {
  addToWishlist,
  getWishlist,
  removeFromWishlist,
  checkWishlist,
} from "../controllers/customer-wishlist.controller.js";

import { authenticate } from "../middleware/auth.middleware.js";
import { authorizeRoles } from "../middleware/role.middleware.js";

const router = express.Router();

// Protect all wishlist routes
router.use(authenticate);
router.use(authorizeRoles("CUSTOMER"));

// Add product to wishlist
router.post("/", addToWishlist);

// Get customer's wishlist
router.get("/", getWishlist);

// Check if product is in wishlist
router.get("/:productId", checkWishlist);

// Remove product from wishlist
router.delete("/:productId", removeFromWishlist);

export default router;