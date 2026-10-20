import express from "express";

import {
  updateStock,
  getLowStock,
  getStockHistory,
    getInventorySummary,
} from "../controllers/inventory.controller.js";

import { authenticate } from "../middleware/auth.middleware.js";
import { authorizeRoles } from "../middleware/role.middleware.js";

const router = express.Router();

router.use(authenticate);
router.use(authorizeRoles("ADMIN", "MANAGER"));

router.post("/adjust", updateStock);

router.get("/summary", getInventorySummary);

router.get("/low-stock", getLowStock);

router.get("/history", getStockHistory);

export default router;