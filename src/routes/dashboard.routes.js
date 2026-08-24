import express from "express";

import {
  getDashboardOverview,
  getRevenueChart,
  getOrderStatistics,
  getPaymentStatistics,
  getTopProducts,
  getCategorySalesStatistics,
  getInventoryStatistics,
  getInventoryMovementStatistics,
} from "../controllers/dashboard.controller.js";

import { authenticate } from "../middleware/auth.middleware.js";
import { authorizeRoles } from "../middleware/role.middleware.js";

const router = express.Router();

// Protect dashboard route
router.use(authenticate);
router.use(authorizeRoles("ADMIN"));

// Get admin dashboard
router.get("/overview", getDashboardOverview);
router.get("/revenue-chart", getRevenueChart);
router.get("/orders", getOrderStatistics);
router.get("/payments", getPaymentStatistics);
router.get("/top-products", getTopProducts);
router.get("/categories", getCategorySalesStatistics);
router.get("/inventory", getInventoryStatistics);
router.get("/inventory-movements", getInventoryMovementStatistics);

export default router;
