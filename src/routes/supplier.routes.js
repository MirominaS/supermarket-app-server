import express from "express";

import {
  createSupplier,
  getSuppliers,
  getSupplierById,
  updateSupplier,
  deleteSupplier,
} from "../controllers/supplier.controller.js";

import { authenticate } from "../middleware/auth.middleware.js";
import { authorizeRoles } from "../middleware/role.middleware.js";

const router = express.Router();

// All supplier routes are admin only

router.use(authenticate);
router.use(authorizeRoles("ADMIN"));

router.post("/", createSupplier);

router.get("/", getSuppliers);

router.get("/:id", getSupplierById);

router.patch("/:id", updateSupplier);

router.delete("/:id", deleteSupplier);

export default router;