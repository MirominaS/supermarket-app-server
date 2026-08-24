import express from "express";

import {
  getOrders,
  getOrderById,
  updateOrderStatus,
  cancelOrder,
  exportOrders,
} from "../controllers/order.controller.js";

import { authenticate } from "../middleware/auth.middleware.js";
import { authorizeRoles } from "../middleware/role.middleware.js";

const router = express.Router();

router.get("/export", authenticate, authorizeRoles("ADMIN"), exportOrders);

router.get("/", authenticate, authorizeRoles("ADMIN"), getOrders);

router.get("/:id", authenticate, authorizeRoles("ADMIN"), getOrderById);

router.patch(
  "/:id/status",
  authenticate,
  authorizeRoles("ADMIN"),
  updateOrderStatus,
);

router.patch("/:id/cancel", authenticate, authorizeRoles("ADMIN"), cancelOrder);

export default router;
