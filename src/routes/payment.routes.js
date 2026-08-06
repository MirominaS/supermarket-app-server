import express from "express";

import {
  createCheckout,
  paymentSuccess,
  getPayments,
  getPaymentById,
} from "../controllers/payment.controller.js";

import { authenticate } from "../middleware/auth.middleware.js";
import { authorizeRoles } from "../middleware/role.middleware.js";

const router = express.Router();

router.post(
  "/checkout",
  authenticate,
  authorizeRoles("CUSTOMER"),
  createCheckout,
);

router.post(
  "/success",
  authenticate,
  authorizeRoles("CUSTOMER"),
  paymentSuccess,
);

//admin
router.get("/", authenticate, authorizeRoles("ADMIN"), getPayments);

router.get("/:id", authenticate, authorizeRoles("ADMIN"), getPaymentById);

export default router;
