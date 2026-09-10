import express from "express";

import {
  savePaymentSettings,
  getPaymentSettings,
} from "../controllers/payment-settings.controller.js";

import { authenticate } from "../middleware/auth.middleware.js";
import { authorizeRoles } from "../middleware/role.middleware.js";

const router = express.Router();

router.get("/", authenticate, authorizeRoles("ADMIN"), getPaymentSettings);

router.put("/", authenticate, authorizeRoles("ADMIN"), savePaymentSettings);

export default router;
