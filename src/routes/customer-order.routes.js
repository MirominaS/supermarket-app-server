import express from "express";

import {
  createCustomerOrder,
  getCustomerOrders,
  getCustomerOrderById,
  cancelCustomerOrder,
} from "../controllers/customer-order.controller.js";

import { authenticate } from "../middleware/auth.middleware.js";
import { authorizeRoles } from "../middleware/role.middleware.js";

const router = express.Router();

// Protect all routes
router.use(authenticate);
router.use(authorizeRoles("CUSTOMER"));

// Place order
router.post("/", createCustomerOrder);

// My orders
router.get("/", getCustomerOrders);

// Order details
router.get("/:id", getCustomerOrderById);

// Cancel my order
router.patch("/:id/cancel", cancelCustomerOrder);

export default router;