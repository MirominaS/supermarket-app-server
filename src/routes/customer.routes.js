import express from "express";

import {
  getCustomers,
  getCustomerById,
  getCustomerOrders,
  getCustomerSales,
  getCustomerSummary,
  updateCustomerStatus,
  getCustomerClosureReasons,
} from "../controllers/customer.controller.js";

import { authenticate } from "../middleware/auth.middleware.js";
import { authorizeRoles } from "../middleware/role.middleware.js";

const router = express.Router();

// Protect all customer routes
router.use(authenticate);
router.use(authorizeRoles("ADMIN"));

// Get all customers
router.get("/", getCustomers);

// Get customer orders
router.get("/:id/orders", getCustomerOrders);

// Get customer sales
router.get("/:id/sales", getCustomerSales);

// Get customer summary
router.get("/:id/summary", getCustomerSummary);

// Activate / deactivate customer
router.patch("/:id/status", updateCustomerStatus);

// Get customer account closure reasons and counts
router.get("/closure-reasons", getCustomerClosureReasons);

// Get customer by ID
router.get("/:id", getCustomerById);

export default router;
