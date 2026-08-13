import express from "express";

import {
  addToCart,
  getCart,
  updateCartItem,
  removeCartItem,
  clearCart,
} from "../controllers/customer-cart.controller.js";

import { authenticate } from "../middleware/auth.middleware.js";
import { authorizeRoles } from "../middleware/role.middleware.js";

const router = express.Router();

// Protect all routes
router.use(authenticate);
router.use(authorizeRoles("CUSTOMER"));

router.post("/", addToCart);

router.get("/", getCart);

router.patch("/:productId", updateCartItem);

router.delete("/:productId", removeCartItem);

router.delete("/", clearCart);

export default router;