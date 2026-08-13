import express from "express";

import {
  createPurchase,
  getPurchases,
  getPurchaseById,
  updatePurchase,
  orderPurchase,
  receivePurchase,
  cancelPurchase,
} from "../controllers/purchase.controller.js";

import { authenticate } from "../middleware/auth.middleware.js";
import { authorizeRoles } from "../middleware/role.middleware.js";

const router = express.Router();

// =====================================================
// PROTECT ALL PURCHASE ROUTES
// =====================================================

router.use(authenticate);
router.use(authorizeRoles("ADMIN"));

// =====================================================
// PURCHASE ROUTES
// =====================================================

// Create purchase
router.post("/", createPurchase);

// Get all purchases
router.get("/", getPurchases);

// Get purchase by ID
router.get("/:id", getPurchaseById);

// Update draft purchase
router.put("/:id", updatePurchase);

// Mark purchase as ordered
router.patch("/:id/order", orderPurchase);

// Receive purchase / add stock
router.patch("/:id/receive", receivePurchase);

// Cancel purchase
router.patch("/:id/cancel", cancelPurchase);

export default router;