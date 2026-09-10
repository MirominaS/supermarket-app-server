import express from "express";

import {
  getInvoices,
  getInvoiceById,
  getMyInvoices,
  getMyInvoiceById,
  downloadInvoicePdf,
  downloadMyInvoicePdf,
} from "../controllers/invoice.controller.js";

import { authenticate } from "../middleware/auth.middleware.js";
import { authorizeRoles } from "../middleware/role.middleware.js";

const router = express.Router();

//admin
router.get("/admin", authenticate, authorizeRoles("ADMIN"), getInvoices);

router.get("/admin/:id", authenticate, authorizeRoles("ADMIN"), getInvoiceById);

router.get(
  "/admin/:id/pdf",
  authenticate,
  authorizeRoles("ADMIN"),
  downloadInvoicePdf,
);

// customer
router.get(
  "/customer",
  authenticate,
  authorizeRoles("CUSTOMER"),
  getMyInvoices,
);

router.get(
  "/customer/:id",
  authenticate,
  authorizeRoles("CUSTOMER"),
  getMyInvoiceById,
);

router.get(
  "/customer/:id/pdf",
  authenticate,
  authorizeRoles("CUSTOMER"),
  downloadMyInvoicePdf,
);

export default router;
