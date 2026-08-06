import express from "express";

import {
  addToCart,
  getCart,
  updateCartItem,
  removeCartItem,
  clearCart,
} from "../controllers/customer-cart.controller.js";

const router = express.Router();

router.post("/", addToCart);

router.get("/", getCart);

router.patch("/:productId", updateCartItem);

router.delete("/:productId", removeCartItem);

router.delete("/", clearCart);

export default router;