import express from "express";

import {
  createVariant,
  getVariants,
  updateVariant,
  deleteVariant,
} from "../controllers/product-variant.controller.js";

import { authenticate } from "../middleware/auth.middleware.js";
import { authorizeRoles } from "../middleware/role.middleware.js";

const router = express.Router({
  mergeParams: true,
});

// Protect all variant routes
router.use(authenticate);
router.use(authorizeRoles("ADMIN"));

// Get all variants of a product
router.get("/", getVariants);

// Create variant
router.post("/", createVariant);

// Update variant
router.put("/:variantId", updateVariant);

// Delete variant
router.delete("/:variantId", deleteVariant);

export default router;