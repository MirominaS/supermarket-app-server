import express from "express";

import {
  getOrders,
  getOrderById,
  updateOrderStatus,
  cancelOrder,
  deleteOrder,
  exportOrders,
} from "../controllers/order.controller.js";

import { authenticate } from "../middleware/auth.middleware.js";
import { authorizeRoles } from "../middleware/role.middleware.js";

const router = express.Router();

router.get(
  "/export",
  authenticate,
  authorizeRoles("ADMIN", "MANAGER"),
  exportOrders,
);

router.get("/", authenticate, authorizeRoles("ADMIN", "MANAGER"), getOrders);

router.get(
  "/:id",
  authenticate,
  authorizeRoles("ADMIN", "MANAGER"),
  getOrderById,
);

router.patch(
  "/:id/status",
  authenticate,
  authorizeRoles("ADMIN", "MANAGER"),
  updateOrderStatus,
);

router.patch(
  "/:id/cancel",
  authenticate,
  authorizeRoles("ADMIN", "MANAGER"),
  cancelOrder,
);

router.delete("/:id", authenticate, authorizeRoles("ADMIN"), deleteOrder);

export default router;
