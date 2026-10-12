import express from "express";

import {
  createCustomerAddress,
  getCustomerAddresses,
  getCustomerAddressById,
  updateCustomerAddress,
  deleteCustomerAddress,
} from "../controllers/customer-address.controller.js";

import { authenticate } from "../middleware/auth.middleware.js";
import { authorizeRoles } from "../middleware/role.middleware.js";

const router = express.Router();

router.use(authenticate, authorizeRoles("CUSTOMER"));

router.post("/", createCustomerAddress);

router.get("/", getCustomerAddresses);

router.get("/:id", getCustomerAddressById);

router.put("/:id", updateCustomerAddress);

router.delete("/:id", deleteCustomerAddress);

export default router;