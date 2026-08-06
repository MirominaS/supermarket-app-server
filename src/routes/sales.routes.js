import express from "express";

import {
  getSales,
  getSaleById,
  getSalesSummary,
  getRevenue,
  getSoldProducts,
  getCategorySales,
} from "../controllers/sales.controller.js";

import { authenticate } from "../middleware/auth.middleware.js";
import { authorizeRoles } from "../middleware/role.middleware.js";

const router = express.Router();

// Protect all sales routes
router.use(authenticate);
router.use(authorizeRoles("ADMIN"));

// Get all sales
router.get("/", getSales);

// Dashboard sales summary
router.get("/summary", getSalesSummary);

// Revenue report
router.get("/revenue", getRevenue);

// Sold products report
router.get("/products", getSoldProducts);

// Category sales report
router.get("/categories", getCategorySales);

// Get single sale
router.get("/:id", getSaleById);

export default router;
